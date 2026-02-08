# 📝 Environment Files Setup

## Quick Setup

Since `.env` files are gitignored (for security), you need to create them manually.

### Backend Setup

1. **Create the file**:
   ```bash
   cd ERP-BMS/backend
   # Windows PowerShell:
   New-Item -Path .env -ItemType File
   # Or manually create a file named .env
   ```

2. **Copy this content** into `backend/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/erp_system
MONGODB_URI=mongodb://localhost:27017/erp_system

# JWT Authentication
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Password Reset
RESET_TOKEN_EXPIRE=30

# Multi-Tenancy Migration
DEFAULT_COMPANY_NAME=Default Company
DEFAULT_COMPANY_EMAIL=admin@defaultcompany.com
SUPER_ADMIN_EMAIL=superadmin@system.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=5
UPLOAD_PATH=./uploads

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# MongoDB Transactions (Optional)
MONGO_DISABLE_TRANSACTIONS=false
```

### Frontend Setup

1. **Create the file**:
   ```bash
   cd ERP-BMS/frontend
   # Windows PowerShell:
   New-Item -Path .env -ItemType File
   # Or manually create a file named .env
   ```

2. **Copy this content** into `frontend/.env`:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api

# Application Configuration (Optional)
VITE_APP_NAME=ERP Management System
```

---

## Required Changes

### 1. Generate JWT Secret

Run this command to generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and replace `your_super_secret_jwt_key_change_this_in_production` in `backend/.env`

### 2. Update MongoDB URI

Replace `mongodb://localhost:27017/erp_system` with your actual MongoDB connection string.

**For MongoDB Atlas**:
```
mongodb+srv://username:password@cluster.mongodb.net/erp_system
```

### 3. Update Frontend URL (if different)

If your frontend runs on a different port, update:
- `CORS_ORIGIN` in `backend/.env`
- `FRONTEND_URL` in `backend/.env`
- `VITE_API_URL` in `frontend/.env`

---

## Production Configuration

For production, update these values:

**Backend**:
- `NODE_ENV=production`
- `MONGO_URI` - Your production MongoDB connection
- `JWT_SECRET` - Strong random secret
- `CORS_ORIGIN=https://yourdomain.com`
- `FRONTEND_URL=https://yourdomain.com`

**Frontend**:
- `VITE_API_URL=https://api.yourdomain.com/api`

---

## File Locations

- Backend: `ERP-BMS/backend/.env`
- Frontend: `ERP-BMS/frontend/.env`

**Note**: These files are gitignored and won't be committed to version control.

---

## Verification

After creating the files, verify they exist:

```bash
# Backend
cd ERP-BMS/backend
dir .env  # Windows
ls -la .env  # Linux/Mac

# Frontend
cd ERP-BMS/frontend
dir .env  # Windows
ls -la .env  # Linux/Mac
```

---

For more details, see `ENV_SETUP_GUIDE.md`

