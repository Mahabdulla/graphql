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
            document.getElementById("userlogin").textContent = user.login;
            document.getElementById("useremail").textContent = user.email;

            document.getElementById("xp").style.display = "none";
            document.getElementById("xp").textContent = user.totalUp || 0;
            document.getElementById("auditRatio").textContent = user.auditRatio || "N/A";
            // Inside fetchUserProfile function, after getting user data:
const audits = user.audits?.nodes || [];
const totalAudits = audits.length;
const passAudits = audits.filter(a => a.grade >= 1).length;
const failAudits = totalAudits - passAudits;

document.getElementById("totalAudits").textContent = totalAudits;
document.getElementById("passAudits").textContent = passAudits;
document.getElementById("failAudits").textContent = failAudits;



// Remove the XP line or keep it hidden
document.getElementById("xp").style.display = "none";
            // Format total up/down
const doneMB = (user.totalUp / 1_000_000).toFixed(2);
const receivedMB = (user.totalDown / 1_000_000).toFixed(2);
const ratio = user.auditRatio?.toFixed(2) || "0.00";

// Update values
document.getElementById("auditUp").textContent = `${doneMB} MB`;
document.getElementById("auditDown").textContent = `${receivedMB} MB`;
document.getElementById("auditRatio").textContent = ratio;

// Bar visuals (max fill 100%)
const maxAudit = Math.max(user.totalUp, user.totalDown) || 1;
const upWidth = (user.totalUp / maxAudit) * 100;
const downWidth = (user.totalDown / maxAudit) * 100;

renderAuditBars(user.totalUp, user.totalDown);

// Comment
let comment = "Needs improvement";
if (ratio >= 1) comment = "Almost perfect!";
if (ratio >= 1.5) comment = "Great auditor!";
if (ratio >= 2) comment = "Audit master!";

document.getElementById("auditComment").textContent = comment;


            const skillLabels = user.skills.map(s => s.type.replace("skill_", "").toUpperCase());
            const skillValues = user.skills.map(s => s.amount);
            renderSkillChart(skillLabels, skillValues);
            renderAuditPie(passAudits, failAudits);

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

    // Render skill radar chart using ApexCharts
    function renderSkillChart(labels, values) {
       const svg = document.getElementById("skillSVG");
       svg.innerHTML = "";
   
       const barHeight = 25;
       const gap = 10;
       const maxVal = Math.max(...values, 1); // prevent divide by 0
       const chartWidth = svg.clientWidth || 500;
   
       svg.setAttribute("height", (barHeight + gap) * labels.length);
   
       labels.forEach((label, i) => {
           const val = values[i];
           const barWidth = (val / maxVal) * (chartWidth - 150); // space for labels
   
           // Label Text
           const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
           labelText.setAttribute("x", 0);
           labelText.setAttribute("y", i * (barHeight + gap) + barHeight - 5);
           labelText.setAttribute("font-size", "14");
           labelText.setAttribute("fill", "#2c3e50");
           labelText.textContent = label;
           svg.appendChild(labelText);
   
           // Bar Rect
           const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
           bar.setAttribute("x", 100);
           bar.setAttribute("y", i * (barHeight + gap));
           bar.setAttribute("width", barWidth);
           bar.setAttribute("height", barHeight);
           bar.setAttribute("fill", "#3498db");
           svg.appendChild(bar);
   
           // Value Text
           const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
           valueText.setAttribute("x", 105 + barWidth);
           valueText.setAttribute("y", i * (barHeight + gap) + barHeight - 5);
           valueText.setAttribute("font-size", "14");
           valueText.setAttribute("fill", "#2c3e50");
           valueText.textContent = val;
           svg.appendChild(valueText);
       });
   }
   function renderAuditPie(passCount, failCount) {
       const svg = document.getElementById("auditPieSVG");
       svg.innerHTML = "";
   
       const total = passCount + failCount;
       if (total === 0) return;
   
       const centerX = 100, centerY = 100, radius = 90;
       const passRatio = passCount / total;
       const failRatio = failCount / total;
   
       if (passRatio === 1) {
           const fullCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
           fullCircle.setAttribute("cx", centerX);
           fullCircle.setAttribute("cy", centerY);
           fullCircle.setAttribute("r", radius);
           fullCircle.setAttribute("fill", "#2ecc71"); // full green
           svg.appendChild(fullCircle);
           return;
       }
   
       if (failRatio === 1) {
           const fullCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
           fullCircle.setAttribute("cx", centerX);
           fullCircle.setAttribute("cy", centerY);
           fullCircle.setAttribute("r", radius);
           fullCircle.setAttribute("fill", "#e74c3c"); // full red
           svg.appendChild(fullCircle);
           return;
       }
   
       const polarToCartesian = (cx, cy, r, angleDeg) => {
           const rad = (angleDeg - 90) * (Math.PI / 180);
           return {
               x: cx + r * Math.cos(rad),
               y: cy + r * Math.sin(rad)
           };
       };
   
       const describeArc = (cx, cy, r, startAngle, endAngle) => {
           const start = polarToCartesian(cx, cy, r, endAngle);
           const end = polarToCartesian(cx, cy, r, startAngle);
           const largeArc = endAngle - startAngle > 180 ? 1 : 0;
   
           return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
       };
   
       const passAngle = passRatio * 360;
       const failAngle = 360 - passAngle;
   
       const passPath = describeArc(centerX, centerY, radius, 0, passAngle);
       const failPath = describeArc(centerX, centerY, radius, passAngle, 360);
   
       const passSlice = document.createElementNS("http://www.w3.org/2000/svg", "path");
       passSlice.setAttribute("d", passPath);
       passSlice.setAttribute("fill", "#2ecc71");
       svg.appendChild(passSlice);
   
       const failSlice = document.createElementNS("http://www.w3.org/2000/svg", "path");
       failSlice.setAttribute("d", failPath);
       failSlice.setAttribute("fill", "#e74c3c");
       svg.appendChild(failSlice);
   }
   // Function to render audit bars using SVG
