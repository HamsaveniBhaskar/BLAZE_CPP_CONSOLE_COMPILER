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

(async () => {
    const { code, input } = workerData;

    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

    const clangPath = "/usr/bin/clang++";

    try {
        fs.writeFileSync(sourceFile, code);

        const compileProcess = spawn(clangPath, [
            sourceFile,
            "-o", executable,
            "-std=c++17",
        ]);

        compileProcess.on("error", (error) => {
            cleanupFiles(sourceFile, executable);
            return parentPort.postMessage({
                error: { fullError: `Compilation Error: ${error.message}` },
            });
        });

        compileProcess.on("close", (code) => {
            if (code !== 0) {
                cleanupFiles(sourceFile, executable);
                return parentPort.postMessage({
                    error: { fullError: "Compilation failed with errors." },
                });
            }

            const runProcess = spawn(executable, [], {
                stdio: ["pipe", "pipe", "pipe"], // Enable interactive input/output
            });

            runProcess.stdout.on("data", (data) => {
                const output = data.toString();

                if (output.includes("cin")) {
                    // Notify the server that input is required
                    parentPort.postMessage({
                        waitingForInput: true,
                        output,
                    });
                } else {
                    parentPort.postMessage({ output });
                }
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
                    return parentPort.postMessage({
                        error: { fullError: "Execution failed." },
                    });
                }
            });

            // Handle user input dynamically
            parentPort.on("message", (userInput) => {
                runProcess.stdin.write(userInput + "\n");
            });
        });
    } catch (err) {
        cleanupFiles(sourceFile, executable);
        return parentPort.postMessage({
            error: { fullError: `Server error: ${err.message}` },
        });
    }
})();
