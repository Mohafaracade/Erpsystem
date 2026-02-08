# ✅ JWT Token companyId Fix

## Problem
Backend returns `401 Unauthorized` on protected routes because JWT tokens contain full company object instead of string ObjectId.

## Root Cause
In `backend/models/User.js`, the `generateAuthToken()` method was setting:
```javascript
companyId: this.company || null
```

When `this.company` is a populated object (from `.populate('company')`), the entire object gets serialized into the JWT payload, causing the middleware to fail when comparing companyId.

## Fix Applied

### File: `backend/models/User.js`

**Before:**
```javascript
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      userId: this._id,
      email: this.email,
      role: this.role,
      companyId: this.company || null  // ❌ Could be object or ObjectId
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};
```

**After:**
```javascript
userSchema.methods.generateAuthToken = function() {
  // ✅ FIX: Ensure companyId is always a string ObjectId, never an object
  let companyId = null;
  if (this.company) {
    // Handle both ObjectId and populated company object
    companyId = this.company._id ? this.company._id.toString() : this.company.toString();
  }
  
  return jwt.sign(
    { 
      userId: this._id.toString(),
      email: this.email,
      role: this.role,
      companyId: companyId  // ✅ Always string or null
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};
```

## What Was Fixed

1. **Company ID Conversion**: Always converts company to string ObjectId
   - Handles populated company object: `this.company._id.toString()`
   - Handles ObjectId: `this.company.toString()`
   - Handles null/undefined: `null`

2. **User ID Conversion**: Also ensures `userId` is always a string for consistency

3. **Middleware Compatibility**: The existing middleware already handles string comparison correctly, so no changes needed there

## Testing

### Before Fix:
```javascript
// JWT payload (WRONG):
{
  userId: ObjectId("..."),
  companyId: { _id: ObjectId("..."), name: "...", ... }  // ❌ Full object
}
```

### After Fix:
```javascript
// JWT payload (CORRECT):
{
  userId: "507f1f77bcf86cd799439011",
  companyId: "507f191e810c19729de860ea"  // ✅ String ObjectId
}
```

## Verification

1. **Restart backend server**
2. **Login again** to get new token with correct format
3. **Test protected route:**
   ```http
   GET /api/reports/transactions
   Authorization: Bearer <new_token>
   ```
   Should return `200 OK` instead of `401 Unauthorized`

## Impact

- ✅ JWT tokens now contain string ObjectIds only
- ✅ Middleware can properly validate companyId
- ✅ No breaking changes to existing functionality
- ✅ Works with both populated and non-populated company references

## Status
✅ **FIXED** - JWT tokens now correctly contain companyId as string ObjectId.

