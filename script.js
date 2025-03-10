document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("errorMessage");
    const logoutBtn = document.getElementById("logoutBtn");

    // Hide logout button if user is not logged in
    if (!localStorage.getItem("jwtToken")) {
        if (logoutBtn) logoutBtn.style.display = "none";
    }

    // Check if user is already logged in
    if (localStorage.getItem("jwtToken")) {
        console.log("User already logged in. Redirecting to main page...");
        window.location.href = "main.html";
    }

    // Handle login form submission
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        
        const loginValue = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            console.log("Attempting login...");
            
            const response = await fetch("https://learn.reboot01.com/api/auth/signin", {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + btoa(loginValue + ":" + password),
                    "Content-Type": "application/json",
                },
            });

            const token = await response.text(); // Read response as text
            console.log("API Response (JWT Token):", token);
            
            if (response.ok && token && token.length > 50) {
                localStorage.setItem("jwtToken", token);
                console.log("JWT successfully stored in localStorage");
                window.location.href = "main.html"; // Redirect after login
            } else {
                console.error("Login failed: No valid token received");
                errorMessage.textContent = "Invalid credentials. Please try again.";
            }
        } catch (error) {
            console.error("Error during login request:", error);
            errorMessage.textContent = "Network error. Please try again.";
        }
    });

    // Ensure correct JWT usage for GraphQL requests
    const token = localStorage.getItem("jwtToken");

    if (!token) {
        console.error("❌ No JWT found! Redirecting to login...");
        window.location.href = "index.html"; // Force re-login if token is missing
    }

    console.log("🔍 Sending JWT:", `"Bearer ${token.trim()}"`);

    fetch("https://learn.reboot01.com/api/graphql-engine/v1/graphql", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token.trim()}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query: "query { user { id, login, email } }"
        })
    })
    .then(response => response.json())
    .then(json => {
        console.log("🔍 GraphQL Response:", json);
        if (json.errors) {
            json.errors.forEach(error => console.error("❌ GraphQL Error:", error.message));
        }
    })
    .catch(error => console.error("Error fetching GraphQL data:", error));

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("jwtToken");
            window.location.href = "index.html"; // Redirect to login page
        });
    }
});
