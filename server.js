const express = require("express");
const { Worker, isMainThread } = require("worker_threads");
const crypto = require("crypto");
const WebSocket = require("ws");  // Import WebSocket module

const app = express();
const port = 3000;

// WebSocket server setup
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
    console.log("Client connected");
    ws.on("close", () => {
        console.log("Client disconnected");
    });
});

app.use(require("cors")());
app.use(express.json());

// POST endpoint for code compilation and execution
app.post("/", (req, res) => {
    const { code, input } = req.body;

    if (!code) {
        return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
    }

    const codeHash = crypto.createHash("md5").update(code).digest("hex");

    const worker = new Worker("./compiler-worker.js", {
        workerData: { code, input },
    });

    worker.on("message", (result) => {
        if (result.output) {
            res.json(result);
        }
        if (result.output) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(result.output);  // Send output to the frontend via WebSocket
                }
            });
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
