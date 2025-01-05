const { parentPort, workerData } = require("worker_threads");

try {
    const { code } = workerData;

    // Example HTML page to be displayed in the iframe
    const htmlPage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Compiled Output</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f0f0f0;
                    color: #333;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                h1 {
                    color: #007BFF;
                }
                p {
                    font-size: 1.2rem;
                }
            </style>
        </head>
        <body>
            <div>
                <h1>HTML Compilation Result</h1>
                <p>This is a predefined HTML page shown in the iframe.</p>
                <p>Your input HTML:</p>
                <pre>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
            </div>
        </body>
        </html>
    `;

    parentPort.postMessage({ output: htmlPage });
} catch (err) {
    console.error("Error in worker:", err.message);
    parentPort.postMessage({ error: `Worker Error: ${err.message}` });
}
