# HTTPS Enforcement Implementation Guide

## Overview

HTTPS enforcement has been fully implemented in the inventory management system backend. This guide provides comprehensive instructions for both development and production environments.

---

## What Was Implemented

### 1. HTTP to HTTPS Redirect Middleware

**File:** `backend/server.js`

In production mode (`NODE_ENV=production`), all HTTP requests are automatically redirected to HTTPS with a 301 (permanent) redirect:

```javascript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https' && !req.secure) {
      logger.warn('HTTP request received; redirecting to HTTPS', { 
        url: req.originalUrl,
        ip: req.ip 
      });
      return res.redirect(301, `https://${req.header('host')}${req.originalUrl}`);
    }
    next();
  });
}
```

**How it works:**
- Checks `X-Forwarded-Proto` header (set by reverse proxy like nginx)
- Checks `req.secure` property (for direct HTTPS connections)
- If neither indicates HTTPS in production, redirects to `https://<host><url>`
- Logs all redirect attempts for security monitoring

---

### 2. Enhanced HSTS (HTTP Strict-Transport-Security) Headers

**File:** `backend/server.js`

Helmet middleware now includes HSTS configuration that instructs browsers to always use HTTPS:

```javascript
const helmetOptions = {
  hsts: {
    maxAge: 63072000, // 2 years in seconds
    includeSubDomains: true, // apply to subdomains
    preload: true // eligible for HSTS preload list
  }
};
app.use(helmet(helmetOptions));
```

**Security Headers Set:**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

**Benefits:**
- Browsers will automatically upgrade HTTP to HTTPS for 2 years
- Applies to all subdomains
- Domain eligible for inclusion in browser's HSTS preload list
- Prevents SSL stripping attacks

---

### 3. Enhanced Content Security Policy (CSP)

**File:** `backend/server.js`

CSP directives prevent various attacks (XSS, data injection, etc.):

```javascript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'https:'],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: []
  }
}
```

**Security Headers Set:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

---

### 4. Secure Cookie Flags (Production)

**File:** `backend/server.js`

In production, all cookies are automatically set with secure flags:

```javascript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const originalCookie = res.cookie;
    res.cookie = function (name, val, options) {
      if (!options) options = {};
      options.secure = true;      // Only send over HTTPS
      options.httpOnly = true;    // Prevent JavaScript access
      options.sameSite = 'Strict'; // CSRF protection
      return originalCookie.call(this, name, val, options);
    };
    next();
  });
}
```

**Cookie Flags Applied:**
- `Secure` — Cookie only sent over HTTPS connection
- `HttpOnly` — JavaScript cannot access cookie (prevents XSS token theft)
- `SameSite=Strict` — Cookie not sent cross-site (CSRF protection)

---

### 5. Additional Security Headers

**File:** `backend/server.js` (via Helmet)

```
X-Content-Type-Options: nosniff     — Prevent MIME sniffing
X-Frame-Options: DENY              — Prevent clickjacking
Referrer-Policy: strict-origin-when-cross-origin
```

---

### 6. HTTPS Configuration Utility

**File:** `backend/utils/httpsConfig.js` (NEW)

Comprehensive utility module providing:
- `getHelmetOptions()` — Returns helmet configuration
- `httpsRedirectMiddleware()` — HTTP→HTTPS redirect middleware
- `secureCookieMiddleware()` — Secure cookie middleware
- `logHttpsStatus()` — Log HTTPS status at startup
- `deploymentGuide` — Complete deployment instructions

---

### 7. Environment Configuration

**Files:** `backend/.env.example` (UPDATED)

New environment variables:
```
NODE_ENV=development|production
SERVER_HOST=yourdomain.com (for production)
```

**Example Development .env:**
```
NODE_ENV=development
PORT=5000
BACKEND_URL=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
```

**Example Production .env:**
```
NODE_ENV=production
PORT=5000
SERVER_HOST=api.yourdomain.com
BACKEND_URL=https://yourdomain.com/api
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

## Deployment Architecture

### Recommended: Reverse Proxy with TLS Termination

```
User Request (HTTPS)
    ↓
Reverse Proxy (nginx on port 443, TLS/SSL)
    ↓
X-Forwarded-Proto: https header
    ↓
Node.js Backend (port 5000, HTTP)
    ↓
App detects HTTPS via header, enforces policies
    ↓
