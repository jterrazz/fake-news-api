FROM node:20.12-alpine

WORKDIR /data

RUN apk add --no-cache --upgrade make bash curl

# Create directory for SQLite database with proper permissions
RUN mkdir -p /data/db && chown -R node:node /data/db

# Step 1: Install Dependencies Only (used for cache)
COPY package*.json ./
RUN npm ci

# Step 2: Copy Application Files
COPY . .

# Build the application
RUN npm run build

# Set proper permissions
RUN chown -R node:node /home

# Switch to non-root user
USER node

# Create volume for SQLite database
VOLUME ["/data/database"]

# Expose port (optional, good practice)
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["npm", "start"]
