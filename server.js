const express = require("express");
const bodyParser = require("body-parser");
const { Worker } = require("worker_threads");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3000;
const MAX_FILES = 5;

// Enable CORS
app.use(cors());

// Middleware for JSON parsing
app.use(bodyParser.json({ limit: "10mb" })); // Increase body size for large files

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "Server is running" });
});

// POST endpoint for HTML compilation and execution
app.post("/", (req, res) => {
    const { code, input, files } = req.body;

    // Validate code and files
    if (!code) {
        return res.status(400).json({ error: "Error: No code provided!" });
    }

    if (files && files.length > MAX_FILES) {
        return res.status(400).json({ error: `Error: Maximum of ${MAX_FILES} files allowed.` });
    }

    // Create a worker to handle the code compilation and execution
    const worker = new Worker(path.resolve(__dirname, "compiler-worker.js"), {
        workerData: { code, input, files },
    });

    worker.on("message", (result) => res.json(result));
    worker.on("error", (err) => {
        console.error("Worker error:", err.message);
        res.status(500).json({ error: `Worker error: ${err.message}` });
    });
    worker.on("exit", (code) => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
            res.status(500).json({ error: `Worker failed with exit code ${code}` });
        }
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
