const express = require("express");
const { Worker } = require("worker_threads");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const app = express();
const port = 3000;

// Enable CORS and use express.json() for built-in JSON parsing
app.use(require("cors")());
app.use(express.json());

// In-memory cache to store compiled results
const cache = new Map();
const CACHE_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

// Cache cleanup optimized: Only clean when necessary
function cleanCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of cache.entries()) {
        if (now - timestamp > CACHE_EXPIRATION_TIME) {
            cache.delete(key);
        }
    }
}

// Cache cleanup triggered by cache size or expiration
function manageCache(codeHash, output) {
    // Cache the result if successful
    if (cache.size >= MAX_CACHE_SIZE) {
        // Remove the oldest cache entry
        const oldestKey = [...cache.keys()][0];
        cache.delete(oldestKey);
    }
    cache.set(codeHash, { result: output, timestamp: Date.now() });
}

// POST endpoint for code compilation and execution
app.post("/", (req, res) => {
    const { code, input } = req.body;

    // Validate input
    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    // Generate a unique hash for the code
    const codeHash = crypto.createHash("md5").update(code).digest("hex");

    // Check if result is cached
    if (cache.has(codeHash)) {
        return res.json({ output: cache.get(codeHash).result });
    }

    // Create a worker thread for compilation
    const worker = new Worker(path.join(__dirname, "compiler-worker.js"), {
        workerData: { code, input },
    });

    worker.on("message", (result) => {
        // Cache the result if successful
        if (result.output) {
            manageCache(codeHash, result.output);
        }
        res.json(result);
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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
