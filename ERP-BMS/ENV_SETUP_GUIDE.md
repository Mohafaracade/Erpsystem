# 🔧 Environment Variables Setup Guide

## Quick Start

1. **Backend**: Copy `backend/.env.example` to `backend/.env` and fill in your values
2. **Frontend**: Copy `frontend/.env.example` to `frontend/.env` and fill in your values

---

## Backend Environment Variables

### Required Variables

#### Server Configuration
```env
NODE_ENV=development          # or 'production'
PORT=5000                      # Server port
```

#### Database
```env
MONGO_URI=mongodb://localhost:27017/erp_system
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/erp_system
```

#### JWT Authentication
```env
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d                  # Token expiration (7 days)
```

#### Multi-Tenancy Migration
```env
DEFAULT_COMPANY_NAME=Default Company
DEFAULT_COMPANY_EMAIL=admin@defaultcompany.com
SUPER_ADMIN_EMAIL=superadmin@system.com
SUPER_ADMIN_PASSWORD=SuperAdmin123!
```

#### CORS & Frontend
```env
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Optional Variables

#### Password Reset
```env
RESET_TOKEN_EXPIRE=30         # Minutes until reset token expires
```

#### File Upload
```env
MAX_FILE_SIZE=5               # Maximum file size in MB
UPLOAD_PATH=./uploads         # Upload directory
```

#### Email (Optional - for password reset emails)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### MongoDB Transactions
```env
MONGO_DISABLE_TRANSACTIONS=false
```

---

## Frontend Environment Variables

### Required Variables

```env
VITE_API_URL=http://localhost:5000/api
```

### Optional Variables

```env
VITE_APP_NAME=ERP Management System
```

---

## Setup Instructions

### Step 1: Backend Setup

```bash
cd ERP-BMS/backend

# Copy the example file
cp .env.example .env

# Edit with your values
nano .env  # or use your preferred editor
```

**Minimum Required Values**:
- `MONGO_URI` - Your MongoDB connection string
- `JWT_SECRET` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `CORS_ORIGIN` - Your frontend URL
- `FRONTEND_URL` - Your frontend URL

### Step 2: Frontend Setup

```bash
cd ERP-BMS/frontend

# Copy the example file
cp .env.example .env

# Edit with your values
nano .env  # or use your preferred editor
```

**Required Value**:
- `VITE_API_URL` - Your backend API URL

---

## Generating JWT Secret

**Important**: Use a strong, random secret for production!

```bash
# Generate a secure 32-byte hex string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`.

---

## Production Configuration

### Backend Production Settings

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/erp_system
JWT_SECRET=<strong_random_32_character_string>
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Frontend Production Settings

```env
VITE_API_URL=https://api.yourdomain.com/api
```

---

## Security Checklist

- [ ] `JWT_SECRET` is a strong random string (32+ characters)
- [ ] `SUPER_ADMIN_PASSWORD` changed from default
- [ ] `MONGO_URI` uses secure connection (SSL/TLS)
- [ ] `CORS_ORIGIN` set to specific domain (not `*`)
- [ ] `.env` files are in `.gitignore` (already configured)
- [ ] Production uses HTTPS
- [ ] SMTP credentials are secure (if using email)

---

## Troubleshooting

### Issue: "MONGO_URI is missing"
**Solution**: Ensure `.env` file exists in `backend/` directory and contains `MONGO_URI`

### Issue: "JWT_SECRET is missing"
**Solution**: Add `JWT_SECRET` to your `.env` file

### Issue: CORS errors
**Solution**: Check `CORS_ORIGIN` matches your frontend URL exactly

### Issue: Frontend can't connect to API
**Solution**: Verify `VITE_API_URL` in frontend `.env` matches backend URL

---

## File Locations

- **Backend**: `ERP-BMS/backend/.env`
- **Frontend**: `ERP-BMS/frontend/.env`
- **Example Files**: `ERP-BMS/backend/.env.example` and `ERP-BMS/frontend/.env.example`

---

## Important Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Use `.env.example` as template** - These are safe to commit
3. **Change default passwords** - Especially `SUPER_ADMIN_PASSWORD`
4. **Use strong secrets** - Generate random strings for `JWT_SECRET`
5. **Update for production** - Change all URLs and secrets for production

---

*For detailed deployment instructions, see `DEPLOYMENT_GUIDE_COMPLETE.md`*

