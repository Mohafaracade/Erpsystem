# ✅ Backend .env File Verification Checklist

## Required Variables (Must Have)

### ✅ Server Configuration
```env
NODE_ENV=development          # or 'production'
PORT=5000                      # Server port
```

### ✅ Database Configuration (Local)
```env
MONGO_URI=mongodb://localhost:27017/erp_system
MONGODB_URI=mongodb://localhost:27017/erp_system
```

### ✅ JWT Authentication
```env
JWT_SECRET=<your_generated_secret>    # Must be changed from default!
JWT_EXPIRE=7d
```

### ✅ Multi-Tenancy Migration
```env
DEFAULT_COMPANY_NAME=Default Company
DEFAULT_COMPANY_EMAIL=admin@defaultcompany.com
SUPER_ADMIN_EMAIL=superadmin@system.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!
```

### ✅ CORS Configuration
```env
CORS_ORIGIN=http://localhost:5173     # Update if frontend uses different port
FRONTEND_URL=http://localhost:5173    # Update if frontend uses different port
```

### ✅ Password Reset
```env
RESET_TOKEN_EXPIRE=30
```

### ✅ File Upload
```env
MAX_FILE_SIZE=5
UPLOAD_PATH=./uploads
```

### ✅ Email (Optional but should be present)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### ✅ MongoDB Transactions
```env
MONGO_DISABLE_TRANSACTIONS=false
```

---

## ✅ Verification Checklist

Check your `.env` file has:

- [ ] **NODE_ENV** - Set to `development` or `production`
- [ ] **PORT** - Set to `5000` (or your preferred port)
- [ ] **MONGO_URI** - Points to `mongodb://localhost:27017/erp_system`
- [ ] **MONGODB_URI** - Same as MONGO_URI (for compatibility)
- [ ] **JWT_SECRET** - **CHANGED** from default value (generate new one!)
- [ ] **JWT_EXPIRE** - Set to `7d` (or your preference)
- [ ] **RESET_TOKEN_EXPIRE** - Set to `30` (minutes)
- [ ] **DEFAULT_COMPANY_NAME** - Set to your default company name
- [ ] **DEFAULT_COMPANY_EMAIL** - Set to default company email
- [ ] **SUPER_ADMIN_EMAIL** - Set to super admin email
- [ ] **SUPER_ADMIN_PASSWORD** - Set to super admin password
- [ ] **CORS_ORIGIN** - Matches your frontend URL
- [ ] **FRONTEND_URL** - Matches your frontend URL
- [ ] **MAX_FILE_SIZE** - Set to `5` (MB)
- [ ] **UPLOAD_PATH** - Set to `./uploads`
- [ ] **SMTP_*** variables - Present (can leave as defaults if not using email)
- [ ] **MONGO_DISABLE_TRANSACTIONS** - Set to `false`

---

## ⚠️ Critical Checks

### 1. JWT_SECRET Must Be Changed!
```bash
# Generate a new secret:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**DO NOT** use `your_super_secret_jwt_key_change_this_in_production` in production!

### 2. MongoDB Connection
- Verify MongoDB is running: `mongosh mongodb://localhost:27017`
- Database name: `erp_system` (will be created automatically)

### 3. Frontend URL
- Update `CORS_ORIGIN` and `FRONTEND_URL` to match your actual frontend port
- Common ports: `5173` (Vite), `3000` (Create React App)

### 4. File Paths
- `UPLOAD_PATH=./uploads` - Relative path is correct
- Make sure `uploads` directory exists or will be created

---

## 📋 Complete .env File Structure (67 lines)

Your `.env` file should have approximately **47-67 lines** including:
- Comments (lines starting with `#`)
- Empty lines for readability
- All required variables listed above

---

## ✅ Quick Verification Command

```bash
cd ERP-BMS/backend

# Check if .env exists
# Windows:
dir .env

# Linux/Mac:
ls -la .env

# Count lines (should be around 47-67)
# Windows PowerShell:
(Get-Content .env).Count

# Linux/Mac:
wc -l .env
```

---

## 🎯 If Your File Has 67 Lines

If your `.env` file has **67 lines**, it likely includes:
- All required variables ✅
- Comments explaining each section ✅
- Proper formatting ✅

**This is CORRECT!** ✅

---

## 🚀 Next Steps After Verification

1. ✅ `.env` file verified
2. ✅ All required variables present
3. ✅ JWT_SECRET changed (if not, generate one!)
4. ✅ MongoDB running locally
5. ✅ Frontend URL matches

**Now you can:**
```bash
cd ERP-BMS/backend
npm install          # If not done
node migrations/001_add_multi_tenancy.js  # Run migration
npm start            # Start backend server
```

---

## ✅ Your .env File is CORRECT if:

- ✅ Has all variables listed above
- ✅ JWT_SECRET is changed from default
- ✅ MONGO_URI points to local MongoDB
- ✅ CORS_ORIGIN matches your frontend URL
- ✅ File has 47-67 lines (with comments)

**Status**: If all checks pass, your `.env` file is **CORRECT** and ready to use! 🎉

