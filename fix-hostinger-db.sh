#!/bin/bash

###############################################################################
# Quick Fix Script for Hostinger Database Issues
# This script will fix common database configuration problems
###############################################################################

set -e  # Exit on error

echo "🔧 Fixing Hostinger Database Configuration..."
echo ""

# Step 1: Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating .env from .env.production.example..."
    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        echo "✅ .env created - PLEASE EDIT IT WITH YOUR REAL VALUES!"
        echo ""
        echo "Run: nano .env"
        echo "Then update:"
        echo "  - NEXT_PUBLIC_SITE_URL"
        echo "  - NEXTAUTH_SECRET (generate new!)"
        echo "  - SMTP credentials"
        exit 1
    else
        echo "❌ .env.production.example also not found!"
        echo "Creating basic .env..."
        cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL="file:./prisma/mavesoj.db"
NEXTAUTH_SECRET="CHANGE-THIS-TO-SECURE-RANDOM-STRING"
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
EOF
        echo "✅ Basic .env created - PLEASE EDIT IT!"
        exit 1
    fi
fi

echo "✅ .env file exists"

# Step 2: Fix DATABASE_URL if needed
echo ""
echo "📝 Checking DATABASE_URL..."
if grep -q 'DATABASE_URL="file:./prisma/mavesoj.db"' .env; then
    echo "✅ DATABASE_URL is correct"
else
    echo "⚠️  Fixing DATABASE_URL..."
    # Remove old DATABASE_URL line and add correct one
    sed -i '/DATABASE_URL/d' .env
    echo 'DATABASE_URL="file:./prisma/mavesoj.db"' >> .env
    echo "✅ DATABASE_URL fixed"
fi

# Step 3: Check database file
echo ""
echo "📂 Checking database file..."
if [ ! -f prisma/mavesoj.db ]; then
    echo "❌ Database file missing!"
    echo "Pulling from GitHub..."
    git pull origin main
    if [ ! -f prisma/mavesoj.db ]; then
        echo "❌ Database still missing after git pull"
        echo "You need to copy it from your local machine:"
        echo "  scp prisma/mavesoj.db user@server:~/path/to/project/prisma/"
        exit 1
    fi
fi

echo "✅ Database file exists"

# Step 4: Fix permissions
echo ""
echo "🔒 Fixing file permissions..."
chmod 644 prisma/mavesoj.db 2>/dev/null || true
chmod 755 prisma 2>/dev/null || true
echo "✅ Permissions fixed"

# Step 5: Generate Prisma client
echo ""
echo "⚙️  Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"

# Step 6: Restart application
echo ""
echo "🔄 Restarting application..."
if command -v pm2 &> /dev/null; then
    pm2 restart mavesoj || pm2 restart all
    echo "✅ Application restarted"
    echo ""
    echo "📊 Checking status..."
    pm2 status
    echo ""
    echo "📝 Recent logs:"
    pm2 logs mavesoj --lines 20 --nostream
else
    echo "⚠️  PM2 not found - restart manually"
fi

echo ""
echo "================================"
echo "✅ FIX COMPLETE!"
echo "================================"
echo ""
echo "Check your site now: https://your-domain.com"
echo ""
echo "If still not working, check logs:"
echo "  pm2 logs mavesoj"
echo ""
