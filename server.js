const express = require("express");
const { Worker } = require("worker_threads");
const crypto = require("crypto");

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(require("cors")());
app.use(express.json());

app.post("/", (req, res) => {
    const { code, input } = req.body;

    // Validate input
    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    // Create a worker thread for compilation and execution
    const worker = new Worker("./compiler-worker.js", {
        workerData: { code, input },
    });

    worker.on("message", (result) => {
        if (result.waitingForInput) {
            // Notify the client to provide input
            res.json({
                waitingForInput: true,
                output: result.output || "",
            });
        } else {
            // Final output or error
            res.json({ output: result.output || "No output received!" });
        }
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
