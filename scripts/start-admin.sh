#!/bin/bash

# Script to copy the appropriate .env file and start the server using PM2

# Function to display usage information
usage() {
  echo "Usage: $0 [dev|prod]"
  echo "  dev  - Copy .env.development to .env and start server in development mode"
  echo "  prod - Copy .env.production to .env and start server in production mode"
  exit 1
}

# Check if environment argument is provided
if [ $# -ne 1 ]; then
  usage
fi

ENV=$1

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(dirname "$SCRIPT_DIR")
cd "$PROJECT_ROOT" || exit 1

echo "🔍 Starting in $ENV mode..."
echo "📂 Project root: $PROJECT_ROOT"

# Copy the appropriate .env file
if [ "$ENV" = "dev" ]; then
  echo "📄 Copying .env.development to .env..."
  if [ -f .env.development ]; then
    cp .env.development .env
    echo "✅ Environment file copied successfully."
  else
    echo "❌ Error: .env.development file not found!"
    exit 1
  fi
  
  echo "🚀 Starting server in development mode..."
  yarn pm2:dev
  
elif [ "$ENV" = "prod" ]; then
  echo "📄 Copying .env.production to .env..."
  if [ -f .env.production ]; then
    cp .env.production .env
    echo "✅ Environment file copied successfully."
  else
    echo "❌ Error: .env.production file not found!"
    exit 1
  fi
  
  echo "🚀 Starting server in production mode..."
  yarn pm2:prod
  
else
  echo "❌ Invalid environment: $ENV"
  usage
fi

echo "✨ Server startup process initiated. Check PM2 logs for details."