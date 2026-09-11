const form = document.getElementById("loginForm");
const error = document.getElementById("loginError");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    error.textContent = "";

    const username =
        document.getElementById("username").value.trim();

    const password =
        document.getElementById("password").value;

    try {

        const response = await fetch("/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                password
            })

        });

        const data = await response.json();

        if (!response.ok) {
            error.textContent = data.error;
            return;
        }

        if (data.role === "admin") {
            window.location.href = "/admin.html";
        } else {
            window.location.href = "/user.html";
        }

    } catch (err) {

        error.textContent =
            "Unable to connect to server.";

    }

});