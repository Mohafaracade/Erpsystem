# 🔒 Role-Based Access Control (RBAC) Security Audit

**Date:** 2024  
**Audit Type:** Production Security Audit  
**Focus:** Role separation between `admin` and `company_admin`

---

## 📋 EXECUTIVE SUMMARY

**Status:** 🔴 **CRITICAL SECURITY ISSUES FOUND**

**Issues Found:**
- 🔴 **1 CRITICAL** - Backend allows `admin` to manage users
- 🟠 **2 HIGH** - Frontend exposes user management UI to `admin`
- 🟡 **1 MEDIUM** - Missing explicit route-level authorization

**Verified Correct:**
- ✅ Role source of truth (JWT, never from req.body)
- ✅ Company isolation (req.user.company, never from req.body)
- ✅ Role assignment validation
- ✅ Company settings access control

---

## 🔴 CRITICAL SECURITY ISSUES

### 1. **Backend: Admin Can Access User Management Routes**

**📍 Location:** `backend/routes/users.js:19`

**❓ What is wrong:**
```javascript
// ❌ SECURITY BUG: admin role can access user management
router.use(protect, authorize('super_admin', 'company_admin', 'admin'));
```

**💥 Real-world impact:**
- `admin` role can **create users** (POST /api/users)
- `admin` role can **update users** (PUT /api/users/:id)
- `admin` role can **delete users** (DELETE /api/users/:id)
- `admin` role can **change user roles** (via updateUser)
- This violates the principle of least privilege
- `admin` should NOT have user management capabilities

**✅ Exact fix recommendation:**
```javascript
// ✅ FIX: Remove 'admin' from authorize middleware
router.use(protect, authorize('super_admin', 'company_admin'));
```

**🧩 Affects:** Backend

**🔧 Priority:** 🔴 **CRITICAL** - Must fix immediately

---

## 🟠 HIGH PRIORITY ISSUES

### 2. **Frontend: Users Menu Visible to Admin**

**📍 Location:** `frontend/src/components/layout/Sidebar.jsx:56`

**❓ What is wrong:**
```javascript
// ❌ SECURITY BUG: admin role can see Users menu
{ path: '/users', icon: UserCog, label: 'Users', roles: ['super_admin', 'company_admin', 'admin'] },
```

**💥 Real-world impact:**
- `admin` users see "Users" menu item in sidebar
- Even if backend blocks access, UI suggests they can manage users
- Poor UX - users will see 403 errors when clicking
- Security best practice: Hide UI elements that user cannot access

**✅ Exact fix recommendation:**
```javascript
// ✅ FIX: Remove 'admin' from roles array
{ path: '/users', icon: UserCog, label: 'Users', roles: ['super_admin', 'company_admin'] },
```

**🧩 Affects:** Frontend

**🔧 Priority:** 🟠 **HIGH** - Fix with backend fix

---

### 3. **Frontend: canManageUsers() Returns True for Admin**

**📍 Location:** `frontend/src/contexts/AuthContext.jsx:125`

**❓ What is wrong:**
```javascript
// ❌ SECURITY BUG: canManageUsers() includes 'admin'
const isAdmin = () => ['super_admin', 'company_admin', 'admin'].includes(user?.role)
const canManageUsers = () => isAdmin() // ❌ This returns true for 'admin'
```

**💥 Real-world impact:**
- Any component using `canManageUsers()` will show user management UI to `admin`
- Inconsistent with backend permissions
- Could lead to confusion and security issues

**✅ Exact fix recommendation:**
```javascript
// ✅ FIX: canManageUsers should only check for super_admin and company_admin
const canManageUsers = () => ['super_admin', 'company_admin'].includes(user?.role)
```

**🧩 Affects:** Frontend

**🔧 Priority:** 🟠 **HIGH** - Fix with backend fix

---

## 🟡 MEDIUM PRIORITY ISSUES

### 4. **Backend: Missing Explicit Authorization on Company Update Route**

**📍 Location:** `backend/routes/companies.js:17-18`

**❓ What is wrong:**
```javascript
// ⚠️ Missing explicit authorize() middleware
router.route('/:id')
  .get(companyController.getCompany) // Super admin or company admin
  .put(companyController.updateCompany) // Super admin or company admin
```

**💥 Real-world impact:**
- Route-level protection is missing
- Controller checks roles, but route-level is more secure
- If controller logic changes, security could be bypassed
- Best practice: Enforce at route level AND controller level

**✅ Exact fix recommendation:**
```javascript
// ✅ FIX: Add explicit authorization at route level
router.route('/:id')
  .get(companyController.getCompany) // Controller validates access
  .put(authorize('super_admin', 'company_admin'), companyController.updateCompany) // ✅ Add explicit check
  .delete(authorize('super_admin'), companyController.deleteCompany);
```

**Note:** Controller already validates access (lines 173-191 in companyController.js), but route-level protection is defense-in-depth.

**🧩 Affects:** Backend

**🔧 Priority:** 🟡 **MEDIUM** - Defense-in-depth improvement

---

## ✅ VERIFIED CORRECT IMPLEMENTATIONS

### 1. **Role Source of Truth (JWT Only)**

**✅ Verified:**
- Role is **ALWAYS** read from `req.user.role` (JWT token)
- Role is **NEVER** trusted from `req.body.role` or `req.query.role`
- All controllers use `req.user.role` for authorization checks

