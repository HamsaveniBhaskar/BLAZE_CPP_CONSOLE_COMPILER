const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// State to manage program execution
let currentProgram = null;
let inputQueue = [];
let currentClient = null;

app.get("/run", (req, res) => {
    const code = req.query.code;
    if (!code) {
        res.status(400).send("Code is required.");
        return;
    }

    console.log("Code received for execution:\n", code); // Log the received code

    const uniqueId = Date.now();
    const tempDir = os.tmpdir();
    const fileName = path.join(tempDir, `temp_${uniqueId}.cpp`);
    const executable = path.join(tempDir, `temp_${uniqueId}.out`);

    try {
        // Save code to a temporary file
        fs.writeFileSync(fileName, code);

        // Compile the code
        const compileCommand = `clang++ -o "${executable}" "${fileName}"`;
        require("child_process").execSync(compileCommand);

        // Start the program
        currentProgram = spawn(executable);
        currentClient = res;

        // Setup response as an event stream
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        currentProgram.stdout.on("data", (data) => {
            // Convert the output to string
            let output = data.toString();
            console.log("Program output:", output.trim()); // Log the program output
        
            // Replace escape sequences with visible formats
            const formattedOutput = output
                .replace(/\\n/g, "\n")        // Newline
                .replace(/\\t/g, "tt")     // Horizontal tab (convert to spaces)
                .replace(/\\r/g, "\r")       // Carriage return
                .replace(/\\b/g, "\b")       // Backspace (Note: Backspace won't work as expected in web)
                .replace(/\\f/g, "\f")       // Form feed
                .replace(/\\v/g, "&nbsp") // Vertical tab (convert to visible spaces)
                .replace(/\\\\/g, "\\")      // Backslash
                .replace(/\\'/g, "'")        // Single quote
                .replace(/\\"/g, "\"")       // Double quote
                .replace(/\\\?/g, "?")       // Question mark
                .replace(/\\a/g, "\u0007")   // Bell (may not be audible on browsers)
                .replace(/\\0/g, "\0")       // Null character (won't render in browser)
                .replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16))) // Hex
                .replace(/\\u([0-9A-Fa-f]{4})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16))) // Unicode (16-bit)
                .replace(/\\U([0-9A-Fa-f]{8})/g, (match, hex) => String.fromCodePoint(parseInt(hex, 16))); // Unicode (32-bit)
        
            
        
                // Split the formatted output by newline and send each line separately
                const lines = formattedOutput.split("\n");
                lines.forEach((line) => {
                    // Send the output as normal
                    res.write(`data: ${line}\n\n`);
                });

        });
        
        

        currentProgram.stderr.on("data", (data) => {
            console.error("Program error:", data.toString()); // Log any error output
            res.write(`data: Error: ${data.toString()}\n\n`);
        });

        currentProgram.on("close", (code) => {
            console.log("Program execution completed with exit code:", code); // Log program termination
            res.write("data: DONE\n\n");
            res.end();
            currentProgram = null;
            currentClient = null;
        });
    } catch (err) {
        console.error("Compilation or execution error:", err.message); // Log errors during compilation or execution
        res.status(500).send(`Server Error: ${err.message}`);
    }
});

app.post("/input", (req, res) => {
    const userInput = req.body.input ? req.body.input.trim() : "";  // If input is empty, assign an empty string
    console.log("Input received from client:", userInput); // Log the received input

    if (currentProgram) {
        if (userInput) {
            currentProgram.stdin.write(`${userInput}\n`);
            res.status(200).send("Input processed.");
        } else {
            res.status(200).send("No input received.");
        }
    } else {
        res.status(400).send("No program is currently running.");
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
