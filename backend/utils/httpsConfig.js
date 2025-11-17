/**
 * HTTPS Configuration and TLS/SSL Utility
 * Provides guidance and configuration for HTTPS enforcement, HSTS headers, and secure cookies
 */

const logger = require('./logger');

/**
 * Get helmet options for HTTPS/TLS hardening
 * Includes HSTS, CSP, and other security headers
 * @returns {object} helmet configuration object
 */
function getHelmetOptions() {
  return {
    hsts: {
      maxAge: 63072000, // 2 years in seconds (recommended for production)
      includeSubDomains: true, // apply to subdomains
      preload: true // allow inclusion in HSTS preload list at https://hstspreload.org
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"], // restrict API calls to same origin
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    frameguard: { action: 'deny' }, // prevent clickjacking
    noSniff: true, // prevent MIME sniffing
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' } // control referrer info
  };
}

/**
 * Middleware to redirect HTTP to HTTPS in production
 * Detects HTTPS via:
 * - req.secure (direct HTTPS connection)
 * - X-Forwarded-Proto header (reverse proxy like nginx, Azure App Service)
 * @returns {function} Express middleware
 */
function httpsRedirectMiddleware() {
  return (req, res, next) => {
    // Skip redirect in development or if already HTTPS
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    // Check if connection is not HTTPS
    if (req.header('x-forwarded-proto') !== 'https' && !req.secure) {
      logger.warn('HTTP request received in production; redirecting to HTTPS', {
        url: req.originalUrl,
        ip: req.ip,
        proto: req.header('x-forwarded-proto'),
        secure: req.secure
      });
      return res.redirect(301, `https://${req.header('host')}${req.originalUrl}`);
    }
    next();
  };
}

/**
 * Middleware to enforce secure cookie flags in production
 * Sets Secure, HttpOnly, and SameSite flags on all cookies
 * @returns {function} Express middleware
 */
function secureCookieMiddleware() {
  return (req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    // Override res.cookie to enforce secure flags
    const originalCookie = res.cookie;
    res.cookie = function (name, val, options) {
      if (!options) options = {};
      
      // Enforce secure cookie flags for production
      options.secure = true; // only send over HTTPS
      options.httpOnly = true; // prevent JavaScript from accessing cookie
      options.sameSite = 'Strict'; // prevent CSRF attacks (or 'Lax' if needed for cross-site)
      
      logger.debug('Setting secure cookie', { 
        name, 
        secure: options.secure, 
        httpOnly: options.httpOnly,
        sameSite: options.sameSite 
      });
      
      return originalCookie.call(this, name, val, options);
    };
    next();
  };
}

/**
 * Log HTTPS configuration status at startup
 */
function logHttpsStatus() {
  const env = process.env.NODE_ENV || 'development';
  const protocol = env === 'production' ? 'HTTPS (enforced)' : 'HTTP (allowed in dev)';
  const hstsEnabled = env === 'production';
  const secureCookies = env === 'production';
  
  logger.info('HTTPS Configuration Status', {
    nodeEnv: env,
    protocol,
    hstsEnabled,
    secureCookies,
    httpRedirect: env === 'production',
    serverHost: process.env.SERVER_HOST || 'not configured',
    message: env === 'production' 
      ? 'Production mode: HTTPS enforced, HSTS enabled, secure cookies configured'
      : 'Development mode: HTTP allowed, HSTS disabled, secure cookies disabled'
  });
}

/**
 * HTTPS Deployment Checklist and Configuration Guide
 */
const deploymentGuide = `
# HTTPS Deployment Checklist

## Prerequisites
1. ✓ Obtain SSL/TLS certificate from a trusted CA (Let's Encrypt, DigiCert, AWS ACM, Azure Key Vault, etc.)
2. ✓ Configure reverse proxy (nginx, Apache) or load balancer with SSL/TLS termination
3. ✓ Ensure domain DNS records point to your server

## Server Configuration (Node.js + Reverse Proxy)

### Option A: Reverse Proxy with HTTPS Termination (Recommended for Production)
- Reverse proxy (nginx) handles HTTPS/TLS on port 443
- Node.js backend runs on port 5000 (HTTP) behind proxy
- Proxy sets X-Forwarded-Proto: https header
- Backend detects HTTPS via X-Forwarded-Proto and enforces redirect

Example nginx configuration:
\`\`\`nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL/TLS certificates (e.g., from Let's Encrypt, AWS ACM)
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # SSL/TLS hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS header (also set by helmet in Node.js app)
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://backend;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
\`\`\`

### Option B: Direct HTTPS in Node.js (Advanced, requires cert management)
- Node.js handles HTTPS on port 443 directly (requires root/admin)
- Use express or native https module
- Requires SSL/TLS certificate file paths in backend

Example Node.js setup:
\`\`\`javascript
const https = require('https');
const fs = require('fs');
const app = require('./app');

const options = {
  key: fs.readFileSync('/path/to/private.key'),
  cert: fs.readFileSync('/path/to/certificate.crt')
};

https.createServer(options, app).listen(443, () => {
  logger.info('HTTPS server running on port 443');
});
\`\`\`

## Environment Configuration

### Development (.env)
\`\`\`
NODE_ENV=development
BACKEND_URL=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
PORT=5000
\`\`\`

### Production (.env)
\`\`\`
NODE_ENV=production
BACKEND_URL=https://yourdomain.com/api
SERVER_HOST=yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PORT=5000  # backend runs on 5000 behind reverse proxy listening on 443
\`\`\`

## Frontend Configuration

### Update API URLs to use HTTPS
- React/frontend should call API via HTTPS in production
- Use environment-based API URL

Example frontend .env:
\`\`\`
REACT_APP_API_URL=https://yourdomain.com/api
\`\`\`

## Testing HTTPS

### Test HTTP Redirect (production)
\`\`\`bash
curl -I http://yourdomain.com/api/godowns
# Should return 301 redirect to https://yourdomain.com/api/godowns
\`\`\`

### Test HSTS Header
\`\`\`bash
curl -I https://yourdomain.com/api/godowns
# Should include:
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
\`\`\`

### Test Security Headers
\`\`\`bash
curl -I https://yourdomain.com/api/godowns
# Should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: default-src 'self'...
# Referrer-Policy: strict-origin-when-cross-origin
\`\`\`

### Test Secure Cookies (if using cookies)
\`\`\`bash
curl -I https://yourdomain.com/api/godowns
# Response Set-Cookie should include:
# Set-Cookie: <name>=<value>; Secure; HttpOnly; SameSite=Strict
\`\`\`

## HSTS Preload (Optional but Recommended)
1. Ensure HSTS header is set for 1+ year (backend does this)
2. Test at https://hstspreload.org
3. Submit domain to HSTS preload list
4. Browsers will automatically redirect HTTP to HTTPS for your domain

## Certificate Renewal

### Let's Encrypt (Auto-renewal via certbot)
\`\`\`bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Manual renewal check
sudo certbot renew --dry-run
\`\`\`

### AWS ACM or Azure Key Vault
- Managed SSL/TLS certificates
- Auto-renewal handled by provider
- Certificates used by reverse proxy

## Monitoring

### Check Certificate Expiration
\`\`\`bash
# via OpenSSL
openssl x509 -in certificate.crt -noout -dates

# via curl
curl -vI https://yourdomain.com 2>&1 | grep "expire date"
\`\`\`

### Monitor HTTPS Availability
- Use monitoring tools like Uptime Robot, New Relic, or Datadog
- Alert on HTTPS downtime or certificate expiration
- Test both HTTP->HTTPS redirect and HTTPS availability

## Security Best Practices

1. **Always redirect HTTP to HTTPS** (done automatically in production mode)
2. **Use TLS 1.2 or higher** (configure in reverse proxy)
3. **Enable HSTS** (helmet sets max-age=2 years)
4. **Set secure cookie flags** (automatic in production)
5. **Use strong cipher suites** (configure in reverse proxy)
6. **Monitor certificate expiration** (set alerts 30 days before expiry)
7. **Keep dependencies updated** (run npm audit regularly)
8. **Test SSL/TLS configuration** (use testssl.sh or Mozilla Observatory)
`;

module.exports = {
  getHelmetOptions,
  httpsRedirectMiddleware,
  secureCookieMiddleware,
  logHttpsStatus,
  deploymentGuide
};
