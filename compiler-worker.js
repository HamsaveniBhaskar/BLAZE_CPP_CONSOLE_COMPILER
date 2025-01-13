const { parentPort, workerData } = require('worker_threads');
const { exec } = require('child_process');

// This function compiles and runs the code
function runCode(code, input) {
  // Save the code to a temporary file (e.g., temp.cpp for C++ code)
  const fs = require('fs');
  const path = require('path');
  const tempFilePath = path.join(__dirname, 'temp.cpp');
  const outputFilePath = path.join(__dirname, 'temp.out');
  
  fs.writeFileSync(tempFilePath, code, 'utf8');

  // Compile the C++ code using g++ (adjust for other languages accordingly)
  const compileCommand = `g++ ${tempFilePath} -o ${outputFilePath}`;
  exec(compileCommand, (compileError, compileStdout, compileStderr) => {
    if (compileError || compileStderr) {
      // If compilation fails, return the error
      parentPort.postMessage({ error: { fullError: `Compilation Error: ${compileStderr || compileError.message}` } });
      return;
    }

    // Run the compiled executable (passing input if necessary)
    const runCommand = `${outputFilePath} ${input ? `< ${input}` : ''}`;
    exec(runCommand, (runError, runStdout, runStderr) => {
      if (runError || runStderr) {
        // If execution fails, return the error
        parentPort.postMessage({ error: { fullError: `Runtime Error: ${runStderr || runError.message}` } });
        return;
      }

      // Return the output of the code execution
      parentPort.postMessage({ output: runStdout || 'No output' });

      // Clean up the temporary files
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(outputFilePath);
    });
  });
}

// Process the incoming code and input from the main thread
runCode(workerData.code, workerData.input);
