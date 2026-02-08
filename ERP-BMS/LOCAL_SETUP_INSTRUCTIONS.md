# 🚀 Local Development Setup - Backend .env File

## Quick Setup for Local Database

### Step 1: Ensure MongoDB is Running Locally

**Windows:**
```bash
# Check if MongoDB is running
# Open Services (services.msc) and look for "MongoDB"

# Or start MongoDB service:
net start MongoDB

# Or if installed as service:
sc start MongoDB
```

**Linux/Mac:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod
```

**Or use MongoDB Compass** to verify connection to `mongodb://localhost:27017`

---

### Step 2: Create Backend .env File

1. Navigate to `ERP-BMS/backend/` directory
2. Create a new file named `.env`
3. Copy the content below into the file

---

## 📋 Backend .env File Content (Local Database)

```env
# ============================================
# Server Configuration
# ============================================
NODE_ENV=development
PORT=5000

# ============================================
# Database Configuration - LOCAL MONGODB
# ============================================
MONGO_URI=mongodb://localhost:27017/erp_system
MONGODB_URI=mongodb://localhost:27017/erp_system

# ============================================
# JWT Authentication
# ============================================
# Generate secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# ============================================
# Password Reset
# ============================================
RESET_TOKEN_EXPIRE=30

# ============================================
# Multi-Tenancy Migration
# ============================================
DEFAULT_COMPANY_NAME=Default Company
DEFAULT_COMPANY_EMAIL=admin@defaultcompany.com
SUPER_ADMIN_EMAIL=superadmin@system.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!

# ============================================
# CORS Configuration
# ============================================
# Frontend URL - Update if your frontend runs on different port
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# ============================================
# File Upload Configuration
# ============================================
MAX_FILE_SIZE=5
UPLOAD_PATH=./uploads

# ============================================
# Email Configuration (Optional)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ============================================
# MongoDB Transactions
# ============================================
MONGO_DISABLE_TRANSACTIONS=false
```

---

## 🔧 Required Changes

### 1. Generate JWT Secret

**IMPORTANT**: Generate a secure JWT secret before running the application:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and replace `your_super_secret_jwt_key_change_this_in_production` in the `.env` file.

### 2. Update Frontend URL (if needed)

If your frontend runs on a different port, update:
- `CORS_ORIGIN` - Your frontend URL
- `FRONTEND_URL` - Your frontend URL

**Common ports:**
- Vite default: `http://localhost:5173`
- Create React App: `http://localhost:3000`
- Custom: `http://localhost:YOUR_PORT`

---

## ✅ Verification

### Check MongoDB Connection

```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017/erp_system

# Or using MongoDB Compass
# Connect to: mongodb://localhost:27017
```

### Verify .env File

```bash
cd ERP-BMS/backend

# Windows PowerShell:
Test-Path .env

# Windows CMD:
dir .env

# Linux/Mac:
ls -la .env
```

---

## 🚀 Next Steps

1. ✅ MongoDB is running locally
2. ✅ `.env` file created with content above
3. ✅ JWT_SECRET generated and updated
4. ✅ Frontend URL updated (if needed)

**Now you can:**

```bash
# Install dependencies (if not done)
cd ERP-BMS/backend
npm install

# Run migration (first time only)
node migrations/001_add_multi_tenancy.js

# Start the backend server
npm start
# or
npm run dev
```

---

## 🐛 Troubleshooting

### Issue: "MONGO_URI is missing"
**Solution**: Make sure `.env` file exists in `backend/` directory

### Issue: "MongoDB connection error"
**Solution**: 
1. Verify MongoDB is running: `mongosh mongodb://localhost:27017`
2. Check MongoDB service is started
3. Verify port 27017 is not blocked by firewall

### Issue: "Cannot connect to MongoDB"
**Solution**:
- Check MongoDB is installed: `mongod --version`
- Check MongoDB is running: Check Services (Windows) or `systemctl status mongod` (Linux)
- Try connecting with MongoDB Compass: `mongodb://localhost:27017`

### Issue: CORS errors in frontend
**Solution**: Update `CORS_ORIGIN` in `.env` to match your frontend URL exactly

---

## 📝 File Location

**Backend .env file**: `ERP-BMS/backend/.env`

**Note**: This file is gitignored and won't be committed to version control.

---

## 🔐 Security Reminder

- ✅ `.env` file is already in `.gitignore`
- ⚠️ Change `SUPER_ADMIN_PASSWORD` after first login
- ⚠️ Generate a strong `JWT_SECRET` (don't use the example value)
- ⚠️ Never commit `.env` file to version control

---

*For production setup, see `DEPLOYMENT_GUIDE_COMPLETE.md`*

