const { parentPort, workerData } = require("worker_threads");
const { spawnSync } = require("child_process");
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
    const { code, input } = workerData;

    // Paths for temporary source file and executable
    const tmpDir = os.tmpdir();
    const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
    const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

    // Define the path to Clang++
    const clangPath = "/usr/bin/clang++"; // Full path to clang++ binary

    try {
        // Write the code to the source file
        fs.writeFileSync(sourceFile, code);

        // Compile the code using Clang++ with optimized flags
        const compileProcess = spawnSync(clangPath, [
            sourceFile,
            "-o", executable,
            "-O1",         // Reduce optimization to level 1 for faster compilation
            "-std=c++17",  // Use C++17 standard
            "-Wextra",     // Enable essential warnings only
            "-lstdc++",    // Link the GNU C++ standard library
        ], {
            encoding: "utf-8",
            timeout: 5000, // Timeout after 5 seconds
        });

        if (compileProcess.error || compileProcess.stderr) {
            cleanupFiles(sourceFile, executable);
            const error = compileProcess.stderr || compileProcess.error.message;
            return parentPort.postMessage({
                error: { fullError: `Compilation Error:\n${error}` },
            });
        }

        // Execute the compiled binary and provide interactive input
        const runProcess = spawnSync(executable, [], {
            input,  // Provide input from the frontend here
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

        // Send the output back to the main thread
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
