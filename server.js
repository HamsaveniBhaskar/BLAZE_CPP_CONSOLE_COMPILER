const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const app = express();
const port = 8080;

app.use(bodyParser.json());

// Simulate interactive input processing for C++ code
app.post('/', (req, res) => {
    const { code, input } = req.body;

    // Step 1: Write code to a temp file
    const fs = require('fs');
    const tempFilePath = '/tmp/code.cpp';
    const inputFilePath = '/tmp/input.txt';

    fs.writeFileSync(tempFilePath, code);
    fs.writeFileSync(inputFilePath, input); // Store the input for simulation

    // Step 2: Compile and run the C++ code, pass input interactively
    exec(`g++ ${tempFilePath} -o /tmp/program && /tmp/program < ${inputFilePath}`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send({ error: { fullError: stderr || error.message } });
        }

        // Step 3: Return the output to the client
        res.json({
            output: stdout,
            error: null
        });
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
