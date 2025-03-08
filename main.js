document.addEventListener("DOMContentLoaded", async function () {
    const usernameEl = document.getElementById("username");
    const xpEl = document.getElementById("xp");
    const auditRatioEl = document.getElementById("auditRatio");
    const gradeAvgEl = document.getElementById("gradeAverage");

    const token = localStorage.getItem("jwtToken");
    if (!token) {
        window.location.href = "index.html"; // Redirect if not logged in
        return;
    }

    // Example userId & eventId (You may need to fetch these dynamically)
    const userId = 1; // Change to dynamic user ID
    const eventId = 42; // Placeholder event ID

    // GraphQL Query with Variables
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
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                variables: { userId, eventId } // Pass variables dynamically
            }),
        });

        const data = await response.json();
        console.log("GraphQL Response:", data); // Debugging

        if (data.errors) {
            console.error("GraphQL Error:", data.errors);
            return;
        }

        // Extract User Data
        const user = data.data.user[0];
        const xp = user.totalUp || 0;
        const auditRatio = user.auditRatio || "N/A";
        const grades = user.progresses.map(p => p.grade);
        const avgGrade = grades.length ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2) : "N/A";

        // Update UI
        usernameEl.textContent = `${user.firstName} ${user.lastName}`;
        xpEl.textContent = xp;
        gradeAvgEl.textContent = avgGrade;
        auditRatioEl.textContent = auditRatio;

        // Call function to generate graphs (next step)
        generateXPGraph(user.progresses);
        generatePassFailGraph(user.progresses);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
});
