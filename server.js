const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// =========================
// Database
// =========================

const db = new Database("database.sqlite");

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// =========================
// Create default accounts
// =========================

const adminPassword = bcrypt.hashSync("Ahmed123", 10);
const userPassword = bcrypt.hashSync("User123", 10);

const adminExists = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get("Ahmed");

if (!adminExists) {
    db.prepare(`
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
    `).run("Ahmed", adminPassword, "admin");
}

const userExists = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get("user");

if (!userExists) {
    db.prepare(`
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
    `).run("user", userPassword, "user");
}

// =========================
// Middleware
// =========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "modern-dark-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax"
        }
    })
);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}
if (!fs.existsSync(path.join(__dirname, "uploads"))) {
    fs.mkdirSync(path.join(__dirname, "uploads"));
}

if (!fs.existsSync(path.join(__dirname, "uploads"))) {
    fs.mkdirSync(path.join(__dirname, "uploads"));
}

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);
// =========================
// Multer Upload
// =========================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, "uploads"));
    },

    filename: function (req, file, cb) {

        const ext = path.extname(file.originalname);

        const filename =
            Date.now() +
            "-" +
            Math.random().toString(36).substring(2, 10) +
            ext;

        cb(null, filename);
    }

});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: function (req, file, cb) {

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
        ];

        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }
    }
});

// =========================
// Authentication
// =========================

function requireLogin(req, res, next) {

    if (!req.session.user) {
        return res.status(401).json({
            error: "Not authenticated"
        });
    }

    next();
}

function requireAdmin(req, res, next) {

    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({
            error: "Admin access required"
        });
    }

    next();
}

// =========================
// Login
// =========================

app.post("/api/login", (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            error: "Username and password are required."
        });
    }

    const user = db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get(username);

    if (!user) {
        return res.status(401).json({
            error: "Invalid username or password."
        });
    }

    const validPassword = bcrypt.compareSync(
        password,
        user.password
    );

    if (!validPassword) {
        return res.status(401).json({
            error: "Invalid username or password."
        });
    }

    req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
    };

    res.json({
        success: true,
        role: user.role
    });
});

// =========================
// Current User
// =========================

app.get("/api/me", requireLogin, (req, res) => {

    res.json({
        user: req.session.user
    });
});

// =========================
// Logout
// =========================

app.post("/api/logout", (req, res) => {

    req.session.destroy(() => {

        res.json({
            success: true
        });

    });
});

// =========================
// Get Posts
// =========================

app.get("/api/posts", requireLogin, (req, res) => {

    const posts = db
        .prepare(`
            SELECT *
            FROM posts
            ORDER BY datetime(created_at) DESC
        `)
        .all();

    res.json(posts);
});

// =========================
// Create Post
// =========================

app.post(
    "/api/posts",
    requireAdmin,
    upload.single("image"),
    (req, res) => {

        const { title, content } = req.body;

        if (!title || !content) {

            if (req.file) {
                fs.unlinkSync(req.file.path);
            }

            return res.status(400).json({
                error: "Title and content are required."
            });
        }

        const image = req.file
            ? "/uploads/" + req.file.filename
            : null;

        const result = db
            .prepare(`
                INSERT INTO posts (title, content, image)
                VALUES (?, ?, ?)
            `)
            .run(title, content, image);

        res.json({
            success: true,
            id: result.lastInsertRowid
        });
    }
);

// =========================
// Update Post
// =========================

app.put(
    "/api/posts/:id",
    requireAdmin,
    upload.single("image"),
    (req, res) => {

        const id = req.params.id;

        const oldPost = db
            .prepare("SELECT * FROM posts WHERE id = ?")
            .get(id);

        if (!oldPost) {
            return res.status(404).json({
                error: "Post not found."
            });
        }

        const title = req.body.title;
        const content = req.body.content;

        let image = oldPost.image;

        if (req.file) {

            image = "/uploads/" + req.file.filename;

            if (oldPost.image) {

                const oldPath = path.join(
                    __dirname,
                    oldPost.image
                );

                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
        }

        db.prepare(`
            UPDATE posts
            SET title = ?, content = ?, image = ?
            WHERE id = ?
        `).run(
            title,
            content,
            image,
            id
        );

        res.json({
            success: true
        });
    }
);

// =========================
// Delete Post
// =========================

app.delete(
    "/api/posts/:id",
    requireAdmin,
    (req, res) => {

        const id = req.params.id;

        const post = db
            .prepare("SELECT * FROM posts WHERE id = ?")
            .get(id);

        if (!post) {
            return res.status(404).json({
                error: "Post not found."
            });
        }

        if (post.image) {

            const imagePath = path.join(
                __dirname,
                post.image
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        db.prepare(
            "DELETE FROM posts WHERE id = ?"
        ).run(id);

        res.json({
            success: true
        });
    }
);

// =========================
// Start Server
// =========================

app.listen(PORT, () => {

    console.log("");
    console.log("================================");
    console.log("   MODERN DARK POSTS PLATFORM");
    console.log("================================");
    console.log("");
    console.log(`Server running at: http://localhost:${PORT}`);
    console.log("");
    console.log("Admin:");
    console.log("Username: Ahmed");
    console.log("Password: Ahmed123");
    console.log("");
    console.log("User:");
    console.log("Username: user");
    console.log("Password: User123");
    console.log("");
});