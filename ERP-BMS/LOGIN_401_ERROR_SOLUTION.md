# 🔧 Fix: POST /api/auth/login 401 Error

## Problem
Getting `401 Unauthorized` error when trying to login.

## Possible Causes & Solutions

### 1. ✅ User Doesn't Exist (Most Common)

**Cause**: No users in database yet, or migration hasn't been run.

**Solution**: Run the migration to create Super Admin user:

```bash
cd ERP-BMS/backend
node migrations/001_add_multi_tenancy.js
```

**After migration, login with:**
- Email: `superadmin@system.com` (or your SUPER_ADMIN_EMAIL)
- Password: `SuperAdmin123!` (or your SUPER_ADMIN_PASSWORD)

---

### 2. ✅ Wrong Email or Password

**Check**:
- Email is case-insensitive but must match exactly
- Password must match exactly (case-sensitive)

**Solution**: 
- Verify email in database
- Try resetting password if needed

---

### 3. ✅ User is Inactive

**Cause**: User's `isActive` field is `false`.

**Solution**: Check and activate user in database:

```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { isActive: true } }
)
```

---

### 4. ✅ Company is Inactive

**Cause**: User's company has `isActive: false`.

**Solution**: Activate the company:

```javascript
// In MongoDB shell or Compass
db.companies.updateOne(
  { _id: ObjectId("company_id") },
  { $set: { isActive: true } }
)
```

---

### 5. ✅ Company Subscription Not Active

**Cause**: Company subscription status is not 'active' or 'trial'.

**Solution**: Update subscription status:

```javascript
// In MongoDB shell or Compass
db.companies.updateOne(
  { _id: ObjectId("company_id") },
  { $set: { "subscription.status": "active" } }
)
```

---

### 6. ✅ Password Hash Issue

**Cause**: Password wasn't hashed properly when user was created.

**Solution**: Reset the user's password:

```javascript
// In MongoDB shell - hash a new password
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash('NewPassword123!', 10);

// Update user
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { password: hashedPassword } }
)
```

---

## 🔍 Debugging Steps

### Step 1: Check if User Exists

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/erp_system

# Check users
db.users.find({ email: "superadmin@system.com" }).pretty()
```

### Step 2: Check User Status

```javascript
// In MongoDB shell
db.users.findOne({ email: "superadmin@system.com" }, {
  email: 1,
  isActive: 1,
  role: 1,
  company: 1
})
```

### Step 3: Check Company Status

```javascript
// In MongoDB shell
db.companies.find().pretty()
```

### Step 4: Verify Password

The password should be hashed with bcrypt. Check if it exists:

```javascript
// In MongoDB shell
db.users.findOne({ email: "superadmin@system.com" }, {
  password: 1
})
```

---

## 🚀 Quick Fix: Run Migration

**If you haven't run the migration yet:**

```bash
cd ERP-BMS/backend

# Make sure .env file is configured
# Then run migration
node migrations/001_add_multi_tenancy.js
```

**This will create:**
- ✅ Super Admin user
- ✅ Default Company
- ✅ Assign existing users to company

**Then login with:**
- Email: `superadmin@system.com`
- Password: `SuperAdmin123!`

---

## 🛠️ Manual User Creation (If Migration Fails)

If migration doesn't work, create user manually:

```javascript
// In MongoDB shell
const bcrypt = require('bcryptjs');
const password = await bcrypt.hash('SuperAdmin123!', 10);

db.users.insertOne({
  name: "System Super Admin",
  email: "superadmin@system.com",
  password: password,
  role: "super_admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## ✅ Verification Checklist

- [ ] Migration has been run
- [ ] User exists in database
- [ ] User's `isActive` is `true`
- [ ] User has correct email
- [ ] User's password is hashed
- [ ] If user has company, company is active
- [ ] If user has company, subscription status is 'active' or 'trial'
- [ ] JWT_SECRET is set in .env file

---

## 🎯 Most Likely Solution

**90% of the time**, the issue is:

1. **Migration hasn't been run** → Run `node migrations/001_add_multi_tenancy.js`
2. **Wrong credentials** → Use email: `superadmin@system.com`, password: `SuperAdmin123!`

---

## 📝 Test Login After Fix

```bash
# Test with curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@system.com","password":"SuperAdmin123!"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 🔐 Common Login Credentials (After Migration)

**Super Admin:**
- Email: `superadmin@system.com`
- Password: `SuperAdmin123!`

**⚠️ Change password after first login!**

---

*If issue persists, check backend logs for more details.*

