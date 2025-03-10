require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files from "public" folder

// Login Route (Proxy to the external API)
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const response = await fetch("https://learn.reboot01.com/api/auth/signin", {
            method: "POST",
            headers: {
                "Authorization": "Basic " + Buffer.from(`${email}:${password}`).toString("base64"),
                "Content-Type": "application/json",
            },
        });

        const token = await response.text();
        if (!response.ok || !token.includes(".")) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        res.json({ token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GraphQL Proxy
app.post("/api/graphql", async (req, res) => {
    const { token, query, variables } = req.body;

    if (!token) {
        return res.status(401).json({ error: "JWT token required" });
    }

    try {
        const response = await fetch("https://learn.reboot01.com/api/graphql-engine/v1/graphql", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("GraphQL Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
