#!/bin/bash

###############################################################################
# Quick Deployment Script for Hostinger
#
# Usage: ./deploy.sh
#
# This script will:
# 1. Pull latest changes from git
# 2. Install dependencies
# 3. Run database migrations
# 4. Build the application
# 5. Restart PM2 process
###############################################################################

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Pulling latest changes...${NC}"
git pull origin main

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production=false

echo -e "${YELLOW}🗄️  Generating Prisma client...${NC}"
npx prisma generate

echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy

echo -e "${YELLOW}🏗️  Building application...${NC}"
npm run build

echo -e "${YELLOW}🔄 Restarting PM2 process...${NC}"
pm2 restart mavesoj

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

echo -e "${YELLOW}📊 Checking application status...${NC}"
pm2 status

echo -e "${YELLOW}📝 Showing recent logs (press Ctrl+C to exit):${NC}"
pm2 logs mavesoj --lines 30 --nostream
