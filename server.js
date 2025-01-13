const express = require("express");
const { Worker } = require("worker_threads");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const port = 3000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Cache for compiled results
const cache = new Map();
const CACHE_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 100;

// Cache cleanup logic
function cleanCache() {
  const now = Date.now();
  for (const [key, { timestamp }] of cache.entries()) {
    if (now - timestamp > CACHE_EXPIRATION_TIME) {
      cache.delete(key);
    }
  }
}

// Cache management
function manageCache(codeHash, output) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = [...cache.keys()][0];
    cache.delete(oldestKey);
  }
  cache.set(codeHash, { result: output, timestamp: Date.now() });
}

// POST endpoint for code compilation and interactive execution
app.post("/", (req, res) => {
  const { code } = req.body;

  // Validate input
  if (!code) {
    return res.status(400).json({ error: { fullError: "Error: No code provided!" } });
  }

  // Generate a unique hash for the code
  const codeHash = crypto.createHash("md5").update(code).digest("hex");

  // Check cache for existing results
  if (cache.has(codeHash)) {
    return res.json({ output: cache.get(codeHash).result });
  }

  // Create a new worker for the task
  const worker = new Worker("./compiler-worker.js", {
    workerData: { code },
  });

  // Stream output to the client
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Transfer-Encoding", "chunked");

  // Handle worker messages
  worker.on("message", (message) => {
    if (message.output) {
      res.write(message.output); // Stream output to the frontend
    } else if (message.error) {
      res.write(`Error: ${message.error.fullError}`);
    }
  });

  // Handle worker errors
  worker.on("error", (err) => {
    res.write(`Worker error: ${err.message}`);
    res.end();
  });

  // Handle worker exit
  worker.on("exit", (code) => {
    if (code !== 0) {
      res.write(`Worker stopped with exit code ${code}`);
    }
    res.end(); // End the response when the worker finishes
  });

  // Listen for input from the frontend
  req.on("data", (chunk) => {
    const input = chunk.toString();
    worker.postMessage(input); // Send input to the worker
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Periodic health check ping
setInterval(() => {
  console.log("Health check ping");
}, 10 * 60 * 1000); // Every 10 minutes

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
