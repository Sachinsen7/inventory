# Quick Setup Checklist

## ✅ Pre-Setup
- [ ] Access to server (13.53.56.208) via SSH
- [ ] Access to domain DNS settings
- [ ] Backend running on port 5000

## ✅ DNS Configuration (5-30 minutes)
```bash
# Add A record in your domain registrar:
Name: api
Type: A
Value: 13.53.56.208
TTL: 3600
```

## ✅ Server Setup Commands

```bash
# 1. Install Nginx
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 2. Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# 3. Get SSL Certificate (after DNS propagates)
sudo certbot --nginx -d api.inventory.works

# 4. Upload and configure Nginx
scp nginx-api-config.conf user@13.53.56.208:/tmp/
ssh user@13.53.56.208
sudo mv /tmp/nginx-api-config.conf /etc/nginx/sites-available/api.inventory.works
sudo ln -s /etc/nginx/sites-available/api.inventory.works /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 5. Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw reload
```

## ✅ Frontend Update

```bash
# Update .env.production (already done)
# REACT_APP_BACKEND_URL=https://api.inventory.works

# Rebuild frontend
cd frontend
npm run build

# Deploy to production
# (copy build folder to your web server)
```

## ✅ Testing

```bash
# Test API
curl https://api.inventory.works/api/godowns

# Test in browser
# Visit: https://www.inventory.works
# Check console for errors
```

## ✅ Verification

- [ ] DNS resolves: `ping api.inventory.works`
- [ ] SSL certificate valid: Visit `https://api.inventory.works` in browser
- [ ] Backend accessible: `curl https://api.inventory.works/api/godowns`
- [ ] Frontend works: No mixed content errors in console
- [ ] Login/signup works
- [ ] All API calls successful

## 🚨 Common Issues

**502 Bad Gateway** → Backend not running
```bash
pm2 status
pm2 restart all
```

**SSL Error** → Certificate issue
```bash
sudo certbot certificates
sudo certbot renew
```

**CORS Error** → Update backend CORS settings
```javascript
// In server.js
app.use(cors({
  origin: 'https://www.inventory.works',
  credentials: true
}));
```

## 📞 Support

If stuck, check:
1. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
2. Backend logs: `pm2 logs`
3. DNS: `nslookup api.inventory.works`
