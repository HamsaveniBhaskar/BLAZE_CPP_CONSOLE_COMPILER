const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const port = 3000;

// Enable JSON parsing for HTTP requests
app.use(express.json());

// POST endpoint to compile the code
app.post("/compile", (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: "No code provided" });
    }

    // Write the code to a temporary .cpp file
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);
    const clangPath = "/usr/bin/clang++";

    fs.writeFileSync(sourceFile, code);

    // Compile the C++ code
    const compileProcess = spawn(clangPath, [sourceFile, "-o", executable, "-std=c++17"]);

    compileProcess.on("close", (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: "Compilation failed" });
        }

        // Send the path to the compiled executable
        res.json({ executable });
    });
});

// WebSocket connection for real-time execution
wss.on("connection", (ws, req) => {
    ws.on("message", (message) => {
        const { executable, input } = JSON.parse(message);

        // If no executable provided, return an error
        if (!executable) {
            ws.send(JSON.stringify({ error: "No executable provided" }));
            return;
        }

        // Spawn the compiled executable
        const runProcess = spawn(executable, [], {
            stdio: ["pipe", "pipe", "pipe"], // Enable interactive I/O
        });

        // Send output to the frontend
        runProcess.stdout.on("data", (data) => {
            ws.send(JSON.stringify({ output: data.toString() }));
        });

        runProcess.stderr.on("data", (data) => {
            ws.send(JSON.stringify({ error: data.toString() }));
        });

        // Send user input to the program
        if (input) {
            runProcess.stdin.write(`${input}\n`);
        }

        runProcess.on("close", (code) => {
            ws.send(JSON.stringify({ status: "Program finished", code }));
            ws.close();
        });

        // Handle input from the WebSocket (e.g., when the frontend sends input)
        ws.on("message", (message) => {
            const { input } = JSON.parse(message);
            if (input) {
                runProcess.stdin.write(`${input}\n`);
            }
        });
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
