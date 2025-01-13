function runCode() {
  const loader = document.getElementById("loader");
  const runner = document.getElementById("run");

  runner.style.display = "none";
  loader.style.display = "inline-block";

  const code = editor.getValue();
  const input = document.getElementById("input").value;

  const outputDiv = document.getElementById("output");
  outputDiv.textContent = "Executing..."; // Placeholder text

  const ioTabButton = document.querySelector(".tab-left .tab-btn:nth-child(2)");
  activateTab(ioTabButton);
  showIO();

  const startTime = Date.now(); // Record the start time
  const timeoutDuration = 30000; // Timeout duration for the request

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request Timeout")), timeoutDuration));

  const fetchPromise = fetch("https://blaze-cpp-compiler.onrender.com", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({
          code,
          input,
      }),
  })
  .then((response) => {
      if (!response.ok) {
          throw new Error(`Server Error: ${response.statusText}`);
      }
      return response.json();
  });

  Promise.race([fetchPromise, timeoutPromise])
      .then((data) => {
          const endTime = Date.now(); // Record the end time
          const timeTaken = ((endTime - startTime) / 1000).toFixed(2); // Time in seconds

          if (data.error) {
              // Handle errors (compilation or runtime)
              outputDiv.textContent = data.error.fullError || "No output received!";
          } else {
              // Handle successful execution
              outputDiv.textContent = data.output || "No output received!";
          }

          // Add success message and time taken
          setTimeout(() => {
              outputDiv.textContent += `\n\n===Code executed successfully===\nTimeTaken: ${timeTaken} seconds`;
          }, 100);

          loader.style.display = "none";
          runner.style.display = "flex";
      })
      .catch((error) => {
          console.error("Error occurred:", error);
          outputDiv.textContent = `Error running code: ${error.message}`;

          loader.style.display = "none";
          runner.style.display = "flex";
      });
}
