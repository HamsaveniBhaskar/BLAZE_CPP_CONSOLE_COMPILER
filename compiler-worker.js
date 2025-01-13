// Inside compiler-worker.js
self.onmessage = function (e) {
    const { code, input } = e.data;

    // Simulate a process to handle compiling and running of code
    fetch("https://blaze-cpp-compiler.onrender.com", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            code: code,
            input: input
        })
    })
    .then(response => response.json())
    .then(data => {
        postMessage({
            output: data.output || 'No output',
            error: data.error
        });
    })
    .catch(err => {
        postMessage({ error: err.message });
    });
};
