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
    
        const loginValue = document.getElementById("email").value.trim(); // Username or Email
        const password = document.getElementById("password").value.trim();
        
        if (!email.trim() || !password.trim()) {
            errorMessage.textContent = "Please enter both email and password.";
            return;
        }
        try {
            const response = await fetch("https://learn.reboot01.com/api/auth/signin", {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + btoa(loginValue + ":" + password),
                    "Content-Type": "application/json",
                },
            });
    
            const token = await response.text(); // The API directly returns the token as text
    
            console.log("API Response (JWT Token):", token);
    
            if (response.ok && token) {
                localStorage.setItem("jwtToken", token); // Store JWT correctly
                window.location.href = "main.html"; // Redirect to profile page
            } else {
                errorMessage.textContent = "Invalid credentials. Please try again.";
                console.error("Login failed:", token);
            }
        } catch (error) {
            errorMessage.textContent = "Network error. Please try again.";
            console.error("Error:", error);
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
