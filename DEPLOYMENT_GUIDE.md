# Gitau Pay - AWS Deployment Guide

Complete step-by-step guide for deploying Gitau Pay to AWS EC2 with DevOps best practices.

## 📋 Prerequisites

- AWS EC2 Ubuntu instance running (54.165.218.113)
- SSH access to the EC2 instance
- Domain name (optional, for SSL)
- AWS Security Groups configured

## 🏗️ Architecture Overview

### Recommended Setup:
- **1 EC2 Instance (t3.medium or larger)**: Main application server
  - Gitau Pay application (Frontend + Backend)
  - Jenkins (CI/CD)
  - SonarQube (Code Quality)
  - Nginx (Reverse Proxy)
  - PM2 (Process Manager)

### Alternative Setup (Production):
- **EC2 Instance 1**: Application server (Gitau Pay)
- **EC2 Instance 2**: Jenkins server
- **EC2 Instance 3**: SonarQube server (requires 2GB+ RAM)

For this guide, we'll use a single instance setup (cost-effective).

---

## 📦 Step 1: Transfer Application to EC2

### From your local machine:

```bash
# Navigate to the Pesapal project directory
cd /home/bugitau/Projects/Pesapal

# Create a compressed archive (excluding node_modules and venv)
tar --exclude='node_modules' \
    --exclude='venv' \
    --exclude='.git' \
    --exclude='__pycache__' \
    -czf pesapal-aws.tar.gz pesapal-aws/

# Transfer to EC2 (replace with your key path and username)
scp -i /path/to/your-key.pem pesapal-aws.tar.gz ubuntu@54.165.218.113:~/

# Or if using password authentication
scp pesapal-aws.tar.gz ubuntu@54.165.218.113:~/
```

---

## 🚀 Step 2: Initial Server Setup

### SSH into your EC2 instance:

```bash
ssh -i /path/to/your-key.pem ubuntu@54.165.218.113
# or
ssh ubuntu@54.165.218.113
```

### Update system and install dependencies:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y \
    build-essential \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Python 3.10+ and pip
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
python3 --version
node --version
npm --version
```

### Extract application:

```bash
cd ~
tar -xzf pesapal-aws.tar.gz
cd pesapal-aws
```

---

## 🔧 Step 3: Setup Application

### Backend Setup:

```bash
cd ~/pesapal-aws/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Test backend (should work)
python3 main.py
# Press Ctrl+C to stop
```

### Frontend Setup:

```bash
cd ~/pesapal-aws/frontend

# Install dependencies
npm install

# Build for production
npm run build

# The dist/ folder contains production-ready files
```

---

## 🔄 Step 4: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
cd ~/pesapal-aws
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gitau-pay-backend',
    script: 'backend/main.py',
    interpreter: 'python3',
    cwd: '/home/ubuntu/pesapal-aws',
    env: {
      PORT: 8000,
      NODE_ENV: 'production'
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/home/ubuntu/pesapal-aws/logs/backend-error.log',
    out_file: '/home/ubuntu/pesapal-aws/logs/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
EOF

# Create logs directory
mkdir -p ~/pesapal-aws/logs

# Start application with PM2
cd ~/pesapal-aws/backend
source venv/bin/activate
pm2 start ../ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions it provides (usually run a sudo command)
```

---

## 🌐 Step 5: Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/gitau-pay
```

### Add this configuration:

```nginx
# Backend API
upstream backend {
    server 127.0.0.1:8000;
}

