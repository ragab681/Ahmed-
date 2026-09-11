async function checkUser() {

    const response =
        await fetch("/api/me");

    if (!response.ok) {

        window.location.href =
            "/login.html";

        return;
    }

    const data =
        await response.json();

    document.getElementById(
        "username"
    ).textContent =
        data.user.username;
}


async function loadPosts() {

    const response =
        await fetch("/api/posts");

    if (!response.ok) return;

    const posts =
        await response.json();

    const container =
        document.getElementById(
            "postsContainer"
        );

    container.innerHTML = "";

    if (posts.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                <h2>No posts yet</h2>
                <p>Check back later.</p>
            </div>
        `;

        return;
    }

    posts.forEach(post => {

        const card =
            document.createElement("article");

        card.className =
            "post-card user-post";

        card.innerHTML = `

            ${
                post.image
                ? `
                    <img
                        src="${post.image}"
                        class="post-image"
                        alt="Post image"
                    >
                `
                : ""
            }

            <div class="post-body">

                <h2>
                    ${escapeHtml(post.title)}
                </h2>

                <p class="post-date">
                    ${formatDate(post.created_at)}
                </p>

                <p class="post-content">
                    ${escapeHtml(post.content)}
                </p>

            </div>
        `;

        container.appendChild(card);

    });
}


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


checkUser();
loadPosts();