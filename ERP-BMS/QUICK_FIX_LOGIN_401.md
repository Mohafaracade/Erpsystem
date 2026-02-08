# ⚡ Quick Fix: Login 401 Error

## 🎯 Most Common Cause: Migration Not Run

**The 401 error usually means no users exist in the database yet.**

---

## ✅ Solution: Run Migration

```bash
cd ERP-BMS/backend
node migrations/001_add_multi_tenancy.js
```

**This will create:**
- ✅ Super Admin user
- ✅ Default Company
- ✅ All existing data assigned to company

---

## 🔑 Login Credentials (After Migration)

**Email:** `superadmin@system.com`  
**Password:** `SuperAdmin123!`

---

## ✅ Verify Migration Worked

After running migration, you should see:
```
✅ Connected to MongoDB
✅ Created super admin user
✅ Created default company
✅ Migration completed successfully!
```

---

## 🚀 Test Login

```bash
# Using curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@system.com","password":"SuperAdmin123!"}'
```

**Expected:** `200 OK` with token

---

## ⚠️ If Still Getting 401 After Migration

1. **Check MongoDB connection** - Make sure MongoDB is running
2. **Check .env file** - Verify `MONGO_URI` is correct
3. **Check user exists:**
   ```bash
   mongosh mongodb://localhost:27017/erp_system
   db.users.find({ email: "superadmin@system.com" })
   ```
4. **Verify password** - Make sure you're using exact password: `SuperAdmin123!`

---

## 🔧 Fixed Migration Script

The migration script has been fixed to properly hash passwords. If you ran it before, you may need to:

1. Delete the existing super admin user
2. Run migration again

Or manually fix the password:

```javascript
// In MongoDB shell
const bcrypt = require('bcryptjs');
const hashed = await bcrypt.hash('SuperAdmin123!', 10);
db.users.updateOne(
  { email: "superadmin@system.com" },
  { $set: { password: hashed } }
)
```

---

**Status**: Migration script fixed! Run it and login should work! ✅

