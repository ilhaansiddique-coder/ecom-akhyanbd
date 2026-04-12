# Hostinger Node.js Deployment Guide

## Prerequisites
- Hostinger VPS or Node.js hosting plan
- Node.js 18+ installed on the server
- SSH access to your server

## Step 1: Upload Files

Upload your entire project to the server via SSH/SFTP. You can use FileZilla or `scp`:

```bash
# From your local machine
scp -r D:/Mavesoj/* user@your-server-ip:/home/user/mavesoj/
```

Or use Git:
```bash
# On the server
git clone your-repo-url /home/user/mavesoj
cd /home/user/mavesoj
```

## Step 2: Setup Environment

```bash
cd /home/user/mavesoj

# Copy production environment
cp .env.production .env

# Edit and set your values
nano .env
```

**Important**: Set these in `.env`:
- `NEXT_PUBLIC_SITE_URL` = your domain
- `NEXTAUTH_SECRET` = already generated
- `SMTP_USER` / `SMTP_PASS` = your email credentials (or configure from dashboard later)

## Step 3: Install & Build

```bash
# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Push database schema (creates SQLite file)
npx prisma db push

# Build the app
npm run build
```

## Step 4: Start the App

```bash
# Start on port 3000 (default)
npm start

# Or specify a port
PORT=3000 npm start
```

## Step 5: Keep Running with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start npm --name "mavesoj" -- start

# Auto-start on server reboot
pm2 save
pm2 startup
```

## Step 6: Hostinger hPanel Setup

If using Hostinger's hPanel Node.js hosting:

1. Go to **hPanel → Websites → Manage**
2. Navigate to **Advanced → Node.js**
3. Set:
   - **Node.js version**: 18 or 20
   - **Application root**: `/home/user/mavesoj`
   - **Application startup file**: `node_modules/.bin/next`
   - **Arguments**: `start`
4. Click **Save** and **Restart**

### Alternative: Use standalone output

Since we set `output: "standalone"` in next.config.ts, you can also run:

```bash
# After building, the standalone server is at:
node .next/standalone/server.js
```

For Hostinger, set the startup file to `.next/standalone/server.js`.

**Important**: Copy static files for standalone:
```bash
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp prisma/mavesoj.db .next/standalone/prisma/mavesoj.db
```

## Step 7: Setup Domain & SSL

1. Point your domain DNS to Hostinger server IP
2. In hPanel → **Domains** → Add domain
3. SSL is usually auto-configured by Hostinger (Let's Encrypt)

## File Permissions

```bash
# Ensure uploads directory is writable
mkdir -p public/uploads
chmod 755 public/uploads

# Ensure database is writable
chmod 664 prisma/mavesoj.db
chmod 755 prisma/
```

## Nginx Reverse Proxy (if needed)

If Hostinger uses Nginx, add this config:

```nginx
server {
    listen 80;
    server_name mavesoj.com www.mavesoj.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### App won't start
```bash
# Check logs
pm2 logs mavesoj

# Check if port is in use
lsof -i :3000
```

### Database errors
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset
```

### Images not loading
- Ensure `public/uploads/` directory exists and is writable
- Check that uploaded images are in `public/uploads/`

### Permission denied
```bash
chown -R $USER:$USER /home/user/mavesoj
chmod -R 755 /home/user/mavesoj
```
