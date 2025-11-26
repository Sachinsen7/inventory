#!/bin/bash

echo "🚀 Building and deploying the application..."

# Step 1: Build the frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Step 2: Start the backend (which serves the frontend)
echo "🔧 Starting backend server on port 5000..."
cd backend
npm start
