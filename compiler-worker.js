const { parentPort, workerData } = require("worker_threads");
const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Utility function to clean up temporary files
function cleanupFiles(...files) {
    files.forEach((file) => {
        try {
            fs.unlinkSync(file);
        } catch (err) {
            // Ignore errors
        }
    });
}

// Worker logic
(async () => {
    const { code } = workerData;

    // Paths for temporary source file and executable
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

    const clangPath = "/usr/bin/clang++"; // Path to Clang++

    try {
        // Write the code to the source file
        fs.writeFileSync(sourceFile, code);

        // Compile the code
        const compileProcess = spawn(clangPath, [
            sourceFile,
            "-o", executable,
            "-std=c++17",
        ]);

        compileProcess.on("error", (error) => {
            cleanupFiles(sourceFile, executable);
            parentPort.postMessage({
                error: { fullError: `Compilation Error: ${error.message}` },
            });
        });

        compileProcess.on("close", (code) => {
            if (code !== 0) {
                cleanupFiles(sourceFile, executable);
                parentPort.postMessage({
                    error: { fullError: "Compilation failed with errors." },
                });
                return;
            }

            // Execute the binary
            const runProcess = spawn(executable, [], {
                stdio: ["pipe", "pipe", "pipe"], // Enable interactive input/output
            });

            let outputBuffer = "";
            let isWaitingForInput = false;

            runProcess.stdout.on("data", (data) => {
                const output = data.toString();
                outputBuffer += output;

                // Check if the program is waiting for input (e.g., encountered `cin`)
                if (!isWaitingForInput) {
                    parentPort.postMessage({ output, waitingForInput: true });
                    isWaitingForInput = true; // Stop listening until input is provided
                }
            });

            parentPort.on("message", (input) => {
                // Send user input to the program
                runProcess.stdin.write(`${input}\n`);
                isWaitingForInput = false; // Allow processing next output
            });

            runProcess.stderr.on("data", (data) => {
                cleanupFiles(sourceFile, executable);
                parentPort.postMessage({
                    error: { fullError: data.toString() },
                });
            });

            runProcess.on("close", (code) => {
                cleanupFiles(sourceFile, executable);
                if (code !== 0) {
                    parentPort.postMessage({
                        error: { fullError: "Execution failed." },
                    });
                } else {
                    parentPort.postMessage({ output: outputBuffer });
                }
            });
        });
    } catch (err) {
        cleanupFiles(sourceFile, executable);
        parentPort.postMessage({
            error: { fullError: `Server error: ${err.message}` },
        });
    }
})();
