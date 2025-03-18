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

        // Decode JWT to get userId
        const userId = getUserIdFromToken(token);
        if (!userId) {
            console.error("Failed to extract user ID from token.");
            return;
        }

        // Fetch user profile data
        fetchUserProfile(token, userId);
    }

    // Function to extract userId from JWT
    function getUserIdFromToken(token) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload.sub || payload.userId; // Adjust based on API response
        } catch (error) {
            console.error("Error decoding JWT:", error);
            return null;
        }
    }

    // Function to fetch user profile data
    async function fetchUserProfile(token, userId) {
        const eventId = 1; // Set default eventId (modify if dynamic)

        const query = `
            query($userId: Int!, $eventId: Int!) {
                user(where: {id: {_eq: $userId}}) {
                    id
                    login
                    firstName
                    lastName
                    email
                    auditRatio
                    totalUp
                    totalDown
                    audits: audits_aggregate(
                        where: {
                            auditorId: {_eq: $userId},
                            grade: {_is_null: false}
                        },
                        order_by: {createdAt: desc}
                    ) {
                        nodes {
                            id
                            grade
                            createdAt
                            group {
                                captainLogin
                                object {
                                    name
                                }
                            }
                        }
                    }
                    progresses(where: { userId: { _eq: $userId }, object: { type: { _eq: "project" } } }, order_by: {updatedAt: desc}) {
                        id
                        object {
                            id
                            name
                            type
                        }
                        grade
                        createdAt
                        updatedAt
                    }
                    skills: transactions(
                        order_by: [{type: desc}, {amount: desc}]
                        distinct_on: [type]
                        where: {userId: {_eq: $userId}, type: {_in: ["skill_js", "skill_go", "skill_html", "skill_prog", "skill_front-end", "skill_back-end"]}}
                    ) {
                        type
                        amount
                    }
                }
                event_user(where: { userId: { _eq: $userId }, eventId: {_eq: $eventId}}) {
                    level
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
                body: JSON.stringify({
                    query,
                    variables: { userId, eventId },
                }),
            });

            const data = await response.json();
            console.log("🔍 GraphQL Response:", data); // Debugging

            if (data.errors) {
                console.error("❌ GraphQL Error:", data.errors);
                return;
            }

            // Extract User Data
            const user = data.data.user[0];
            if (!user) {
                console.error("❌ No user data returned.");
                return;
            }

            document.getElementById("username").textContent = `${user.firstName} ${user.lastName}`;
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
            console.error("❌ Error fetching user profile:", error);
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
