const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Function to clean up temporary files
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
    const { code, input } = workerData;

    // Paths for temporary source file and executable
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

    const clangPath = "/usr/bin/clang++"; // Full path to clang++ binary

    try {
        // Write code to the temporary source file
        fs.writeFileSync(sourceFile, code);

        // Compile the code using clang++
        const compileProcess = spawnSync(clangPath, [
            sourceFile,
            "-o", executable,
            "-O1",         // Optimization flag
            "-std=c++17",  // C++17 standard
            "-Wextra",     // Enable warnings
            "-lstdc++",    // Link to the standard library
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

        // Write the input to a temporary file if needed, or handle it directly as a runtime input
        const runProcess = spawnSync(executable, [], {
            input, // Pass the user input here
            encoding: "utf-8",
            timeout: 5000, // Timeout after 5 seconds
        });

        cleanupFiles(sourceFile, executable);

        if (runProcess.error || runProcess.stderr) {
            const error = runProcess.stderr || runProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Runtime Error:\n${error}` },
            });
        }

        // Return the output from the compiled code
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
