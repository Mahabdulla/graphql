document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("errorMessage");
    const logoutBtn = document.getElementById("logoutBtn");

    // Hide logout button if user is not logged in
    if (!localStorage.getItem("jwtToken")) {
        if (logoutBtn) logoutBtn.style.display = "none";
    }

    // Redirect if already logged in
    if (localStorage.getItem("jwtToken")) {
        window.location.href = "main.html";
    }

    // Handle login form submission
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        // Prevent empty form submission
        if (!email.trim() || !password.trim()) {
            errorMessage.textContent = "Please enter both email and password.";
            return;
        }

        try {
            const response = await fetch("https://learn.reboot01.com/api/auth/signin", {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + btoa(email + ":" + password),
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (response.ok && data.jwt) {
                localStorage.setItem("jwtToken", data.jwt);
                window.location.href = "main.html"; // Redirect after login
            } else {
                errorMessage.textContent = "Invalid credentials or missing JWT. Please try again.";
            }
        } catch (error) {
            errorMessage.textContent = "Network error. Please check your connection and try again.";
        }
    });

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("jwtToken");
            window.location.href = "index.html"; // Redirect to login page
        });
    }
});
