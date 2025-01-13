const express = require("express");
const { Worker } = require("worker_threads");
const crypto = require("crypto");
const http = require("http");

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(require("cors")());
app.use(express.json());

app.post("/", (req, res) => {
    const { code, input } = req.body;

    // Validate code
    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    // Generate a unique hash for the code to cache the result
    const codeHash = crypto.createHash("md5").update(code).digest("hex");

    // Check if result is cached
    if (cache.has(codeHash)) {
        return res.json({ output: cache.get(codeHash).result });
    }

    // Pass the code and user input to the worker
    const worker = new Worker("./compiler-worker.js", {
        workerData: { code, input },
    });

    worker.on("message", (result) => {
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
