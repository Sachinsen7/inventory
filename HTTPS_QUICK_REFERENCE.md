# HTTPS Enforcement - Quick Reference

## Summary

✅ **HTTPS Enforcement has been fully implemented and is production-ready.**

---

## Key Features Implemented

| Feature | Status | Details |
|---------|--------|---------|
| HTTP→HTTPS Redirect | ✅ | 301 permanent redirect in production |
| HSTS Headers | ✅ | 2-year max-age, preload-eligible |
| Content Security Policy | ✅ | Prevents XSS and data injection |
| Secure Cookies | ✅ | Secure, HttpOnly, SameSite=Strict (prod only) |
| Additional Headers | ✅ | X-Frame-Options, X-Content-Type, Referrer-Policy |

---

## Quick Start (Development)

```bash
cd backend
NODE_ENV=development npm run dev
# Server runs on http://localhost:5000
# HSTS disabled, secure cookies disabled
```

**Expected Output:**
```
[timestamp] INFO: Server running at http://localhost:5000 { 
  port: '5000', 
  env: 'development', 
  https: false 
}
```

---

## Production Deployment Steps

1. **Obtain SSL/TLS Certificate**
   ```bash
   # Using Let's Encrypt (recommended)
   sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
   ```

2. **Configure Reverse Proxy (nginx)**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name yourdomain.com;
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       ssl_protocols TLSv1.2 TLSv1.3;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   
   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   ```

3. **Configure Environment Variables**
   ```bash
   # .env (production)
   NODE_ENV=production
   SERVER_HOST=api.yourdomain.com
   BACKEND_URL=https://yourdomain.com/api
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   PORT=5000  # backend runs behind reverse proxy
   ```

4. **Deploy and Test**
   ```bash
   # Test HTTP redirect
   curl -I http://yourdomain.com/api/godowns
   # Expected: 301 redirect to https://...
   
   # Test HSTS header
   curl -I https://yourdomain.com/api/godowns
   # Expected: Strict-Transport-Security: max-age=63072000; ...
   ```

---

## Environment Variables

### Development
```dotenv
NODE_ENV=development
BACKEND_URL=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

### Production
```dotenv
NODE_ENV=production
SERVER_HOST=api.yourdomain.com
BACKEND_URL=https://yourdomain.com/api
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Security Headers Set Automatically

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
Referrer-Policy: strict-origin-when-cross-origin
```

**In Production Only:**
```
Set-Cookie: <name>=<value>; Secure; HttpOnly; SameSite=Strict
```

---

## Testing

### Local Testing
```bash
# Development mode
NODE_ENV=development npm run dev

# Production mode (simulated)
NODE_ENV=production SERVER_HOST=yourdomain.com npm run dev
```

### Online Testing
- **SSL Labs:** https://www.ssllabs.com/ssltest/
- **Security Headers:** https://securityheaders.com/
- **Mozilla Observatory:** https://observatory.mozilla.org/

### Command Line Testing
```bash
# Test HSTS
curl -I https://yourdomain.com/api | grep Strict-Transport

# Test CSP
curl -I https://yourdomain.com/api | grep Content-Security

# Test TLS version
openssl s_client -connect yourdomain.com:443 -tls1_2
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/server.js` | HTTP→HTTPS redirect, HSTS, secure cookies |
| `backend/.env.example` | Added HTTPS configuration options |
| `backend/utils/httpsConfig.js` | NEW: HTTPS utilities and deployment guide |
| `HTTPS_IMPLEMENTATION_GUIDE.md` | NEW: Comprehensive deployment guide |
| `HTTPS_IMPLEMENTATION_SUMMARY.md` | NEW: Implementation summary |
| `HTTPS_ENFORCEMENT_CHECKLIST.md` | NEW: Deployment checklist |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `SSL_ERROR_RX_RECORD_TOO_LONG` | HTTP connection to HTTPS port | Check proxy config, enable SSL |
| Mixed content warning | HTTPS page loading HTTP | Use `https://` for API calls |
| Certificate error | Expired/invalid cert | Renew certificate via certbot |
| Too many redirects | Redirect loop | Check X-Forwarded-Proto header |

---

## Monitoring

### Certificate Expiration
```bash
# Check expiration
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 \
  2>/dev/null | openssl x509 -noout -dates

# Auto-renewal (Let's Encrypt)
sudo systemctl enable certbot.timer && sudo systemctl start certbot.timer
```

### HTTPS Availability
- Set up monitoring alerts for:
  - HTTPS port 443 listening
  - Certificate validity
  - HTTP→HTTPS redirect working
  - Security headers present

---

## Integration with Existing Security

HTTPS enforcement works seamlessly with:
- ✅ JWT Authentication (tokens sent over HTTPS)
- ✅ Password Hashing (bcrypt hashes encrypted in transit)
- ✅ Rate Limiting (auth endpoints protected)
- ✅ CORS (HTTPS origins allowed)
- ✅ Input Validation (validators run on HTTPS)
- ✅ File Upload (files encrypted in transit)

---

## Production Checklist

- [ ] Obtain SSL/TLS certificate
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set `NODE_ENV=production`
- [ ] Set `SERVER_HOST=yourdomain.com`
- [ ] Update `ALLOWED_ORIGINS` to `https://`
- [ ] Test HTTP→HTTPS redirect
- [ ] Verify HSTS headers
- [ ] Monitor certificate expiration
- [ ] Enable auto-renewal (certbot)
- [ ] Submit domain to HSTS preload list

---

## Documentation

- **Quick Start:** This file
- **Implementation Details:** `HTTPS_IMPLEMENTATION_SUMMARY.md`
- **Deployment Guide:** `HTTPS_IMPLEMENTATION_GUIDE.md`
- **Checklist:** `HTTPS_ENFORCEMENT_CHECKLIST.md`
- **Utilities:** `backend/utils/httpsConfig.js`
- **Security Overview:** `SECURITY_HARDENING_SUMMARY.md`

---

## Status: ✅ PRODUCTION READY

All HTTPS enforcement features are implemented, tested, and ready for deployment.

**Next Step:** Follow `HTTPS_IMPLEMENTATION_GUIDE.md` for production deployment.
