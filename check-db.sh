#!/bin/bash

###############################################################################
# Database Diagnostic Script for Hostinger
# Run this on your Hostinger server to check database configuration
###############################################################################

echo "================================"
echo "DATABASE DIAGNOSTIC TOOL"
echo "================================"
echo ""

# Check if .env exists
echo "1. Checking .env file..."
if [ -f .env ]; then
    echo "   ✅ .env file exists"
    echo ""
    echo "   DATABASE_URL setting:"
    grep DATABASE_URL .env || echo "   ❌ DATABASE_URL not found in .env!"
else
    echo "   ❌ .env file MISSING!"
    echo "   You need to create .env file!"
fi

echo ""
echo "================================"

# Check if database file exists
echo "2. Checking database file..."
if [ -f prisma/mavesoj.db ]; then
    echo "   ✅ Database file exists"
    ls -lh prisma/mavesoj.db

    # Check if database has data
    echo ""
    echo "   Checking database contents..."
    sqlite3 prisma/mavesoj.db "SELECT COUNT(*) as products FROM Product;" 2>/dev/null && echo "   ✅ Database has products" || echo "   ⚠️  Could not query database"
else
    echo "   ❌ Database file NOT FOUND at prisma/mavesoj.db"
fi

echo ""
echo "================================"

# Check Prisma client
echo "3. Checking Prisma client..."
if [ -d node_modules/@prisma/client ]; then
    echo "   ✅ Prisma client installed"
else
    echo "   ❌ Prisma client NOT installed"
    echo "   Run: npx prisma generate"
fi

echo ""
echo "================================"

# Check PM2 process
echo "4. Checking PM2 process..."
pm2 status 2>/dev/null || echo "   ❌ PM2 not running or not found"

echo ""
echo "================================"
echo "RECOMMENDED FIXES:"
echo "================================"
echo ""
echo "If DATABASE_URL is wrong or missing:"
echo '   nano .env'
echo '   Add: DATABASE_URL="file:./prisma/mavesoj.db"'
echo ""
echo "If Prisma client is missing:"
echo '   npx prisma generate'
echo ""
echo "If database file is missing:"
echo '   git pull origin main'
echo '   (or copy from local machine)'
echo ""
echo "After fixes, restart:"
echo '   pm2 restart mavesoj'
echo '   pm2 logs mavesoj --lines 50'
echo ""
