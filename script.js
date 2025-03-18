document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("errorMessage");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginContainer = document.getElementById("loginContainer");
    const profileContainer = document.getElementById("profileContainer");

    // Check if user is already logged in
    const token = localStorage.getItem("jwtToken");
    if (token) {
        showProfile(); // If logged in, show profile
    }

    // Handle login form submission
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        
        const loginValue = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
    
        try {
            const response = await fetch("https://learn.reboot01.com/api/auth/signin", {
                method: "POST",
                headers: {
                    "Authorization": "Basic " + btoa(loginValue + ":" + password),
                    "Content-Type": "application/json",
                },
            });
    
            const token = await response.text();
            
            if (response.ok && token.includes(".")) {
                localStorage.setItem("jwtToken", token.trim());
                showProfile(); // Redirect to profile page
            } else {
                errorMessage.textContent = "Invalid credentials. Please try again.";
            }
        } catch (error) {
            console.error("Login request error:", error);
            errorMessage.textContent = "Network error. Please try again.";
        }
    });

    // Function to show the profile and fetch user data
    async function showProfile() {
        loginContainer.style.display = "none"; // Hide login form
        profileContainer.style.display = "block"; // Show profile
        logoutBtn.style.display = "block"; // Show logout button
        
        const token = localStorage.getItem("jwtToken");
        if (!token) {
            console.error("No JWT found! Redirecting to login...");
            return;
        }

        // Fetch user data and update profile UI
        fetchUserProfile(token);
    }

    // Function to fetch user profile data
    async function fetchUserProfile(token) {
        const query = `
            query {
                user {
                    id
                    login
                    totalUp
                    auditRatio
                    progresses {
                        grade
                        object {
                            name
                        }
                    }
                }
            }
        `;

        try {
            const response = await fetch("https://learn.reboot01.com/api/graphql-engine/v1/graphql", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query }),
            });

            const data = await response.json();
            if (data.errors) {
                console.error("GraphQL Error:", data.errors);
                return;
            }

            // Extract User Data
            const user = data.data.user[0];
            document.getElementById("username").textContent = user.login;
            document.getElementById("xp").textContent = user.totalUp || 0;
            document.getElementById("auditRatio").textContent = user.auditRatio || "N/A";

            // Calculate grade average
            const grades = user.progresses.map(p => p.grade);
            const avgGrade = grades.length ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : "N/A";
            document.getElementById("gradeAverage").textContent = avgGrade;

            // Generate Graphs
            generateXPGraph(user.progresses);
            generatePassFailGraph(user.progresses);

        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    }

    // Function to handle logout
    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("jwtToken");
        loginContainer.style.display = "block"; // Show login form
        profileContainer.style.display = "none"; // Hide profile
        logoutBtn.style.display = "none"; // Hide logout button
    });

    // Placeholder Graph Functions (Update as needed)
    function generateXPGraph(progressData) {
        console.log("Generating XP Graph", progressData);
        // Implement SVG graph logic here...
    }

    function generatePassFailGraph(progressData) {
        console.log("Generating Pass/Fail Graph", progressData);
        // Implement SVG graph logic here...
    }
});