function renderAuditBars(upValue, downValue) {
    // Get max value for scaling
    const maxValue = Math.max(upValue, downValue) || 1; // prevent division by zero
    
    // Calculate percentages
    const upWidth = (upValue / maxValue) * 100;
    const downWidth = (downValue / maxValue) * 100;
    
    // Render "Done" bar (upValue)
    const upSvg = document.getElementById("auditUpSVG");
    upSvg.innerHTML = ""; // Clear previous content
    
    const upRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    upRect.setAttribute("x", "0");
    upRect.setAttribute("y", "0");
    upRect.setAttribute("width", upWidth + "%");
    upRect.setAttribute("height", "14");
    upRect.setAttribute("rx", "7"); // Rounded corners (radius)
    upRect.setAttribute("ry", "7"); // Rounded corners (radius)
    upRect.setAttribute("fill", "#27ae60"); // Green color
    upSvg.appendChild(upRect);
    
    // Render "Received" bar (downValue)
    const downSvg = document.getElementById("auditDownSVG");
    downSvg.innerHTML = ""; // Clear previous content
    
    const downRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    downRect.setAttribute("x", "0");
    downRect.setAttribute("y", "0");
    downRect.setAttribute("width", downWidth + "%");
    downRect.setAttribute("height", "14");
    downRect.setAttribute("rx", "7"); // Rounded corners (radius)
    downRect.setAttribute("ry", "7"); // Rounded corners (radius)
    downRect.setAttribute("fill", "#000000"); // Black color
    downSvg.appendChild(downRect);
    
    // Add background for better visibility of partial bars
    const upBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    upBg.setAttribute("x", "0");
    upBg.setAttribute("y", "0");
    upBg.setAttribute("width", "100%");
    upBg.setAttribute("height", "14");
    upBg.setAttribute("rx", "7");
    upBg.setAttribute("ry", "7");
    upBg.setAttribute("fill", "#e0e0e0");
    upSvg.insertBefore(upBg, upRect);
    
    const downBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    downBg.setAttribute("x", "0");
    downBg.setAttribute("y", "0");
    downBg.setAttribute("width", "100%");
    downBg.setAttribute("height", "14");
    downBg.setAttribute("rx", "7");
    downBg.setAttribute("ry", "7");
    downBg.setAttribute("fill", "#e0e0e0");
    downSvg.insertBefore(downBg, downRect);
}
   


});