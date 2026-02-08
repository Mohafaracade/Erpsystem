# 🚀 Complete Deployment Guide - Multi-Tenant ERP SaaS

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Migration](#database-migration)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Production Checklist](#production-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v18.x or higher
- **MongoDB**: v5.0+ (or MongoDB Atlas account)
- **Git**: For version control
- **PM2**: For process management (production)

### Required Accounts/Services
- MongoDB database (local or Atlas)
- Domain name (optional, for production)
- SSL certificate (for HTTPS in production)

---

## Environment Setup

### Backend Environment Variables

Create `ERP-BMS/backend/.env` file:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/erp_system
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/erp_system

# JWT Authentication
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_32_characters_minimum
JWT_EXPIRE=7d

# Password Reset
RESET_TOKEN_EXPIRE=30

# Multi-Tenancy Migration
DEFAULT_COMPANY_NAME=Default Company
DEFAULT_COMPANY_EMAIL=admin@defaultcompany.com
SUPER_ADMIN_EMAIL=superadmin@system.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# File Upload
MAX_FILE_SIZE=5
UPLOAD_PATH=./uploads

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Frontend Environment Variables

Create `ERP-BMS/frontend/.env` file:

```env
# API Configuration
VITE_API_URL=https://yourdomain.com/api

# Application Name (Optional)
VITE_APP_NAME=ERP Management System
```

---

## Database Migration

### ⚠️ IMPORTANT: Backup First!

Before running migration, **backup your database**:

```bash
# MongoDB local backup
mongodump --db=erp_system --out=./backup

# MongoDB Atlas: Use Atlas UI backup feature
```

### Run Migration

```bash
cd ERP-BMS/backend
node migrations/001_add_multi_tenancy.js
```

### What the Migration Does:

1. ✅ Creates Super Admin user (if doesn't exist)
2. ✅ Creates Default Company (if doesn't exist)
3. ✅ Assigns all existing users to Default Company
4. ✅ Adds `company_id` to all existing records:
   - Customers
   - Invoices
   - Items
   - Expenses
   - Sales Receipts
   - Activity Logs
5. ✅ Updates existing counters to be company-specific
6. ✅ Updates user roles (admin → company_admin)

### Verify Migration

After migration, verify:

```bash
# Check Super Admin exists
# Login with SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD

# Check Default Company exists
# Should see "Default Company" in companies list

# Check data isolation
# Login as regular user, should only see their company's data
```

---

## Backend Deployment

### Step 1: Install Dependencies

```bash
cd ERP-BMS/backend
npm install --production
```

### Step 2: Configure Environment

```bash
# Copy example file
cp .env.example .env

# Edit with your values
nano .env
```

### Step 3: Start with PM2 (Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name erp-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### Step 4: Configure Nginx (Reverse Proxy)

Create `/etc/nginx/sites-available/erp-backend`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/erp-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Setup SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## Frontend Deployment

### Step 1: Build for Production

```bash
cd ERP-BMS/frontend
npm install
npm run build
```

This creates a `dist` folder with production-ready files.

### Step 2: Configure Environment

```bash
# Create .env file
echo "VITE_API_URL=https://api.yourdomain.com/api" > .env

# Rebuild with correct API URL
npm run build
```

### Step 3: Deploy with Nginx

Create `/etc/nginx/sites-available/erp-frontend`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /path/to/ERP-BMS/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://api.yourdomain.com;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/erp-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Setup SSL

```bash
sudo certbot --nginx -d yourdomain.com
```

---

## Production Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database backed up
- [ ] JWT_SECRET is strong and unique
- [ ] SUPER_ADMIN_PASSWORD changed from default
- [ ] CORS_ORIGIN set to production domain
- [ ] FRONTEND_URL set to production domain
- [ ] MongoDB connection string verified
- [ ] SSL certificates obtained

### Migration

- [ ] Migration script run successfully
- [ ] Super Admin user created
- [ ] Default Company created
- [ ] All existing data migrated
- [ ] Company isolation verified

### Security

- [ ] Public registration disabled ✅ (Already done)
- [ ] IDOR protection verified ✅ (Already done)
- [ ] Company data isolation tested ✅ (Already done)
- [ ] JWT tokens expire correctly
- [ ] Password reset emails working (if configured)
- [ ] HTTPS enabled
- [ ] CORS configured correctly

### Functionality

- [ ] Super Admin can login
- [ ] Super Admin can create companies
- [ ] Company Admin can create users
- [ ] Users can only see their company's data
- [ ] Reports show only company data
- [ ] Invoice/Receipt numbers are company-specific
- [ ] All CRUD operations work
- [ ] File uploads work

### Monitoring

- [ ] PM2 monitoring setup
- [ ] Error logging configured
- [ ] Database backups scheduled
- [ ] Uptime monitoring setup
- [ ] Performance monitoring (optional)

---

## Troubleshooting

### Issue: Migration Fails

**Symptoms**: Error connecting to MongoDB or migration script crashes

**Solutions**:
1. Check MongoDB connection string in `.env`
2. Verify MongoDB is running: `mongosh --eval "db.adminCommand('ping')"`
3. Check database permissions
4. Verify environment variables are loaded: `console.log(process.env.MONGO_URI)`

### Issue: Users Can't Login After Migration

**Symptoms**: Login fails with "Invalid credentials" or "User not found"

**Solutions**:
1. Verify user has `company` field set
2. Check company is `isActive: true`
3. Verify user password hasn't changed
4. Check JWT_SECRET matches between environments
5. Try logging in as Super Admin first

### Issue: Data Not Showing

**Symptoms**: Empty lists, no data in reports

**Solutions**:
1. Verify `company_id` is set on records
2. Check user has `company` field populated
3. Verify `companyScope` middleware is working
4. Check browser console for API errors
5. Verify API URL in frontend `.env`

### Issue: Cross-Company Data Leakage

**Symptoms**: Users can see other companies' data

**Solutions**:
1. Verify `companyScope` middleware is applied to all routes
2. Check all queries include `company: req.company` filter
3. Test IDOR protection manually
4. Review controller code for missing filters

### Issue: Super Admin Can't Access All Data

**Symptoms**: Super Admin sees empty data or gets 403 errors

**Solutions**:
1. Verify role is exactly `'super_admin'` (case-sensitive)
2. Check JWT token includes `role: 'super_admin'`
3. Verify `isSuperAdmin` middleware logic
4. Check `companyScope` allows super admin bypass

### Issue: Frontend Can't Connect to Backend

**Symptoms**: Network errors, CORS errors, 404 on API calls

**Solutions**:
1. Verify `VITE_API_URL` in frontend `.env`
2. Check backend is running: `pm2 list`
3. Verify CORS_ORIGIN includes frontend domain
4. Check Nginx proxy configuration
5. Verify SSL certificates are valid
6. Check firewall rules allow port 5000

### Issue: PM2 Process Crashes

**Symptoms**: Application stops running, PM2 shows "errored"

**Solutions**:
1. Check logs: `pm2 logs erp-backend`
2. Verify environment variables are set
3. Check MongoDB connection
4. Verify all dependencies installed
5. Check disk space: `df -h`
6. Review error logs for specific issues

---

## Post-Deployment Tasks

### 1. Change Super Admin Password

**IMPORTANT**: Change the default Super Admin password immediately!

1. Login as Super Admin
2. Go to Settings → Change Password
3. Use a strong, unique password

### 2. Create Your First Company

1. Login as Super Admin
2. Navigate to Companies
3. Click "Create Company"
4. Fill in company details
5. Create initial Company Admin user

### 3. Test Data Isolation

1. Create two companies (Company A and Company B)
2. Create users in each company
3. Login as Company A user
4. Verify you can only see Company A's data
5. Try accessing Company B's data (should fail with 404)

### 4. Setup Monitoring

```bash
# PM2 monitoring
pm2 monit

# Setup PM2 web interface (optional)
pm2 web
```

### 5. Schedule Backups

```bash
# Create backup script
cat > /path/to/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="your_mongodb_uri" --out=/path/to/backups/backup_$DATE
# Keep only last 7 days
find /path/to/backups -type d -mtime +7 -exec rm -rf {} +
EOF

chmod +x /path/to/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## Security Best Practices

1. ✅ **Public Registration Disabled** - Only Super Admin can create companies
2. ✅ **IDOR Protection** - All endpoints validate company ownership
3. ✅ **Data Isolation** - Company-scoped queries prevent data leakage
4. ✅ **Role-Based Access** - Hierarchical permissions enforced
5. ✅ **JWT Security** - Tokens expire, include company context
6. ✅ **HTTPS Required** - SSL/TLS encryption in production
7. ✅ **Strong Secrets** - JWT_SECRET is 32+ characters
8. ✅ **Input Validation** - All user inputs validated
9. ✅ **Error Handling** - No sensitive data in error messages
10. ✅ **CORS Configured** - Only allowed origins can access API

---

## Support & Maintenance

### Regular Tasks

- **Daily**: Check PM2 logs for errors
- **Weekly**: Review user activity logs
- **Monthly**: Update dependencies, review security patches
- **Quarterly**: Full system backup and restore test

### Monitoring Endpoints

- Health check: `GET /api/health` (if implemented)
- PM2 status: `pm2 status`
- Database connection: Check MongoDB logs

---

## 🎉 Deployment Complete!

Your multi-tenant ERP SaaS system is now live and ready for production use!

**Next Steps**:
1. Change Super Admin password
2. Create your first company
3. Add users to your company
4. Start using the system!

For issues or questions, refer to the troubleshooting section or check the logs.

---

*Last Updated: Phase 8 - Deployment Guide Complete*

