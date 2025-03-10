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
});

    
    

    // Handle logout
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.removeItem("jwtToken");
            window.location.href = "index.html"; // Redirect to login page
        });
    }
