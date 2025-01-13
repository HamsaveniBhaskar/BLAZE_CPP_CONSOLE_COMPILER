# Use the official Node.js image as the base
FROM node:16

RUN apt-get update && apt-get install -y clang build-essential libc++-dev libc++abi-dev


# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json into the container
COPY package.json package-lock.json ./

# Install dependencies using npm
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
