const express = require("express");
const { Worker } = require("worker_threads");
const crypto = require("crypto");
const http = require("http");

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(require("cors")());
app.use(express.json());

// In-memory cache for compiled results
const cache = new Map();
const CACHE_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

// Function to clean up expired cache
function cleanCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of cache.entries()) {
        if (now - timestamp > CACHE_EXPIRATION_TIME) {
            cache.delete(key);
        }
    }
}

// Manage cache size
function manageCache(codeHash, output) {
    if (cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = [...cache.keys()][0];
        cache.delete(oldestKey);
    }
    cache.set(codeHash, { result: output, timestamp: Date.now() });
}

// POST endpoint for code execution
app.post("/", (req, res) => {
    const { code, input } = req.body;

    // Validate input
    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    // Generate a hash for caching
    const codeHash = crypto.createHash("md5").update(code).digest("hex");

    // Check if the result is already cached
    if (cache.has(codeHash)) {
        return res.json({ output: cache.get(codeHash).result });
    }

    // Create a worker thread for compilation and execution
    const worker = new Worker("./compiler-worker.js", {
        workerData: { code, input },
    });

    let interactiveOutput = ""; // Store partial outputs

    worker.on("message", (result) => {
        if (result.waitingForInput) {
            // Notify the client to provide input
            interactiveOutput += result.output || "";
            return res.json({
                waitingForInput: true,
                output: interactiveOutput,
            });
        }

        if (result.output) {
            interactiveOutput += result.output;
        }

        res.json({ output: interactiveOutput });
    });

    worker.on("error", (err) => {
        res.status(500).json({ error: { fullError: `Worker error: ${err.message}` } });
    });

    worker.on("exit", (code) => {
        if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
        }
    });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "Server is running" });
});

// Self-pinging mechanism to keep the server alive
setInterval(() => {
    http.get(`http://localhost:${port}/health`, (res) => {
        console.log("Health check pinged!");
    });
}, 10 * 60 * 1000); // Ping every 10 minutes

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