# Frontend
server {
    listen 80;
    server_name 54.165.218.113;  # Replace with your domain if you have one

    # Frontend static files
    root /home/ubuntu/pesapal-aws/frontend/dist;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Enable site and test:

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/gitau-pay /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Configure Environment Variables:

```bash
# Frontend - create production environment file
cd ~/pesapal-aws/frontend
nano .env.production
```

Add (leave empty for same-domain, or set to your API URL):
```
VITE_API_BASE_URL=
```

```bash
# Backend - create environment file
cd ~/pesapal-aws/backend
cp .env.example .env
nano .env
```

Update with your values:
```
PESAPAL_CONSUMER_KEY=your_key
PESAPAL_CONSUMER_SECRET=your_secret
CORS_ORIGINS=http://54.165.218.113,https://yourdomain.com
```

Rebuild frontend:
```bash
cd ~/pesapal-aws/frontend
npm run build
```

---

## 🔒 Step 6: Configure Firewall (UFW)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Jenkins (if using default port)
sudo ufw allow 8080/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## 🏭 Step 7: Install Jenkins

```bash
# Install Java (required for Jenkins)
sudo apt install -y openjdk-17-jdk

# Add Jenkins repository
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# Update and install Jenkins
sudo apt update
sudo apt install -y jenkins

# Start Jenkins
sudo systemctl start jenkins
sudo systemctl enable jenkins

# Get initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword

# Access Jenkins at: http://54.165.218.113:8080
```

### Jenkins Initial Setup:

1. Open browser: `http://54.165.218.113:8080`
2. Enter the initial admin password (from above command)
3. Install suggested plugins
4. Create admin user
5. Configure Jenkins URL

### Install Jenkins Plugins:

1. Go to: Manage Jenkins → Plugins
2. Install these plugins:
   - **Git Plugin**
   - **NodeJS Plugin**
   - **Python Plugin**
   - **Pipeline Plugin**
   - **SonarQube Scanner**
   - **Docker Pipeline** (optional)
   - **Blue Ocean** (optional, for better UI)

### Configure Node.js in Jenkins:

1. Manage Jenkins → Global Tool Configuration
2. NodeJS installations:
   - Name: `NodeJS-18`
   - Version: `18.x`
   - Install automatically: ✓

---

## 🔍 Step 8: Install SonarQube

**Note:** SonarQube requires at least 2GB RAM. If your instance has less, consider upgrading or using a separate instance.

```bash
# Install PostgreSQL (SonarQube database)
sudo apt install -y postgresql postgresql-contrib

# Create SonarQube database and user
sudo -u postgres psql << EOF
CREATE DATABASE sonarqube;
CREATE USER sonarqube WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;
\q
EOF

# Download SonarQube
cd /opt
sudo wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.2.1.78527.zip
sudo unzip sonarqube-10.2.1.78527.zip
sudo mv sonarqube-10.2.1.78527 sonarqube

# Create SonarQube user
sudo useradd -r -s /bin/bash sonarqube
sudo chown -R sonarqube:sonarqube /opt/sonarqube

# Configure SonarQube
sudo nano /opt/sonarqube/conf/sonar.properties
```

### Update SonarQube configuration:

```properties
# Database
sonar.jdbc.url=jdbc:postgresql://localhost:5432/sonarqube
sonar.jdbc.username=sonarqube
sonar.jdbc.password=your_secure_password_here

# Web server
sonar.web.host=0.0.0.0
sonar.web.port=9000
```

### Create systemd service for SonarQube:

```bash
sudo nano /etc/systemd/system/sonarqube.service
```

Add:

```ini
[Unit]
Description=SonarQube service
After=syslog.target network.target

[Service]
Type=forking
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop
User=sonarqube
Group=sonarqube
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Start SonarQube
sudo systemctl daemon-reload
sudo systemctl start sonarqube
sudo systemctl enable sonarqube

# Check status
sudo systemctl status sonarqube

# Access SonarQube at: http://54.165.218.113:9000
# Default credentials: admin/admin (change on first login)
```

### Configure Nginx for SonarQube:

```bash
sudo nano /etc/nginx/sites-available/sonarqube
```

Add:

```nginx
server {
    listen 80;
    server_name sonar.yourdomain.com;  # Or use IP

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sonarqube /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔄 Step 9: Create Jenkins Pipeline

### Create Jenkinsfile in your project:

```bash
cd ~/pesapal-aws
nano Jenkinsfile
```

Add this Jenkinsfile:

```groovy
pipeline {
    agent any
    
    environment {
        NODEJS_VERSION = '18'
        PROJECT_DIR = '/home/ubuntu/pesapal-aws'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            parallel {
                stage('Backend') {
                    steps {
                        dir('backend') {
                            sh '''
                                python3 -m venv venv || true
                                source venv/bin/activate
                                pip install -r requirements.txt
                            '''
                        }
                    }
                }
                stage('Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'npm install'
                        }
                    }
                }
            }
        }
        
        stage('Lint & Test') {
            steps {
                dir('backend') {
                    sh '''
                        source venv/bin/activate
                        pip install pylint pytest || true
                        pylint main.py || true
                    '''
                }
                dir('frontend') {
                    sh 'npm run build || true'
                }
            }
        }
        
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                            -Dsonar.projectKey=gitau-pay \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=http://localhost:9000 \
                            -Dsonar.login=your_sonar_token
                    '''
                }
            }
        }
        
        stage('Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }
        
        stage('Deploy') {
            steps {
                sh '''
                    cd ${PROJECT_DIR}
                    pm2 restart gitau-pay-backend || pm2 start ecosystem.config.js
                    sudo systemctl reload nginx
                '''
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
```

### Configure Jenkins Job:

1. Go to Jenkins → New Item
2. Name: `gitau-pay-pipeline`
3. Type: Pipeline
4. Configure:
   - Pipeline definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: Your Git repository (or use local files)
   - Script Path: `Jenkinsfile`

---

## 🔐 Step 10: SSL Certificate (Let's Encrypt)

**Important**: You need a domain name pointing to your EC2 instance for SSL certificates.

### Install Certbot

```bash
# Update package index
sudo apt update

# Install Certbot for Nginx
sudo apt install -y certbot python3-certbot-nginx
```

### Obtain SSL Certificate

```bash
# Replace 'yourdomain.com' with your actual domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**During setup:**
1. Enter email address for renewal notices
2. Agree to terms of service
3. Choose option **2** to redirect HTTP to HTTPS (recommended)

### Verify SSL

```bash
# Test renewal process
sudo certbot renew --dry-run

# View certificates
sudo certbot certificates
```

### Update Application for HTTPS

After SSL is configured, update environment variables:

```bash
# Frontend - rebuild with HTTPS URL
cd ~/pesapal-aws/frontend
# Update .env.production if needed
npm run build

# Backend - update CORS origins
cd ~/pesapal-aws/backend
# Update .env with HTTPS origins
nano .env
# Add: CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Restart services
pm2 restart gitau-pay-backend
sudo systemctl reload nginx
```

**Note**: Certificates auto-renew every 90 days. Certbot checks twice daily.

**For detailed SSL setup instructions, see `SSL_SETUP.md`**

---

## 📊 Step 11: Monitoring & Logging

### Install monitoring tools:

```bash
# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Install htop for system monitoring
sudo apt install -y htop

# View logs
pm2 logs gitau-pay-backend
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 Step 12: Setup Git Repository (Optional but Recommended)

```bash
cd ~/pesapal-aws
git init
git add .
git commit -m "Initial commit"

# Push to GitHub/GitLab
# git remote add origin https://github.com/yourusername/gitau-pay.git
# git push -u origin main
```

---

## ✅ Step 13: Verify Deployment

### Check services:

```bash
# PM2 status
pm2 status

# Nginx status
sudo systemctl status nginx

# Jenkins status
sudo systemctl status jenkins

# SonarQube status
sudo systemctl status sonarqube

# Test application
curl http://localhost:8000/
curl http://54.165.218.113/
```

### Access URLs:

- **Application**: `http://54.165.218.113/`
- **Backend API**: `http://54.165.218.113/api/`
- **Jenkins**: `http://54.165.218.113:8080`
- **SonarQube**: `http://54.165.218.113:9000`

---

## 🔧 Step 14: Update Frontend for Production

Update the frontend to use relative API URLs:

```bash
cd ~/pesapal-aws/frontend/src
nano App.jsx
```

Change API calls from:
```javascript
axios.post('http://localhost:8000/api/stk-push', ...)
```

To:
```javascript
axios.post('/api/stk-push', ...)
```

Then rebuild:
```bash
cd ~/pesapal-aws/frontend
npm run build
sudo systemctl reload nginx
```

---

## 📝 Step 15: Environment Variables (Best Practice)

Create environment file:

```bash
cd ~/pesapal-aws/backend
nano .env
```

Add:
```
PESAPAL_CONSUMER_KEY=your_key_here
PESAPAL_CONSUMER_SECRET=your_secret_here
PESAPAL_IPN_ID=your_ipn_id_here
ENVIRONMENT=production
```

Update `main.py` to read from environment variables.

---

## 🚨 Security Checklist

- [ ] Change default SSH port (optional)
- [ ] Setup SSH key authentication only
- [ ] Configure AWS Security Groups properly
- [ ] Enable UFW firewall
- [ ] Setup SSL certificates
- [ ] Change default Jenkins password
- [ ] Change default SonarQube password
- [ ] Use environment variables for secrets
- [ ] Regular system updates
- [ ] Setup automated backups

---

## 📈 Scaling Considerations

If you need to scale:

1. **Separate Jenkins**: Use a dedicated EC2 instance for CI/CD
2. **Separate SonarQube**: Use a dedicated instance (requires 2GB+ RAM)
3. **Load Balancer**: Use AWS Application Load Balancer
4. **Auto Scaling**: Setup Auto Scaling Groups
5. **Database**: Move to RDS if needed
6. **CDN**: Use CloudFront for frontend assets

---

## 🆘 Troubleshooting

### PM2 not starting:
```bash
pm2 logs gitau-pay-backend
pm2 restart gitau-pay-backend
```

### Nginx errors:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Port conflicts:
```bash
sudo netstat -tuln | grep LISTEN
sudo lsof -i :8000
```

### Memory issues:
```bash
free -h
# Consider upgrading instance or optimizing
```

---

## 📚 Additional Resources

- PM2 Documentation: https://pm2.keymetrics.io/
- Jenkins Documentation: https://www.jenkins.io/doc/
- SonarQube Documentation: https://docs.sonarqube.org/
- Nginx Documentation: https://nginx.org/en/docs/

---

## 🎉 Success!

Your Gitau Pay application should now be:
- ✅ Running on EC2
- ✅ Accessible via web browser
- ✅ Managed by PM2
- ✅ Behind Nginx reverse proxy
- ✅ CI/CD pipeline with Jenkins
- ✅ Code quality analysis with SonarQube
- ✅ Production-ready!
