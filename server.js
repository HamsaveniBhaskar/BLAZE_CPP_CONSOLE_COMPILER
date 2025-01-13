const express = require('express');
const WebSocket = require('ws');
const { Worker } = require('worker_threads');
const app = express();
const port = 3000;

// Set up WebSocket server
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    // Handle incoming message (code to be compiled and run)
    console.log(`Received message: ${message}`);

    // Create a worker thread for compilation and execution
    const worker = new Worker('./compiler-worker.js', {
      workerData: { code: message, input: '' }, // Passing input as an empty string
    });

    worker.on('message', (result) => {
      // Send output back to the client via WebSocket
      if (result.output) {
        ws.send(result.output);  // Send back the program output
      }

      if (result.error) {
        ws.send(result.error.fullError);  // Send back the error message
      }
    });

    worker.on('error', (err) => {
      ws.send(`Error: ${err.message}`);
    });
  });
});

// HTTP server for handling other requests (if necessary)
const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
