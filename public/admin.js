let editingId = null;

const form = document.getElementById("postForm");

const titleInput =
    document.getElementById("title");

const contentInput =
    document.getElementById("content");

const imageInput =
    document.getElementById("image");

const container =
    document.getElementById("postsContainer");

const message =
    document.getElementById("postMessage");

const cancelEdit =
    document.getElementById("cancelEdit");


// =========================
// Check Admin
// =========================

async function checkAdmin() {

    const response = await fetch("/api/me");

    if (!response.ok) {
        window.location.href = "/login.html";
        return;
    }

    const data = await response.json();

    if (data.user.role !== "admin") {
        window.location.href = "/user.html";
        return;
    }

    document.getElementById("adminName").textContent =
        data.user.username;
}


// =========================
// Load Posts
// =========================

async function loadPosts() {

    const response =
        await fetch("/api/posts");

    if (!response.ok) {
        return;
    }

    const posts =
        await response.json();

    document.getElementById("postCount").textContent =
        `${posts.length} posts`;

    container.innerHTML = "";

    if (posts.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No posts yet</h3>
                <p>Create your first post above.</p>
            </div>
        `;

        return;
    }

    posts.forEach(post => {

        const card =
            document.createElement("article");

        card.className = "post-card";

        card.innerHTML = `

            ${
                post.image
                ? `<img
                    src="${post.image}"
                    class="post-image"
                    alt="Post image"
                  >`
                : ""
            }

            <div class="post-body">

                <h3>
                    ${escapeHtml(post.title)}
                </h3>

                <p class="post-date">
                    ${formatDate(post.created_at)}
                </p>

                <p class="post-content">
                    ${escapeHtml(post.content)}
                </p>

                <div class="card-actions">

                    <button
                        class="edit-btn"
                        onclick="editPost(${post.id})"
                    >
                        Edit
                    </button>

                    <button
                        class="delete-btn"
                        onclick="deletePost(${post.id})"
                    >
                        Delete
                    </button>

                </div>

            </div>
        `;

        container.appendChild(card);

    });
}


// =========================
// Create / Update
// =========================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    message.textContent = "";

    const formData =
        new FormData();

    formData.append(
        "title",
        titleInput.value
    );

    formData.append(
        "content",
        contentInput.value
    );

    if (imageInput.files[0]) {

        formData.append(
            "image",
            imageInput.files[0]
        );

    }

    let url = "/api/posts";
    let method = "POST";

    if (editingId) {

        url = `/api/posts/${editingId}`;
        method = "PUT";

    }

    const response =
        await fetch(url, {
            method,
            body: formData
        });

    const data =
        await response.json();

    if (!response.ok) {

        message.textContent =
            data.error || "Something went wrong.";

        return;
    }

    message.textContent =
        editingId
            ? "Post updated successfully!"
            : "Post published successfully!";

    resetForm();

    loadPosts();

});


// =========================
// Edit
// =========================

async function editPost(id) {

    const response =
        await fetch("/api/posts");

    const posts =
        await response.json();

    const post =
        posts.find(p => p.id === id);

    if (!post) return;

    editingId = id;

    titleInput.value =
        post.title;

    contentInput.value =
        post.content;

    document.getElementById(
        "formTitle"
    ).textContent = "Edit Post";

    document.querySelector(
        ".primary-btn"
    ).textContent = "Update Post";

    cancelEdit.style.display =
        "inline-block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =========================
// Cancel Edit
// =========================

cancelEdit.addEventListener(
    "click",
    resetForm
);

function resetForm() {

    editingId = null;

    form.reset();

    document.getElementById(
        "formTitle"
    ).textContent = "Create New Post";

    document.querySelector(
        ".primary-btn"
    ).textContent = "Publish Post";

    cancelEdit.style.display =
        "none";
}


// =========================
// Delete
// =========================

async function deletePost(id) {

    const confirmed =
        confirm("Delete this post?");

    if (!confirmed) return;

    const response =
        await fetch(
            `/api/posts/${id}`,
            {
                method: "DELETE"
            }
        );

    if (response.ok) {
        loadPosts();
    }
}


// =========================
// Logout
// =========================

async function logout() {

    await fetch(
        "/api/logout",
        {
            method: "POST"
        }
    );

    window.location.href =
        "/login.html";
}


// =========================
// Helpers
// =========================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}

function formatDate(date) {

    return new Date(date)
        .toLocaleDateString(
            "en-US",
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
}


// =========================

checkAdmin();
loadPosts();