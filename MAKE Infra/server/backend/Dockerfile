FROM node:18

# Set working directory
WORKDIR /backend

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy all backend files (adjust as needed)
COPY . .

# Copy and set up the startup script
COPY start.sh /backend/start.sh
RUN chmod +x /backend/start.sh

# Expose the backend port
EXPOSE 3000

RUN apt-get update && apt-get install -y netcat-openbsd

# Set the entrypoint to your startup script
ENTRYPOINT ["/backend/start.sh"]