Response with secure headers, secure cookies
```

### nginx Configuration Example

```nginx
upstream backend {
    server localhost:5000;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL/TLS certificates (Let's Encrypt, DigiCert, AWS ACM)
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # TLS hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    location / {
        proxy_pass http://backend;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Testing HTTPS Implementation

### 1. Test HTTP Redirect (Production)

```bash
# Should return 301 redirect
curl -I http://yourdomain.com/api/godowns
# Expected:
# HTTP/1.1 301 Moved Permanently
# Location: https://yourdomain.com/api/godowns
```

### 2. Test HSTS Header

```bash
# Should include HSTS header
curl -I https://yourdomain.com/api/godowns
# Expected:
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 3. Test Security Headers

```bash
curl -I https://yourdomain.com/api/godowns
# Expected headers:
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'; ...
# Referrer-Policy: strict-origin-when-cross-origin
```

### 4. Test Secure Cookies

```bash
curl -I https://yourdomain.com/api/login
# Expected Set-Cookie headers:
# Set-Cookie: <name>=<value>; Secure; HttpOnly; SameSite=Strict
```

### 5. Test TLS Version

```bash
# Test TLS 1.2/1.3 only
openssl s_client -connect yourdomain.com:443 -tls1_2
openssl s_client -connect yourdomain.com:443 -tls1_3

# Test that older TLS versions are rejected
openssl s_client -connect yourdomain.com:443 -ssl3
# Should fail
```

### 6. Test Using Online Tools

- **SSL Labs:** https://www.ssllabs.com/ssltest/ (enter yourdomain.com)
- **Mozilla Observatory:** https://observatory.mozilla.org/ (enter yourdomain.com)
- **Security Headers:** https://securityheaders.com (enter yourdomain.com)

---

## Certificate Management

### Option 1: Let's Encrypt (Recommended for Production)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Set up auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
```

### Option 2: AWS Certificate Manager (ACM)

1. Request certificate for your domain(s)
2. Validate domain ownership (DNS/email)
3. Use certificate in Application Load Balancer (ALB)
4. Auto-renewal handled by AWS

### Option 3: Azure Key Vault

1. Import or create certificate
2. Store in Key Vault
3. Use in App Service or Application Gateway
4. Auto-renewal available with renewal notifications

---

## Monitoring & Alerts

### Certificate Expiration

```bash
# Check expiration date
openssl x509 -in certificate.crt -noout -dates

# Check via curl
curl -vI https://yourdomain.com 2>&1 | grep "expire date"

# Via openssl
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### HTTPS Availability

Set up monitoring for:
1. HTTP→HTTPS redirect (should return 301)
2. HTTPS availability (port 443 listening)
3. Certificate validity (not expired, not revoked)
4. TLS version support (TLS 1.2+ required)
5. Security header presence (HSTS, CSP, etc.)

**Recommended Tools:**
- Uptime Robot (free tier available)
- New Relic APM
- Datadog
- CloudFlare

---

## Troubleshooting

### Issue: "SSL_ERROR_RX_RECORD_TOO_LONG"

**Cause:** Connecting to HTTPS endpoint with HTTP protocol
**Solution:** Ensure reverse proxy is configured correctly and backend receives `X-Forwarded-Proto: https` header

### Issue: "Too many redirects"

**Cause:** HTTP→HTTPS redirect loop
**Solution:** Check reverse proxy configuration; ensure `X-Forwarded-Proto` header is set correctly

### Issue: "Mixed Content" warning in browser

**Cause:** HTTPS page loading HTTP resources
**Solution:** Update frontend to use `https://` for all API calls; use CSP `upgrade-insecure-requests` directive

### Issue: Certificate validation error

**Cause:** Self-signed certificate or invalid certificate chain
**Solution:** Use valid certificate from trusted CA; don't bypass certificate validation in production

---

## Security Best Practices

1. ✅ **Always redirect HTTP to HTTPS** (implemented)
2. ✅ **Use TLS 1.2 or higher** (configure in reverse proxy)
3. ✅ **Enable HSTS** (2-year max-age set)
4. ✅ **Set secure cookie flags** (Secure, HttpOnly, SameSite)
5. ✅ **Use strong ciphers** (configure in reverse proxy)
6. ✅ **Monitor certificate expiration** (set 30-day alert)
7. ✅ **Keep dependencies updated** (run `npm audit` regularly)
8. ✅ **Test SSL/TLS configuration** (use testssl.sh or SSL Labs)

---

## Migration Checklist (HTTP → HTTPS)

- [ ] Obtain SSL/TLS certificate
- [ ] Set up reverse proxy (nginx, Apache, etc.)
- [ ] Configure reverse proxy with certificate and TLS 1.2+
- [ ] Test HTTP→HTTPS redirect locally
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Set `SERVER_HOST` to your domain
- [ ] Update `ALLOWED_ORIGINS` to use `https://`
- [ ] Deploy to production
- [ ] Test HSTS header presence
- [ ] Test secure cookie flags
- [ ] Monitor certificate expiration
- [ ] Submit domain to HSTS preload list (optional)
- [ ] Verify in browser devtools (Security tab)

---

## Files Modified/Created

| File | Changes |
|------|---------|
| `backend/server.js` | Added HTTPS redirect, HSTS config, secure cookies, enhanced logging |
| `backend/utils/httpsConfig.js` | NEW: HTTPS utility functions and deployment guide |
| `backend/.env.example` | Added NODE_ENV, SERVER_HOST, HTTPS configuration guidance |
| `SECURITY_HARDENING_SUMMARY.md` | Updated with HTTPS section (item #10) |

---

## References

- [OWASP: Transport Layer Protection](https://owasp.org/www-community/controls/Transport_Layer_Protection_Cheat_Sheet)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [HTTP Strict-Transport-Security (HSTS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [NIST Guidelines on TLS](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-52r2.pdf)

---

## Support

For issues or questions regarding HTTPS implementation, refer to:
1. `backend/utils/httpsConfig.js` — Deployment guide section
2. `SECURITY_HARDENING_SUMMARY.md` — Complete security overview
3. `SECURITY_ROTATION.md` — Secrets management guide
