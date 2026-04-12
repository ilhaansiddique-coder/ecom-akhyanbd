# Hostinger Node.js Deployment Guide

Complete guide to deploy **মা ভেষজ বাণিজ্যালয়** on Hostinger Node.js hosting.

---

## Prerequisites

- ✅ Hostinger Node.js hosting plan (Business or higher)
- ✅ Domain name configured
- ✅ SSH access enabled in Hostinger control panel
- ✅ Git installed on your local machine

---

## Step 1: Prepare Your Local Project

### 1.1 Update Production Environment Variables

Create `.env.production` from the example:

```bash
cp .env.production.example .env.production
```

Edit `.env.production` and update:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://mavesoj.com  # Your actual domain
NEXTAUTH_SECRET="generate-a-secure-random-32-char-string"  # CRITICAL!
NEXTAUTH_URL="https://mavesoj.com"

# Email credentials
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
SMTP_FROM="your-email@gmail.com"
ADMIN_EMAIL="admin@mavesoj.com"
```

**Generate NEXTAUTH_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.2 Test Production Build Locally

```bash
npm run build
npm start
```

Visit http://localhost:3000 and verify everything works.

### 1.3 Commit Your Changes

```bash
git add .
git commit -m "Production deployment preparation"
git push origin main
```

---

## Step 2: Setup Hostinger Environment

### 2.1 Access SSH

1. Go to Hostinger control panel
2. Navigate to **Advanced > SSH Access**
3. Enable SSH access if not already enabled
4. Copy your SSH credentials

Connect via SSH:
```bash
ssh u123456789@your-server-ip
```

### 2.2 Navigate to Application Directory

```bash
cd domains/yourdomain.com/public_html
# or
cd ~/htdocs  # depending on Hostinger setup
```

### 2.3 Clone Your Repository

```bash
# Remove default files if any
rm -rf *
rm -rf .??*

# Clone your repository
git clone https://github.com/yourusername/mavesoj.git .

# Or if private repo:
git clone https://YOUR_TOKEN@github.com/yourusername/mavesoj.git .
```

---

## Step 3: Configure Environment

### 3.1 Create Production .env File

```bash
nano .env
```

Paste your production environment variables (from `.env.production`).

**Press:** `Ctrl + O` to save, `Enter` to confirm, `Ctrl + X` to exit.

### 3.2 Verify Node.js Version

```bash
node -v  # Should be v18+ or v20+
npm -v
```

If version is too old, contact Hostinger support to update Node.js version in cPanel.

---

## Step 4: Install Dependencies & Build

### 4.1 Install Packages

```bash
npm install --production=false
```

This might take 5-10 minutes depending on server speed.

### 4.2 Generate Prisma Client

```bash
npx prisma generate
```

### 4.3 Run Database Migrations

```bash
npx prisma migrate deploy
```

**If starting fresh:**
```bash
npx prisma migrate reset --force
npx prisma db push
```

### 4.4 Build Next.js Application

```bash
npm run build
```

This will create an optimized production build. Takes 2-5 minutes.

---

## Step 5: Configure PM2 Process Manager

Hostinger uses PM2 to run Node.js applications.

### 5.1 Create Logs Directory

```bash
mkdir -p logs
```

### 5.2 Start Application with PM2

```bash
# Stop any existing processes
pm2 stop all
pm2 delete all

# Start using ecosystem config
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs mavesoj --lines 50
```

### 5.3 Enable Auto-Start on Reboot

```bash
pm2 startup
pm2 save
```

---

## Step 6: Configure Reverse Proxy (Nginx)

Hostinger typically auto-configures this, but verify:

### 6.1 Check Nginx Configuration

In Hostinger cPanel:
1. Go to **Advanced > Node.js**
2. Select your application
3. Verify **Application URL** points to your domain
4. **Application Root** should be `/public_html` or `/htdocs`
5. **Application Startup File** should be `ecosystem.config.js` or leave as auto-detect

### 6.2 Set Environment Variables in cPanel

Some variables can be set in cPanel's Node.js section:
- `NODE_ENV=production`
- `PORT=3000`

---

## Step 7: File Permissions & Uploads

### 7.1 Create Uploads Directory

```bash
mkdir -p public/uploads
chmod 755 public/uploads
```

### 7.2 Database File Permissions

```bash
chmod 644 prisma/mavesoj.db
chmod 755 prisma
```

---

## Step 8: SSL Certificate

### 8.1 Enable HTTPS

In Hostinger cPanel:
1. Go to **Security > SSL/TLS**
2. Enable **Let's Encrypt SSL** for your domain
3. Force HTTPS redirect

### 8.2 Update Environment URLs

After SSL is active, update `.env`:
```bash
nano .env
```

Ensure all URLs use `https://`:
```env
NEXT_PUBLIC_SITE_URL=https://mavesoj.com
NEXTAUTH_URL=https://mavesoj.com
```

Restart application:
```bash
pm2 restart mavesoj
```

---

## Step 9: Verify Deployment

### 9.1 Check Application Status

```bash
pm2 status
pm2 logs mavesoj --lines 100
```

### 9.2 Test Website

Visit your domain: `https://mavesoj.com`

Test key functionality:
- ✅ Homepage loads
- ✅ Products display
- ✅ Add to cart works
- ✅ Checkout process works
- ✅ Admin login at `/cdlogin`
- ✅ Dashboard accessible

### 9.3 Test Admin Panel

