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
// Replace the existing renderAuditBars function with this
function renderAuditBars(upValue, downValue) {
    // Get the container where we'll place our single SVG
    const container = document.getElementById("auditRatioContainer");
    if (!container) return;
    
    // Clear previous content
    container.innerHTML = "";
    
    // Calculate ratio and determine comment
    const ratio = upValue && downValue ? (upValue / downValue).toFixed(2) : "0.00";
    let comment = "Needs improvement";
    if (ratio >= 1) comment = "Almost perfect!";
    if (ratio >= 1.5) comment = "Great auditor!";
    if (ratio >= 2) comment = "Audit master!";
    
    // Format values in MB
    const doneMB = (upValue / 1_000_000).toFixed(2);
    const receivedMB = (downValue / 1_000_000).toFixed(2);
    
    // Get max value for scaling
    const maxValue = Math.max(upValue, downValue) || 1; // prevent division by zero
    
    // Calculate percentages
    const upWidth = (upValue / maxValue) * 100;
    const downWidth = (downValue / maxValue) * 100;
    
    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "200");
    svg.setAttribute("viewBox", "0 0 400 200");
    
    // Add header text
    const headerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    headerText.setAttribute("x", "0");
    headerText.setAttribute("y", "20");
    headerText.setAttribute("font-size", "18");
    headerText.setAttribute("font-weight", "bold");
    headerText.setAttribute("fill", "#2c3e50");
    headerText.textContent = "Audit Ratio";
    svg.appendChild(headerText);
    
    // Add ratio value
    const ratioText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    ratioText.setAttribute("x", "380");
    ratioText.setAttribute("y", "20");
    ratioText.setAttribute("font-size", "18");
    ratioText.setAttribute("font-weight", "bold");
    ratioText.setAttribute("text-anchor", "end");
    ratioText.setAttribute("fill", "#2c3e50");
    ratioText.textContent = ratio;
    svg.appendChild(ratioText);
    
    // Add "Done" label
    const doneLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    doneLabel.setAttribute("x", "0");
    doneLabel.setAttribute("y", "50");
    doneLabel.setAttribute("font-size", "14");
    doneLabel.setAttribute("fill", "#34495e");
    doneLabel.textContent = "Done:";
    svg.appendChild(doneLabel);
    
    // Add Done value
    const doneValue = document.createElementNS("http://www.w3.org/2000/svg", "text");
    doneValue.setAttribute("x", "380");
    doneValue.setAttribute("y", "50");
    doneValue.setAttribute("font-size", "14");
    doneValue.setAttribute("text-anchor", "end");
    doneValue.setAttribute("fill", "#34495e");
    doneValue.textContent = `${doneMB} MB`;
    svg.appendChild(doneValue);
    
    // Add Done bar background
    const upBarBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    upBarBg.setAttribute("x", "0");
    upBarBg.setAttribute("y", "60");
    upBarBg.setAttribute("width", "380");
    upBarBg.setAttribute("height", "14");
    upBarBg.setAttribute("rx", "7");
    upBarBg.setAttribute("ry", "7");
    upBarBg.setAttribute("fill", "#e0e0e0");
    svg.appendChild(upBarBg);
    
    // Add Done bar fill
    const upBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    upBar.setAttribute("x", "0");
    upBar.setAttribute("y", "60");
    upBar.setAttribute("width", (upWidth * 380 / 100).toString());
    upBar.setAttribute("height", "14");
    upBar.setAttribute("rx", "7");
    upBar.setAttribute("ry", "7");
    upBar.setAttribute("fill", "#27ae60");
    svg.appendChild(upBar);
    
    // Add "Received" label
    const receivedLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    receivedLabel.setAttribute("x", "0");
    receivedLabel.setAttribute("y", "100");
    receivedLabel.setAttribute("font-size", "14");
    receivedLabel.setAttribute("fill", "#34495e");
    receivedLabel.textContent = "Received:";
    svg.appendChild(receivedLabel);
    
    // Add Received value
    const receivedValue = document.createElementNS("http://www.w3.org/2000/svg", "text");
    receivedValue.setAttribute("x", "380");
    receivedValue.setAttribute("y", "100");
    receivedValue.setAttribute("font-size", "14");
    receivedValue.setAttribute("text-anchor", "end");
    receivedValue.setAttribute("fill", "#34495e");
    receivedValue.textContent = `${receivedMB} MB`;
    svg.appendChild(receivedValue);
    
    // Add Received bar background
    const downBarBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    downBarBg.setAttribute("x", "0");
    downBarBg.setAttribute("y", "110");
    downBarBg.setAttribute("width", "380");
    downBarBg.setAttribute("height", "14");
    downBarBg.setAttribute("rx", "7");
    downBarBg.setAttribute("ry", "7");
    downBarBg.setAttribute("fill", "#e0e0e0");
    svg.appendChild(downBarBg);
    
    // Add Received bar fill
    const downBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    downBar.setAttribute("x", "0");
    downBar.setAttribute("y", "110");
    downBar.setAttribute("width", (downWidth * 380 / 100).toString());
    downBar.setAttribute("height", "14");
    downBar.setAttribute("rx", "7");
    downBar.setAttribute("ry", "7");
    downBar.setAttribute("fill", "#000000");
    svg.appendChild(downBar);
    
    // Add comment
    const commentText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    commentText.setAttribute("x", "200");
    commentText.setAttribute("y", "160");
    commentText.setAttribute("font-size", "16");
    commentText.setAttribute("text-anchor", "middle");
    commentText.setAttribute("fill", "#f39c12");
    commentText.textContent = comment;
    svg.appendChild(commentText);
    
    // Add the SVG to the container
    container.appendChild(svg);
    
    // Update the text elements (for browsers that might not support SVG text well)
    document.getElementById("auditRatio").textContent = ratio;
    document.getElementById("auditUp").textContent = `${doneMB} MB`;
    document.getElementById("auditDown").textContent = `${receivedMB} MB`;
    document.getElementById("auditComment").textContent = comment;
}


});