const { parentPort, workerData } = require("worker_threads");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs");
const readline = require("readline");

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

// Worker logic for compilation and interactive execution
(async () => {
  const { code } = workerData;

  // Paths for temporary source file and executable
  const tmpDir = os.tmpdir();
  const sourceFile = path.join(tmpDir, `temp_${Date.now()}.cpp`);
  const executable = path.join(tmpDir, `temp_${Date.now()}.out`);

  try {
    // Write the source code to a temporary file
    fs.writeFileSync(sourceFile, code);

    // Compile the source file using Clang++
    const compileProcess = spawnSync("/usr/bin/clang++", [
      sourceFile,
      "-o",
      executable,
      "-std=c++17",
      "-O2",
    ]);

    if (compileProcess.error || compileProcess.stderr) {
      cleanupFiles(sourceFile, executable);
      return parentPort.postMessage({
        error: { fullError: `Compilation Error:\n${compileProcess.stderr || compileProcess.error.message}` },
      });
    }

    // Execute the compiled binary
    const runProcess = spawn(executable, [], { stdio: ["pipe", "pipe", "pipe"] });

    // Create a readline interface to handle interactive input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Handle standard output (stdout) from the program
    runProcess.stdout.on("data", (data) => {
      parentPort.postMessage({ output: data.toString() });
    });

    // Handle standard error (stderr) from the program
    runProcess.stderr.on("data", (data) => {
      parentPort.postMessage({ error: { fullError: data.toString() } });
    });

    // Handle input from the parent thread
    parentPort.on("message", (input) => {
      if (input) {
        runProcess.stdin.write(input + "\n"); // Write input to the program's stdin
      }
    });

    // Handle process exit
    runProcess.on("exit", (code) => {
      rl.close();
      cleanupFiles(sourceFile, executable);

      // Send the exit code back to the parent
      parentPort.postMessage({ output: `\nProgram exited with code ${code}` });
    });
  } catch (err) {
    cleanupFiles(sourceFile, executable);

    // Send any unexpected errors back to the parent
    parentPort.postMessage({ error: { fullError: `Server error: ${err.message}` } });
  }
})();
