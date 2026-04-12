# Pre-Deployment Checklist

Complete this checklist **BEFORE** deploying to Hostinger.

---

## ✅ Local Testing

- [ ] Run `npm run build` successfully
- [ ] Run `npm start` and test locally
- [ ] Test all critical features:
  - [ ] Homepage loads
  - [ ] Product listing works
  - [ ] Add to cart functionality
  - [ ] Checkout process (create test order)
  - [ ] Admin login at `/cdlogin`
  - [ ] Dashboard displays correctly
  - [ ] Image uploads work
- [ ] No console errors in browser
- [ ] No build warnings (or all understood/acceptable)

---

## 🔐 Security

- [ ] **CRITICAL:** Generate new `NEXTAUTH_SECRET` for production
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Change all default passwords
- [ ] Create strong admin account password
- [ ] Verify `.env` is in `.gitignore`
- [ ] No sensitive data committed to Git
- [ ] SMTP credentials ready (Gmail App Password or other)

---

## ⚙️ Configuration Files

- [ ] `.env.production.example` filled with real values
- [ ] `next.config.ts` has correct domain in `remotePatterns`
- [ ] `ecosystem.config.js` reviewed
- [ ] Database path correct in production `.env`

---

## 📧 Email Setup

- [ ] SMTP credentials obtained
- [ ] If using Gmail:
  - [ ] 2-Factor Authentication enabled
  - [ ] App Password generated
- [ ] Test email sent successfully in local production mode
- [ ] Admin email configured

---

## 🗄️ Database

- [ ] All migrations created (`npx prisma migrate dev`)
- [ ] Schema is finalized
- [ ] Test data removed (if any)
- [ ] Admin user creation plan ready

---

## 🌐 Domain & Hosting

- [ ] Hostinger Node.js hosting plan active
- [ ] Domain DNS pointing to Hostinger
- [ ] SSL certificate will be enabled
- [ ] SSH access enabled in Hostinger cPanel

---

## 📦 Dependencies

- [ ] `package.json` has all required dependencies
- [ ] No development-only packages in production dependencies
- [ ] `sharp` package included (for image optimization)

---

## 🚀 Deployment Files

- [ ] `ecosystem.config.js` created
- [ ] `.env.production.example` created
- [ ] `deploy.sh` created and executable
- [ ] `HOSTINGER_DEPLOY.md` guide reviewed

---

## 📸 Media Files

- [ ] Existing uploaded images backed up
- [ ] Plan to migrate uploads to server
- [ ] Understand upload path will be `public/uploads/`

---

## 🔄 Git Repository

- [ ] All changes committed
- [ ] Pushed to GitHub/GitLab
- [ ] Repository accessible from server (public or SSH keys set up)
- [ ] `.gitignore` updated to exclude logs, backups, PM2 files

---

## 📊 Monitoring & Backup

- [ ] Understand how to check PM2 logs (`pm2 logs`)
- [ ] Backup strategy planned
- [ ] Know how to rollback if deployment fails

---

## 🧪 Post-Deployment Testing Plan

After deployment, test:
- [ ] Homepage loads with HTTPS
- [ ] All pages accessible
- [ ] Products display with images
- [ ] Cart functionality
- [ ] Complete a test order
- [ ] Admin login works
- [ ] Dashboard loads
- [ ] Email notifications received
- [ ] Image uploads work on production

---

## 📞 Support Contacts

- [ ] Hostinger support link saved: https://www.hostinger.com/help
- [ ] Know where deployment logs are (`~/logs/`)
- [ ] Understand how to SSH into server

---

## Final Check

**Before running deployment:**

```bash
# 1. Test build locally
npm run build
npm start

# 2. Generate production secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Commit everything
git add .
git commit -m "Production deployment ready"
git push origin main

# 4. Review deployment guide
cat HOSTINGER_DEPLOY.md
```

---

## Ready to Deploy? 🚀

If all checkboxes are ✅, proceed with [HOSTINGER_DEPLOY.md](HOSTINGER_DEPLOY.md)

**Remember:**
- Take your time
- Read each step carefully
- Keep SSH connection open
- Monitor logs after deployment
- Don't panic if something fails - you can always rollback

Good luck! 🎉
