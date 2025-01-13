const express = require("express");
const { Worker } = require("worker_threads");
const crypto = require("crypto");
const http = require("http");

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(require("cors")());
app.use(express.json());

app.post("/", (req, res) => {
  const { code, input } = req.body;

  // Validate the input data
  if (!code || !input) {
      return res.status(400).json({
          error: { fullError: "Error: Missing code or input" }
      });
  }

  // Generate a unique hash for the code
  const codeHash = crypto.createHash("md5").update(code).digest("hex");

  // Create a worker thread for compilation
  const worker = new Worker("./compiler-worker.js", {
      workerData: { code, input },  // Ensure the code and input are passed correctly
  });

  worker.on("message", (result) => {
      res.json(result);
  });

  worker.on("error", (err) => {
      res.status(500).json({
          error: { fullError: `Worker error: ${err.message}` }
      });
  });

  worker.on("exit", (code) => {
      if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
      }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "Server is running" });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
