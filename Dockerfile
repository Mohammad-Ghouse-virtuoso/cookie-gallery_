# Use a Node.js base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application's code
COPY . .

# Build the production version
RUN npm run build

# Expose the port your application runs on
EXPOSE 5173

# Define the command to run your application
CMD ["npm", "run", "dev"]
