#!/bin/bash

# Gitau Pay Deployment Script
# Run this script to deploy the application

set -e  # Exit on error

echo "🚀 Starting Gitau Pay Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

PROJECT_DIR="/home/ubuntu/pesapal-aws"
cd "$PROJECT_DIR"

echo -e "${GREEN}✓${NC} Project directory: $PROJECT_DIR"

# Backend deployment
echo -e "\n${YELLOW}📦 Setting up backend...${NC}"
cd "$PROJECT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓${NC} Backend dependencies installed"

# Frontend deployment
echo -e "\n${YELLOW}🎨 Building frontend...${NC}"
cd "$PROJECT_DIR/frontend"
npm install
npm run build
echo -e "${GREEN}✓${NC} Frontend built successfully"

# PM2 deployment
echo -e "\n${YELLOW}🔄 Deploying with PM2...${NC}"
cd "$PROJECT_DIR"
pm2 restart gitau-pay-backend || pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✓${NC} Application deployed with PM2"

# Nginx reload
echo -e "\n${YELLOW}🌐 Reloading Nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓${NC} Nginx reloaded"

# Health check
echo -e "\n${YELLOW}🏥 Running health check...${NC}"
sleep 2
if curl -f http://localhost:8000/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend is healthy"
else
    echo -e "${RED}✗${NC} Backend health check failed"
    exit 1
fi

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "\nApplication URLs:"
echo -e "  Frontend: http://54.165.218.113/"
echo -e "  Backend API: http://54.165.218.113/api/"
echo -e "  Health Check: http://54.165.218.113/health"
