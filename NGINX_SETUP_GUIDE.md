# Nginx Reverse Proxy Setup Guide for API

This guide will help you set up Nginx as a reverse proxy with SSL for your backend API.

## Prerequisites

- Access to your server (13.53.56.208) via SSH
- Root or sudo privileges
- Domain: `api.inventory.works` pointing to your server IP

## Step 1: DNS Configuration

1. Log in to your domain registrar (where you bought inventory.works)
2. Add an A record:
   - **Name/Host**: `api`
   - **Type**: `A`
   - **Value/Points to**: `13.53.56.208`
   - **TTL**: `3600` (or default)

3. Wait for DNS propagation (5-30 minutes). Test with:
   ```bash
   ping api.inventory.works
   ```

## Step 2: Install Nginx (if not already installed)

SSH into your server and run:

```bash
# Update package list
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

## Step 3: Install Certbot for SSL Certificate

```bash
# Install Certbot and Nginx plugin
sudo apt install certbot python3-certbot-nginx -y
```

## Step 4: Obtain SSL Certificate

```bash
# Get SSL certificate for api.inventory.works
sudo certbot --nginx -d api.inventory.works

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

## Step 5: Deploy Nginx Configuration

1. Copy the `nginx-api-config.conf` file to your server:
   ```bash
   scp nginx-api-config.conf user@13.53.56.208:/tmp/
   ```

2. SSH into your server:
   ```bash
   ssh user@13.53.56.208
   ```

3. Move the config file to Nginx directory:
   ```bash
   sudo mv /tmp/nginx-api-config.conf /etc/nginx/sites-available/api.inventory.works
   ```

4. Create a symbolic link to enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/api.inventory.works /etc/nginx/sites-enabled/
   ```

5. Test Nginx configuration:
   ```bash
   sudo nginx -t
   ```

6. If test is successful, reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

## Step 6: Configure Firewall

```bash
# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'

# Or if using specific ports:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Reload firewall
sudo ufw reload
```

## Step 7: Verify Backend is Running

Make sure your Node.js backend is running on port 5000:

```bash
# Check if backend is running
sudo netstat -tulpn | grep :5000

# Or
sudo lsof -i :5000

# If not running, start your backend
cd /path/to/your/backend
npm start
# or
node server.js
# or
pm2 start server.js
```

## Step 8: Update Frontend Environment

Update your frontend `.env.production` file:

```env
REACT_APP_BACKEND_URL=https://api.inventory.works
```

Then rebuild your frontend:

```bash
cd frontend
npm run build
```

Deploy the new build to your production server.

## Step 9: Test the Setup

1. Test API endpoint:
   ```bash
   curl https://api.inventory.works/api/godowns
   ```

2. Open your browser and visit:
   - `https://www.inventory.works` (your frontend)
   - Check browser console for any errors

## Troubleshooting

### Issue: 502 Bad Gateway
**Solution**: Backend is not running or not accessible
```bash
# Check backend status
sudo systemctl status your-backend-service
# or
pm2 status

# Check backend logs
pm2 logs
# or
sudo journalctl -u your-backend-service -f
```

### Issue: SSL Certificate Error
**Solution**: Certificate not properly installed
```bash
# Renew certificate
sudo certbot renew --dry-run

# Check certificate
sudo certbot certificates
```

### Issue: CORS Errors
**Solution**: Update CORS configuration in your backend (server.js)
```javascript
app.use(cors({
  origin: 'https://www.inventory.works',
  credentials: true
}));
```

### Issue: DNS Not Resolving
**Solution**: Wait for DNS propagation or check DNS settings
```bash
# Check DNS
nslookup api.inventory.works
dig api.inventory.works
```

## Maintenance

### Auto-Renew SSL Certificate

Certbot automatically sets up a cron job for renewal. Verify:

```bash
# Check renewal timer
sudo systemctl status certbot.timer

# Test renewal
sudo certbot renew --dry-run
```

### Monitor Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/api.inventory.works.access.log

# Error logs
sudo tail -f /var/log/nginx/api.inventory.works.error.log
```

### Restart Services

```bash
# Restart Nginx
sudo systemctl restart nginx

# Restart backend (if using pm2)
pm2 restart all

# Restart backend (if using systemd)
sudo systemctl restart your-backend-service
```

## Security Best Practices

1. **Keep SSL certificates updated** - Certbot handles this automatically
2. **Monitor logs regularly** - Check for suspicious activity
3. **Update Nginx regularly** - `sudo apt update && sudo apt upgrade nginx`
4. **Use strong SSL configuration** - Already included in the config
5. **Enable firewall** - Only allow necessary ports
6. **Regular backups** - Backup your Nginx configs and SSL certificates

## Summary

After completing these steps:
- ✅ Your API will be accessible at `https://api.inventory.works`
- ✅ SSL/TLS encryption enabled
- ✅ No more mixed content errors
- ✅ Secure communication between frontend and backend
- ✅ Auto-renewing SSL certificates

## Need Help?

If you encounter issues:
1. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
2. Check backend logs: `pm2 logs` or `sudo journalctl -u your-service`
3. Verify DNS: `nslookup api.inventory.works`
4. Test Nginx config: `sudo nginx -t`
