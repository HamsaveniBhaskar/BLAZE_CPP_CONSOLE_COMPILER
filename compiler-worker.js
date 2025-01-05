const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

try {
    const { code, input, files } = workerData;

    // Create a temporary directory for processing files
    const tempDir = path.resolve("/tmp/html-compiler");
    fs.mkdirSync(tempDir, { recursive: true });

    // Write the main HTML file
    const mainFile = path.join(tempDir, "index.html");
    fs.writeFileSync(mainFile, code);

    // Write additional files to the directory
    if (files && files.length > 0) {
        files.forEach((file) => {
            const filePath = path.join(tempDir, file.name);
            fs.writeFileSync(filePath, file.content);
        });
    }

    // Simulate rendering or validation
    const runProcess = spawnSync("node", ["-e", "console.log('HTML compiled successfully.')"], {
        encoding: "utf-8",
        timeout: 5000,
    });

    // Check for runtime errors
    if (runProcess.error) {
        throw new Error(runProcess.error.message);
    }

    if (runProcess.stderr) {
        throw new Error(runProcess.stderr);
    }

    // Return success message
    parentPort.postMessage({ output: "HTML compiled and files processed successfully!" });
} catch (err) {
    console.error("Error in worker:", err.message);
    parentPort.postMessage({ error: `Worker Error: ${err.message}` });
}
