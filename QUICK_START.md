# Quick Start - AWS Deployment

## 🚀 Quick Deployment Steps

### 1. Transfer Files to EC2

```bash
cd /home/bugitau/Projects/Pesapal
tar --exclude='node_modules' --exclude='venv' --exclude='.git' \
    -czf pesapal-aws.tar.gz pesapal-aws/
scp -i /path/to/key.pem pesapal-aws.tar.gz ubuntu@54.165.218.113:~/
```

### 2. SSH into EC2

```bash
ssh -i /path/to/key.pem ubuntu@54.165.218.113
```

### 3. Run Setup Script

```bash
# Extract files
cd ~
tar -xzf pesapal-aws.tar.gz
cd pesapal-aws

# Make scripts executable
chmod +x deploy.sh

# Follow the detailed DEPLOYMENT_GUIDE.md for complete setup
# Or run quick setup commands below
```

### 4. Quick Setup Commands

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx

# Setup backend
cd ~/pesapal-aws/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ~/pesapal-aws/frontend
npm install
npm run build

# Install PM2
sudo npm install -g pm2

# Setup PM2
cd ~/pesapal-aws
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions

# Setup Nginx
sudo cp nginx.conf /etc/nginx/sites-available/gitau-pay
sudo ln -s /etc/nginx/sites-available/gitau-pay /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 5. Verify

```bash
# Check PM2
pm2 status

# Check Nginx
sudo systemctl status nginx

# Test application
curl http://localhost:8000/
curl http://54.165.218.113/
```

### 6. Access Application

- **Frontend**: http://54.165.218.113/
- **Backend API**: http://54.165.218.113/api/
- **Health Check**: http://54.165.218.113/health

---

## 📚 For Complete Setup

See `DEPLOYMENT_GUIDE.md` for:
- Jenkins CI/CD setup
- SonarQube code quality
- SSL certificates
- Monitoring
- Security hardening