**📍 Files Verified:**
- `backend/middleware/auth.js` - Role from JWT token
- `backend/controllers/userController.js` - Role from req.user.role
- `backend/controllers/companyController.js` - Role from req.user.role

**Status:** ✅ **SECURE**

---

### 2. **Company ID Source of Truth**

**✅ Verified:**
- Company ID is **ALWAYS** read from `req.user.company` (JWT token)
- Company ID is **NEVER** trusted from `req.body.company` (except super_admin)
- All controllers use `req.user.company` for multi-tenancy

**📍 Files Verified:**
- `backend/controllers/invoiceController.js:659` - `const companyId = req.user.company?._id || req.user.company;`
- `backend/controllers/userController.js:127` - Company from user object, not body
- `backend/controllers/companyController.js:86` - Company from user object

**Status:** ✅ **SECURE**

---

### 3. **Role Assignment Validation**

**✅ Verified:**
- `userController.js:175-182` - Validates role assignment based on current user's role
- `admin` cannot create `company_admin` or `super_admin`
- `company_admin` cannot create `super_admin`
- Only `super_admin` can create any role

**Status:** ✅ **SECURE**

---

### 4. **Company Settings Access Control**

**✅ Verified:**
- `companyController.js:204-212` - Only `super_admin` can update subscription
- `companyController.js:214-221` - `company_admin` can update settings (currency, timezone, etc.)
- `companyController.js:223-233` - Only `super_admin` can update email

**Status:** ✅ **SECURE**

---

### 5. **Invoice/Receipt/Expense Access Control**

**✅ Verified:**
- All invoice routes allow `admin` and `accountant` (correct)
- Payment recording requires `admin` or `accountant` (correct)
- Delete operations require `admin` (correct)

**Status:** ✅ **SECURE**

---

## 📊 RECOMMENDED PERMISSION MATRIX

### **super_admin**
- ✅ Create/update/delete companies
- ✅ Create/update/delete users (all companies)
- ✅ Manage subscriptions
- ✅ Access all data (global scope)
- ✅ Change any user's role

### **company_admin**
- ✅ Create/update/delete users (own company only)
- ✅ Update company settings (currency, timezone, prefixes)
- ✅ View company reports
- ✅ Manage invoices, receipts, expenses
- ✅ Change user roles (cannot create super_admin)
- ❌ Cannot update subscription
- ❌ Cannot delete company
- ❌ Cannot access other companies

### **admin**
- ✅ Create/update invoices
- ✅ Record payments
- ✅ Create receipts
- ✅ Manage customers & items
- ✅ View reports
- ✅ Delete invoices/receipts/expenses
- ❌ **CANNOT create/update/delete users** (SECURITY BUG)
- ❌ Cannot update company settings
- ❌ Cannot change roles
- ❌ Cannot manage subscription

### **accountant**
- ✅ View invoices, receipts, expenses
- ✅ Record payments
- ✅ View reports
- ❌ Cannot create/update/delete invoices
- ❌ Cannot manage users
- ❌ Cannot access company settings

### **staff**
- ✅ View invoices, receipts, expenses (own company)
- ❌ Cannot create/update/delete
- ❌ Cannot record payments
- ❌ Cannot access reports

---

## 🔧 FIXES REQUIRED

### **Backend Fixes:**

1. **Fix User Routes Authorization** (CRITICAL)
   - File: `backend/routes/users.js:19`
   - Change: `authorize('super_admin', 'company_admin', 'admin')` → `authorize('super_admin', 'company_admin')`

2. **Add Company Update Authorization** (MEDIUM)
   - File: `backend/routes/companies.js:18`
   - Add: `.put(authorize('super_admin', 'company_admin'), companyController.updateCompany)`

### **Frontend Fixes:**

1. **Fix Sidebar Users Menu** (HIGH)
   - File: `frontend/src/components/layout/Sidebar.jsx:56`
   - Change: `roles: ['super_admin', 'company_admin', 'admin']` → `roles: ['super_admin', 'company_admin']`

2. **Fix canManageUsers() Function** (HIGH)
   - File: `frontend/src/contexts/AuthContext.jsx:125`
   - Change: `const canManageUsers = () => isAdmin()` → `const canManageUsers = () => ['super_admin', 'company_admin'].includes(user?.role)`

---

## ✅ VERIFICATION CHECKLIST

After fixes are applied, verify:

- [ ] `admin` cannot access `/api/users` (should return 403)
- [ ] `admin` cannot see "Users" menu in sidebar
- [ ] `admin` cannot see user management buttons/components
- [ ] `company_admin` can access `/api/users` (own company only)
- [ ] `super_admin` can access `/api/users` (all companies)
- [ ] `admin` can still create invoices, receipts, expenses
- [ ] `admin` can still record payments
- [ ] `admin` can still view reports
- [ ] Role is never read from `req.body.role`
- [ ] Company ID is never read from `req.body.company` (except super_admin)

---

## 📝 SUMMARY

**Critical Issues:** 1  
**High Priority Issues:** 2  
**Medium Priority Issues:** 1  
**Verified Secure:** 5 areas

**Recommendation:** 🔴 **FIX CRITICAL ISSUES IMMEDIATELY** before production deployment.

The main security vulnerability is that `admin` role has access to user management, which should be restricted to `company_admin` and `super_admin` only.

---

**Audit Complete.** ✅

