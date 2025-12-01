# Option B: API Proxy Setup (Using Main Domain)

This setup uses `https://www.inventory.works/api` for your backend API, eliminating the need for a separate subdomain.

## ✅ Advantages
- No DNS configuration needed
- Works immediately
- Uses existing SSL certificate
- No mixed content errors
- Single domain for everything

## 📋 Setup Steps

### Step 1: Find Your Current Nginx Configuration

```bash
# Check which config file is being used for www.inventory.works
ls -la /etc/nginx/sites-enabled/

# Common locations:
# - /etc/nginx/sites-available/default
# - /etc/nginx/sites-available/inventory.works
# - /etc/nginx/sites-available/www.inventory.works
```

### Step 2: Backup Current Configuration

```bash
# Backup your current config (replace 'default' with your actual config name)
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Or if it's named differently:
sudo cp /etc/nginx/sites-available/inventory.works /etc/nginx/sites-available/inventory.works.backup
```

### Step 3: Update Nginx Configuration

**Option A: Replace entire config (if you want to use the new one)**

```bash
# Copy the new configuration
sudo cp ~/inventory/nginx-main-site-with-api.conf /etc/nginx/sites-available/inventory.works

# Update the root path in the config to match your actual build location
sudo nano /etc/nginx/sites-available/inventory.works
# Change this line: root /var/www/inventory.works/build;
# To your actual path, for example: root /home/ubuntu/inventory/frontend/build;
```

**Option B: Add API proxy to existing config (recommended)**

Add this block to your existing Nginx configuration:

```bash
# Edit your current config
sudo nano /etc/nginx/sites-available/default
# (or whatever your config file is named)
```

Add this inside the `server` block (after `server_name` line):

```nginx
    # API Proxy - Forward /api requests to backend
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Backend root endpoints (for endpoints not under /api)
    location ~ ^/(loginadmin|saved|barcodes)$ {
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
```

### Step 4: Test and Reload Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

### Step 5: Verify Backend is Running

```bash
# Check if backend is running on port 5000
sudo netstat -tulpn | grep :5000

# Or
sudo lsof -i :5000

# If not running, start it
cd ~/inventory/backend
pm2 start server.js --name inventory-backend

# Or without pm2:
# node server.js &
```

### Step 6: Rebuild and Deploy Frontend

```bash
# Rebuild frontend with new API URL
cd ~/inventory/frontend
npm run build

# Copy build to web server location (adjust path as needed)
sudo cp -r build/* /var/www/inventory.works/build/
# Or wherever your Nginx root is pointing to
```

### Step 7: Test the Setup

```bash
# Test API endpoint
curl https://www.inventory.works/api/godowns

# Test login endpoint
curl https://www.inventory.works/loginadmin

# Check Nginx logs
sudo tail -f /var/log/nginx/inventory.works.access.log
sudo tail -f /var/log/nginx/error.log
```

## 🧪 Testing in Browser

1. Open `https://www.inventory.works`
2. Open browser console (F12)
3. Try to login or access any feature
4. Check Network tab - all requests should go to `https://www.inventory.works/api/...`
5. No mixed content errors should appear

## 🔧 Troubleshooting

### Issue: 502 Bad Gateway on /api requests

**Solution**: Backend is not running

```bash
# Check backend
pm2 status
pm2 logs

# Restart backend
pm2 restart inventory-backend

# Or start if not running
cd ~/inventory/backend
pm2 start server.js --name inventory-backend
```

### Issue: 404 Not Found on /api requests

**Solution**: Nginx config not applied correctly

```bash
# Check Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Issue: CORS Errors

**Solution**: Update CORS in backend

Edit `backend/server.js` and ensure CORS allows your domain:

```javascript
const cors = require('cors');

app.use(cors({
  origin: 'https://www.inventory.works',
  credentials: true
}));
```

Then restart backend:
```bash
pm2 restart inventory-backend
```

### Issue: Some endpoints not working

**Solution**: Check if endpoints need to be added to Nginx config

Some endpoints might not be under `/api`. Add them to the regex pattern:

```nginx
location ~ ^/(loginadmin|saved|barcodes|YOUR_ENDPOINT)$ {
    proxy_pass http://localhost:5000;
    # ... rest of proxy config
}
```

## 📝 Summary

After completing these steps:
- ✅ Frontend: `https://www.inventory.works`
- ✅ Backend API: `https://www.inventory.works/api/*`
- ✅ No mixed content errors
- ✅ Single SSL certificate
- ✅ No DNS changes needed

## 🎯 Quick Command Reference

```bash
# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check backend status
pm2 status

# Restart backend
pm2 restart inventory-backend

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# View backend logs
pm2 logs inventory-backend

# Rebuild frontend
cd ~/inventory/frontend && npm run build
```
