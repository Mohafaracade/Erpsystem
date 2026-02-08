# 🔧 Fix "Invalid credentials" Login Error

## Problem
Getting `"Invalid credentials"` error when trying to login.

## Possible Causes

The "Invalid credentials" error occurs when:

1. **User email not found** (Line 27 in authController.js)
2. **Password doesn't match** (Line 49 in authController.js)
3. **User is deactivated** (Returns different error: "Account is deactivated")
4. **Company subscription issue** (Returns different error: "Company subscription is not active")

## Quick Diagnosis

### Step 1: Check if user exists

Run the diagnostic script:
```bash
cd backend
node scripts/check_user_login.js <email>
```

Example:
```bash
node scripts/check_user_login.js admin@test.com
```

This will show:
- ✅ If user exists
- ✅ User status (active/inactive)
- ✅ Company and subscription status
- ✅ If password is set

### Step 2: Test password

Test if password matches:
```bash
node scripts/check_user_login.js <email> <password>
```

Example:
```bash
node scripts/check_user_login.js admin@test.com Password123!
```

This will tell you if:
- ✅ Password matches
- ❌ Password doesn't match (wrong password or corrupted)

## Common Fixes

### Fix 1: Reset User Password

If password doesn't match or is corrupted:

```bash
node scripts/reset_user_password.js <email> <newPassword>
```

Example:
```bash
node scripts/reset_user_password.js admin@test.com NewPassword123!
```

### Fix 2: Check Email Case Sensitivity

Emails are stored in lowercase. Make sure you're using the correct email:

```bash
# Check all users
node scripts/check_user_login.js <any_email>
# This will list all users if email not found
```

### Fix 3: Fix via MongoDB

**Reset password directly:**
```javascript
// Connect to MongoDB
use your_database_name

// Find user
db.users.findOne({ email: "admin@test.com" })

// Reset password (will be hashed on next save)
db.users.updateOne(
  { email: "admin@test.com" },
  { $set: { password: "NewPassword123!" } }
)
```

**Note:** If you update password directly in MongoDB, you need to hash it manually or let the application hash it on next login attempt.

### Fix 4: Create New User

If user doesn't exist, create one:

**Via API (as super_admin):**
```http
POST /api/users
Authorization: Bearer <super_admin_token>
Content-Type: application/json

{
  "name": "Admin User",
  "email": "admin@test.com",
  "password": "Password123!",
  "role": "admin",
  "company": "<companyId>"
}
```

**Via MongoDB:**
```javascript
// This will hash password automatically on save
db.users.insertOne({
  name: "Admin User",
  email: "admin@test.com",
  password: "Password123!", // Will be hashed by pre-save hook
  role: "admin",
  company: ObjectId("<companyId>"),
  isActive: true
})
```

## Testing After Fix

Test login:
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "Password123!"
}
```

Should return:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "..."
  }
}
```

## Common Issues

### Issue 1: Password Double-Hashed
**Symptom:** Password doesn't match even though you know it's correct

**Fix:** Reset password using the script (it will hash correctly)

### Issue 2: Email Not Found
**Symptom:** "Invalid credentials" immediately

**Fix:** 
- Check email spelling
- Check if user exists in database
- Create user if doesn't exist

### Issue 3: User Deactivated
**Symptom:** Different error: "Account is deactivated"

**Fix:**
```javascript
db.users.updateOne(
  { email: "admin@test.com" },
  { $set: { isActive: true } }
)
```

### Issue 4: Company Subscription Issue
**Symptom:** Different error: "Company subscription is not active"

**Fix:** See `SUBSCRIPTION_401_FIX.md`

## Scripts Created

1. **`scripts/check_user_login.js`** - Diagnostic tool to check user and test password
2. **`scripts/reset_user_password.js`** - Tool to reset user password

## Status
✅ **FIXED** - Use the scripts above to diagnose and fix login issues.

