document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("errorMessage");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginContainer = document.getElementById("loginContainer");
    const profileContainer = document.getElementById("profileContainer");

    // Check if user is already logged in
    const storedToken = localStorage.getItem("jwtToken");
    if (storedToken) {
        showProfile();
    }

    // Handle login form submission
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const loginValue = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const credentials = btoa(`${loginValue}:${password}`); // base64 encode

        try {
            const response = await fetch("https://learn.reboot01.com/api/auth/signin", {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${btoa(`${loginValue}:${password}`)}`
                }
            });

            const raw = await response.text();
const jwt = JSON.parse(raw); // removes the extra quotes


            if (response.ok && jwt.includes(".")) {
                localStorage.setItem("jwtToken", jwt.trim());
                showProfile();
            } else {
                console.log("Login failed, got:", jwt);
                errorMessage.textContent = "Invalid credentials.";
            }
        } catch (error) {
            console.error("Login request error:", error);
            errorMessage.textContent = "Network error. Please try again.";
        }
    });

    // Function to show the profile and fetch user data
    async function showProfile() {
        loginContainer.style.display = "none";
        profileContainer.style.display = "block";
        logoutBtn.style.display = "block";

        const token = localStorage.getItem("jwtToken");
        if (!token) {
            console.error("No JWT found! Redirecting to login...");
            return;
        }

        console.log("📌 Using JWT:", token); // Debug: see your token

        const userId = getUserIdFromToken(token);
        if (!userId) {
            console.error("Failed to extract user ID from token.");
            return;
        }

        fetchUserProfile(token, userId);
    }

    // Function to extract userId from JWT
    function getUserIdFromToken(token) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload.sub || payload.userId;
        } catch (error) {
            console.error("Error decoding JWT:", error);
            return null;
        }
    }

    // Function to fetch user profile data
    async function fetchUserProfile(token, userId) {
        const eventId = 1;

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
            console.log("🔍 GraphQL Response:", data);

            if (data.errors) {
                console.error("❌ GraphQL Error:", data.errors);
                return;
            }

            const user = data.data.user[0];
            if (!user) {
                console.error("❌ No user data returned.");
                return;
            }

            document.getElementById("username").textContent = `${user.firstName} ${user.lastName}`;
            document.getElementById("xp").textContent = user.totalUp || 0;
            document.getElementById("auditRatio").textContent = user.auditRatio || "N/A";

            const grades = user.progresses.map(p => p.grade);
            const avgGrade = grades.length ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : "N/A";
            document.getElementById("gradeAverage").textContent = avgGrade;

            generateXPGraph(user.progresses);
            generatePassFailGraph(user.progresses);

        } catch (error) {
            console.error("❌ Error fetching user profile:", error);
        }
    }

    // Handle logout
    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("jwtToken");
        loginContainer.style.display = "block";
        profileContainer.style.display = "none";
        logoutBtn.style.display = "none";
    });

    // Placeholder Graph Functions
    function generateXPGraph(progressData) {
        console.log("Generating XP Graph", progressData);
        // Add SVG generation code here...
    }

    function generatePassFailGraph(progressData) {
        console.log("Generating Pass/Fail Graph", progressData);
        // Add SVG generation code here...
    }
});
