const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

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
    const { code, input } = workerData;  // Destructure code and input from workerData

    if (!code || !input) {
        return parentPort.postMessage({
            error: { fullError: "Error: Missing code or input in worker" }
        });
    }

    // Paths for temporary source file and executable
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

    const clangPath = "/usr/bin/clang++";

    try {
        // Write the code to the source file
        fs.writeFileSync(sourceFile, code);

        // Compile the code using Clang++
        const compileProcess = spawnSync(clangPath, [
            sourceFile,
            "-o", executable,
            "-O1", "-std=c++17", "-Wextra", "-lstdc++",
        ], {
            encoding: "utf-8",
            timeout: 5000,
        });

        if (compileProcess.error || compileProcess.stderr) {
            cleanupFiles(sourceFile, executable);
            const error = compileProcess.stderr || compileProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Compilation Error:\n${error}` },
            });
        }

        // Execute the compiled binary
        const runProcess = spawnSync(executable, [], {
            input,
            encoding: "utf-8",
            timeout: 5000,
        });

        cleanupFiles(sourceFile, executable);

        if (runProcess.error || runProcess.stderr) {
            const error = runProcess.stderr || runProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Runtime Error:\n${error}` },
            });
        }

        // Send the output back
        return parentPort.postMessage({
            output: runProcess.stdout || "No output received!",
        });
    } catch (err) {
        cleanupFiles(sourceFile, executable);
        return parentPort.postMessage({
            error: { fullError: `Server error: ${err.message}` },
        });
    }
})();
