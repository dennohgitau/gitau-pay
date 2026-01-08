# AWS Deployment Summary

## 📋 Overview

This document provides a quick reference for deploying Gitau Pay to AWS EC2 with DevOps best practices.

## 🏗️ Architecture

### Single EC2 Instance Setup (Recommended for Start)
- **Instance Type**: t3.medium (2 vCPU, 4GB RAM) or larger
- **OS**: Ubuntu 22.04 LTS
- **IP Address**: 54.165.218.113

### Services Running:
1. **Gitau Pay Application** (Frontend + Backend)
2. **Nginx** (Reverse Proxy)
3. **PM2** (Process Manager)
4. **Jenkins** (CI/CD) - Port 8080
5. **SonarQube** (Code Quality) - Port 9000

## 📦 Step-by-Step Deployment

### Step 1: Transfer Application
```bash
cd /home/bugitau/Projects/Pesapal
tar --exclude='node_modules' --exclude='venv' --exclude='.git' \
    -czf pesapal-aws.tar.gz pesapal-aws/
scp -i /home/bugitau/Projects/Pesapal/pesapal-aws/pesapal.pem pesapal-aws.tar.gz ubuntu@54.165.218.113:~/
```

### Step 2: Initial Server Setup
```bash
ssh ubuntu@54.165.218.113

# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx git
```

### Step 3: Extract and Setup Application
```bash
cd ~
tar -xzf pesapal-aws.tar.gz
cd pesapal-aws

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build
```

### Step 4: Install PM2
```bash
sudo npm install -g pm2
cd ~/pesapal-aws
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions
```

### Step 5: Configure Nginx
```bash
sudo cp ~/pesapal-aws/nginx.conf /etc/nginx/sites-available/gitau-pay
sudo ln -s /etc/nginx/sites-available/gitau-pay /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Configure Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp  # Jenkins
sudo ufw allow 9000/tcp  # SonarQube
sudo ufw enable
```

### Step 7: Install Jenkins (Optional)
```bash
sudo apt install -y openjdk-17-jdk
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install -y jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins
```

### Step 8: Install SonarQube (Optional - Requires 2GB+ RAM)
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Setup database
sudo -u postgres psql -c "CREATE DATABASE sonarqube;"
sudo -u postgres psql -c "CREATE USER sonarqube WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;"

# Download and setup SonarQube
cd /opt
sudo wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.2.1.78527.zip
sudo unzip sonarqube-10.2.1.78527.zip
sudo useradd -r -s /bin/bash sonarqube
sudo chown -R sonarqube:sonarqube /opt/sonarqube

# Configure and start (see DEPLOYMENT_GUIDE.md for details)
```

## 🔐 Security Checklist

- [ ] Configure AWS Security Groups
  - Allow: 22 (SSH), 80 (HTTP), 443 (HTTPS)
  - Allow: 8080 (Jenkins), 9000 (SonarQube) - only from your IP
- [ ] Setup SSH key authentication
- [ ] Change default passwords (Jenkins, SonarQube)
- [ ] Setup SSL certificate (Let's Encrypt)
- [ ] Enable UFW firewall
- [ ] Regular system updates

## 🌐 Access URLs

After deployment:
- **Application**: http://54.165.218.113/
- **Backend API**: http://54.165.218.113/api/
- **Jenkins**: http://54.165.218.113:8080
- **SonarQube**: http://54.165.218.113:9000

## 📊 Monitoring Commands

```bash
# PM2 status
pm2 status
pm2 logs gitau-pay-backend

# Nginx status
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log

# System resources
htop
df -h
free -h
```

## 🔄 Deployment Workflow

1. **Development** → Push to Git
2. **Jenkins** → Pulls code, runs tests, builds
3. **SonarQube** → Code quality analysis
4. **PM2** → Restarts application
5. **Nginx** → Serves updated application

## 📚 Documentation Files

- `DEPLOYMENT_GUIDE.md` - Complete detailed guide
- `QUICK_START.md` - Quick setup commands
- `Jenkinsfile` - CI/CD pipeline configuration
- `ecosystem.config.js` - PM2 configuration
- `nginx.conf` - Nginx configuration
- `deploy.sh` - Automated deployment script

## 🆘 Troubleshooting

### Application not accessible
```bash
# Check PM2
pm2 status
pm2 logs gitau-pay-backend

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check ports
sudo netstat -tuln | grep LISTEN
```

### Out of memory
```bash
# Check memory
free -h

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

### Permission issues
```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu ~/pesapal-aws
```

## 💰 Cost Estimation

### Single Instance Setup:
- **t3.medium**: ~$30/month
- **Data Transfer**: ~$10/month
- **Total**: ~$40/month

### Separate Instances (Production):
- **Application (t3.medium)**: ~$30/month
- **Jenkins (t3.small)**: ~$15/month
- **SonarQube (t3.medium)**: ~$30/month
- **Total**: ~$75/month

## ✅ Success Criteria

- [ ] Application accessible via browser
- [ ] Backend API responding
- [ ] PM2 managing processes
- [ ] Nginx serving frontend
- [ ] Jenkins running (if installed)
- [ ] SonarQube running (if installed)
- [ ] SSL certificate installed (optional)
- [ ] Monitoring in place

---

**Next Steps**: Follow `DEPLOYMENT_GUIDE.md` for complete setup with all DevOps tools.
