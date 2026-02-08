# 🔧 Fix Login 401 Error - Run This Now!

## ⚡ Quick Fix Script

I've created a script that will automatically fix your login issue.

### Step 1: Run the Fix Script

```bash
cd ERP-BMS/backend
node fix_login.js
```

**This script will:**
- ✅ Check if super admin user exists
- ✅ Create user if it doesn't exist
- ✅ Fix password if it's double-hashed
- ✅ Ensure user is active
- ✅ Test login credentials
- ✅ Display login credentials

---

## 🔑 Login Credentials

After running the script, use these credentials:

**Email:** `superadmin@system.com`  
**Password:** `SuperAdmin123!`

*(Or whatever you set in your .env file)*

---

## ✅ What the Script Does

1. **Connects to MongoDB** using your `.env` configuration
2. **Checks for super admin user** - Creates if missing
3. **Fixes password** - Re-hashes if double-hashed or incorrect
4. **Activates user** - Ensures `isActive: true`
5. **Tests login** - Verifies password works
6. **Shows credentials** - Displays email and password

---

## 🚀 After Running the Script

1. ✅ Script completes successfully
2. ✅ You see login credentials displayed
3. ✅ Try logging in with those credentials
4. ✅ Should get `200 OK` instead of `401`

---

## 🐛 If Script Fails

### Error: "MONGO_URI is missing"
**Solution:** Make sure your `.env` file has `MONGO_URI=mongodb://localhost:27017/erp_system`

### Error: "Cannot connect to MongoDB"
**Solution:** 
- Make sure MongoDB is running
- Check connection string in `.env`
- Try: `mongosh mongodb://localhost:27017` to test connection

### Error: "User creation failed"
**Solution:** Check MongoDB permissions and connection

---

## 📝 Manual Fix (If Script Doesn't Work)

If the script doesn't work, manually fix in MongoDB:

```javascript
// Connect to MongoDB
mongosh mongodb://localhost:27017/erp_system

// Delete existing user (if exists)
db.users.deleteOne({ email: "superadmin@system.com" })

// Exit and run migration
exit
```

Then run:
```bash
node migrations/001_add_multi_tenancy.js
```

---

## ✅ Expected Output

When script runs successfully, you should see:

```
🔧 Fixing Login Issue...

✅ Connected to MongoDB

✅ Super admin user found

🔐 Fixing password...
✅ Password fixed (re-hashed correctly)

🧪 Testing login...
✅ Login test passed!

==================================================
📋 LOGIN CREDENTIALS:
==================================================
Email: superadmin@system.com
Password: SuperAdmin123!
==================================================

✅ Login issue fixed!
🚀 You can now login with the credentials above.
```

---

## 🎯 Next Steps

1. ✅ Run `node fix_login.js`
2. ✅ Copy the credentials shown
3. ✅ Try logging in with those credentials
4. ✅ Should work now! 🎉

---

**Run the script now to fix your login issue!**

