# Let's Encrypt SSL Setup with Certbot

This guide shows how to install and configure free SSL certificates using Let's Encrypt and Certbot on Ubuntu.

Reference: [InMotion Hosting - Let's Encrypt SSL on Ubuntu](https://www.inmotionhosting.com/support/website/ssl/lets-encrypt-ssl-ubuntu-with-certbot/)

## Prerequisites

- Ubuntu 20.04 or later
- Domain name pointing to your EC2 instance (54.165.218.113)
- Nginx installed and configured
- Ports 80 and 443 open in firewall and AWS Security Groups

## Step 1: Install Certbot

### Option A: Install with Apt (Recommended)

```bash
# Update package index
sudo apt update

# Install Certbot for Nginx
sudo apt-get install certbot python3-certbot-nginx
```

### Option B: Install with PIP (Alternative)

If apt installation doesn't work:

```bash
# Install dependencies
sudo apt install python3 python3-venv libaugeas0

# Set up virtual environment
sudo python3 -m venv /opt/certbot/
sudo /opt/certbot/bin/pip install --upgrade pip

# Install Certbot
sudo /opt/certbot/bin/pip install certbot certbot-nginx

# Create symlink
sudo ln -s /opt/certbot/bin/certbot /usr/bin/certbot
```

### Option C: Install with snapd (For Dedicated Servers)

```bash
# Install snapd
sudo apt install snapd

# Ensure latest version
sudo snap install core; sudo snap refresh core

# Install Certbot
sudo snap install --classic certbot

# Create symlink
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

## Step 2: Verify Nginx Configuration

Before running Certbot, ensure your Nginx configuration is correct:

```bash
# Test Nginx configuration
sudo nginx -t

# If there are errors, fix them first
```

## Step 3: Obtain SSL Certificate

### Option A: Automatic Configuration (Recommended)

Certbot will automatically configure Nginx and set up HTTPS redirects:

```bash
# For a specific domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Or for all domains in Nginx config
sudo certbot --nginx
```

**During setup, you'll be asked:**
1. Email address for renewal and security notices
2. Agree to terms of service
3. Whether to receive emails from EFF (optional)
4. Redirect HTTP to HTTPS: Choose **2** (recommended) to redirect all HTTP traffic to HTTPS

### Option B: Certificate Only (Manual Configuration)

If you want to configure SSL manually:

```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

Then manually update your Nginx configuration.

## Step 4: Verify SSL Installation

### Test SSL Certificate

```bash
# Check certificate status
sudo certbot certificates

# Test your website SSL
# Visit: https://www.ssllabs.com/ssltest/
# Or: https://WhyNoPadlock.com
```

### Verify Auto-Renewal

Let's Encrypt certificates expire after 90 days. Certbot automatically renews them:

```bash
# Test renewal process (dry run)
sudo certbot renew --dry-run

# Check renewal timer status
systemctl show certbot.timer

# View renewal cron job
cat /etc/cron.d/certbot
```

## Step 5: Update Nginx Configuration

After Certbot runs, it will automatically update your Nginx configuration. However, you may want to add additional security headers.

### View Certificate Location

```bash
# Certificates are stored in:
cd /etc/letsencrypt/live/yourdomain.com/

# Files:
# - fullchain.pem (certificate + chain)
# - privkey.pem (private key)
# - cert.pem (certificate only)
# - chain.pem (chain only)
```

### Manual Nginx SSL Configuration (if needed)

If you used `certonly`, update `/etc/nginx/sites-available/gitau-pay`:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # ... rest of your configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Step 6: Update Application Configuration

### Update Frontend Environment Variables

If your domain is different from the IP, update the frontend:

```bash
cd ~/pesapal-aws/frontend
nano .env.production
```

Set:
```
VITE_API_BASE_URL=https://yourdomain.com
```

Rebuild:
```bash
npm run build
```

### Update Backend CORS

Update backend environment variables:

```bash
cd ~/pesapal-aws/backend
nano .env
```

Set:
```
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

Restart backend:
```bash
pm2 restart gitau-pay-backend
```

## Step 7: Test HTTPS

```bash
# Test from command line
curl -I https://yourdomain.com

# Test in browser
# Visit: https://yourdomain.com
# Check for padlock icon in address bar
```

## SSL Maintenance

### Manual Renewal

Certificates auto-renew, but you can manually renew:

```bash
# Renew all certificates
sudo certbot renew

# Renew specific certificate
sudo certbot renew --cert-name yourdomain.com
```

### Check Renewal Status

```bash
# View certificate expiration
sudo certbot certificates

# Check renewal timer
sudo systemctl status certbot.timer
```

### Troubleshooting Renewal

```bash
# Test renewal without actually renewing
sudo certbot renew --dry-run

# Force renewal (even if not expiring)
sudo certbot renew --force-renewal
```

## Security Enhancements

### Enable HSTS (HTTP Strict Transport Security)

Add to your Nginx SSL server block:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### Disable Older TLS Versions

Ensure only TLS 1.2 and 1.3 are enabled:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
```

### Strong Cipher Suites

```nginx
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers on;
```

## Troubleshooting

### Certificate Not Found

```bash
# List all certificates
sudo certbot certificates

# Check certificate files
ls -la /etc/letsencrypt/live/
```

### Nginx Configuration Errors

```bash
# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log
```

### Port 80 Not Accessible

```bash
# Check if port 80 is open
sudo netstat -tuln | grep :80

# Check firewall
sudo ufw status

# Check AWS Security Groups
# Ensure port 80 is open in EC2 Security Group
```

### Mixed Content Errors

If you see mixed content warnings:
- Ensure all API calls use HTTPS
- Check browser console for HTTP resources
- Update any hardcoded HTTP URLs to HTTPS

## Quick Reference Commands

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test renewal
sudo certbot renew --dry-run

# View certificates
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

## Next Steps

After SSL is configured:

1. ✅ Update DNS records to point to your domain
2. ✅ Update frontend `.env.production` with domain
3. ✅ Update backend CORS origins
4. ✅ Rebuild and redeploy application
5. ✅ Test HTTPS access
6. ✅ Monitor certificate renewal

---

**Note**: Let's Encrypt certificates are valid for 90 days and auto-renew. Certbot checks twice daily and renews certificates expiring within 30 days.
