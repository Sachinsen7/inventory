#!/bin/bash

# Option B Setup Script - API Proxy on Main Domain
# This script helps you set up the API proxy on www.inventory.works

echo "========================================="
echo "Option B: API Proxy Setup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Find current Nginx config
echo -e "${YELLOW}Step 1: Finding Nginx configuration...${NC}"
echo "Current Nginx sites:"
ls -la /etc/nginx/sites-enabled/
echo ""

# Step 2: Backup
echo -e "${YELLOW}Step 2: Creating backup...${NC}"
if [ -f /etc/nginx/sites-available/default ]; then
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Backup created${NC}"
else
    echo -e "${YELLOW}! No default config found, checking for other configs...${NC}"
fi
echo ""

# Step 3: Show what needs to be added
echo -e "${YELLOW}Step 3: Configuration to add${NC}"
echo "Add this to your Nginx server block:"
echo ""
echo "----------------------------------------"
cat << 'EOF'
    # API Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend root endpoints
    location ~ ^/(loginadmin|saved|barcodes)$ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
EOF
echo "----------------------------------------"
echo ""

# Step 4: Ask user to edit config
echo -e "${YELLOW}Step 4: Edit Nginx configuration${NC}"
echo "Which config file do you want to edit?"
echo "1) /etc/nginx/sites-available/default"
echo "2) /etc/nginx/sites-available/inventory.works"
echo "3) Other (specify)"
echo "4) Skip (I'll do it manually)"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        sudo nano /etc/nginx/sites-available/default
        ;;
    2)
        sudo nano /etc/nginx/sites-available/inventory.works
        ;;
    3)
        read -p "Enter config file path: " custom_path
        sudo nano "$custom_path"
        ;;
    4)
        echo "Skipping..."
        ;;
esac
echo ""

# Step 5: Test Nginx
echo -e "${YELLOW}Step 5: Testing Nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    
    # Reload Nginx
    echo -e "${YELLOW}Reloading Nginx...${NC}"
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    echo "Please fix the errors and run: sudo nginx -t"
    exit 1
fi
echo ""

# Step 6: Check backend
echo -e "${YELLOW}Step 6: Checking backend status...${NC}"
if sudo lsof -i :5000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port 5000${NC}"
else
    echo -e "${RED}✗ Backend is NOT running${NC}"
    echo "Start your backend with:"
    echo "  cd ~/inventory/backend"
    echo "  pm2 start server.js --name inventory-backend"
fi
echo ""

# Step 7: Rebuild frontend
echo -e "${YELLOW}Step 7: Rebuild frontend?${NC}"
read -p "Do you want to rebuild the frontend now? (y/n): " rebuild

if [ "$rebuild" = "y" ] || [ "$rebuild" = "Y" ]; then
    echo "Rebuilding frontend..."
    cd ~/inventory/frontend
    npm run build
    echo -e "${GREEN}✓ Frontend rebuilt${NC}"
    echo ""
    echo "Don't forget to copy the build to your web server location!"
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Test API: curl https://www.inventory.works/api/godowns"
echo "2. Open browser: https://www.inventory.works"
echo "3. Check console for errors"
echo ""
echo "Troubleshooting:"
echo "- Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Backend logs: pm2 logs"
echo "- Test config: sudo nginx -t"
echo ""
