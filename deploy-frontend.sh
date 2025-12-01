#!/bin/bash

# Deploy Frontend Script
echo "Starting frontend deployment..."

# Navigate to frontend directory
cd ~/inventory/frontend

# Build the production version
echo "Building production bundle..."
npm run build

# Create web directory if it doesn't exist
echo "Setting up web directory..."
sudo mkdir -p /var/www/inventory.works

# Remove old build
echo "Removing old build..."
sudo rm -rf /var/www/inventory.works/build

# Copy new build
echo "Copying new build..."
sudo cp -r build /var/www/inventory.works/

# Set proper permissions
echo "Setting permissions..."
sudo chown -R www-data:www-data /var/www/inventory.works
sudo chmod -R 755 /var/www/inventory.works

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Deployment complete!"
echo "Visit https://www.inventory.works to see your site"