1. Visit: `https://mavesoj.com/cdlogin`
2. Login with admin credentials
3. Verify dashboard loads
4. Check orders, products, settings

---

## Step 10: Post-Deployment Tasks

### 10.1 Create Admin User (if needed)

```bash
npx prisma studio
```

Or create via database:
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 10));"
```

Then insert into database:
```sql
INSERT INTO users (name, email, password, role, created_at)
VALUES ('Admin', 'admin@mavesoj.com', 'HASHED_PASSWORD_HERE', 'admin', datetime('now'));
```

### 10.2 Configure Email Settings

Test email by:
1. Go to Dashboard > Settings > Email
2. Send test email
3. Verify it arrives

If using Gmail:
- Enable 2-Factor Authentication
- Generate App Password: https://myaccount.google.com/apppasswords
- Use App Password in `SMTP_PASS`

---

## Updating Your Application

When you make changes:

```bash
# SSH into server
ssh u123456789@your-server-ip
cd domains/yourdomain.com/public_html

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Rebuild
npm run build

# Restart
pm2 restart mavesoj

# Check status
pm2 logs mavesoj --lines 50
```

**Quick update script** (create as `deploy.sh`):
```bash
#!/bin/bash
git pull origin main && \
npm install && \
npx prisma generate && \
npx prisma migrate deploy && \
npm run build && \
pm2 restart mavesoj && \
pm2 logs mavesoj --lines 30
```

Make executable:
```bash
chmod +x deploy.sh
```

Update with:
```bash
./deploy.sh
```

---

## Troubleshooting

### Issue: Application Won't Start

```bash
# Check PM2 logs
pm2 logs mavesoj --err --lines 100

# Common fixes:
pm2 delete all
npm run build
pm2 start ecosystem.config.js
```

### Issue: Database Locked Error

SQLite can lock under high concurrency:
```bash
# Stop all processes
pm2 stop all

# Check for lock files
ls -la prisma/
rm -f prisma/*.db-journal

# Restart
pm2 restart all
```

### Issue: Out of Memory

```bash
# Increase PM2 memory limit
pm2 delete mavesoj
pm2 start ecosystem.config.js --max-memory-restart 1G
pm2 save
```

### Issue: Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in ecosystem.config.js
```

### Issue: 502 Bad Gateway

Nginx can't connect to Node.js app:
```bash
# Verify app is running
pm2 status

# Check if port 3000 is listening
netstat -tuln | grep 3000

# Restart PM2
pm2 restart all

# If still not working, restart Nginx (contact Hostinger support)
```

### Issue: Images Not Loading

```bash
# Check permissions
chmod -R 755 public/uploads

# Check if files exist
ls -la public/uploads

# Verify .htaccess or nginx config allows uploads directory
```

---

## Performance Optimization

### Enable Caching

Already configured in `next.config.ts`:
- ✅ Static assets cached for 1 year
- ✅ Images cached for 30 days
- ✅ Compression enabled

### Database Optimization

For better performance with SQLite:

```bash
# Enable WAL mode
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$executeRaw\`PRAGMA journal_mode=WAL;\`.then(() => console.log('WAL enabled')).finally(() => prisma.\$disconnect());"
```

### Monitor Resource Usage

```bash
# CPU and Memory
pm2 monit

# Detailed logs
pm2 logs mavesoj --lines 200
```

---

## Backup Strategy

### Database Backup

Create automated backup script:

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp prisma/mavesoj.db backups/mavesoj_$DATE.db
# Keep only last 7 days
find backups/ -name "mavesoj_*.db" -mtime +7 -delete
```

Run daily via cron:
```bash
crontab -e
# Add:
0 2 * * * /path/to/backup.sh
```

### Full Backup

```bash
tar -czf mavesoj_backup_$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='logs' \
  .
```

---

## Security Checklist

- ✅ Change default NEXTAUTH_SECRET
- ✅ Use strong admin password
- ✅ Enable HTTPS/SSL
- ✅ Set proper file permissions (644 for files, 755 for directories)
- ✅ Keep dependencies updated (`npm audit`)
- ✅ Hide sensitive files (.env never committed to git)
- ✅ Enable firewall rules (Hostinger cPanel)
- ✅ Regular backups
- ✅ Monitor error logs for suspicious activity

---

## Support

- **Hostinger Support:** https://www.hostinger.com/help
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs

---

## Quick Reference Commands

```bash
# SSH Login
ssh u123456789@your-server-ip

# Navigate to app
cd domains/yourdomain.com/public_html

# Check status
pm2 status

# View logs
pm2 logs mavesoj

# Restart app
pm2 restart mavesoj

# Update app
git pull && npm install && npm run build && pm2 restart mavesoj

# Database migrations
npx prisma migrate deploy

# Check disk space
df -h

# Check memory usage
free -m
```

---

**Deployment Checklist:**

- [ ] Local build tested successfully
- [ ] `.env.production` configured with real values
- [ ] NEXTAUTH_SECRET generated (32+ chars)
- [ ] Domain DNS pointing to Hostinger
- [ ] SSL certificate enabled
- [ ] Repository cloned to server
- [ ] Dependencies installed
- [ ] Database migrated
- [ ] Production build completed
- [ ] PM2 process running
- [ ] Admin login working at `/cdlogin`
- [ ] Test order placed successfully
- [ ] Email notifications working
- [ ] Images uploading correctly
- [ ] Backup strategy implemented

---

**You're all set! Your website should now be live on Hostinger.** 🎉
