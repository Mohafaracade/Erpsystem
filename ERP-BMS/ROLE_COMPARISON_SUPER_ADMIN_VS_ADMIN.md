# 🔐 Role Comparison: Super Admin vs Admin

## Overview

This document provides a comprehensive comparison between **Super Admin** and **Admin** roles in the multi-tenant ERP system.

---

## 📊 Quick Comparison Table

| Feature | Super Admin | Admin |
|---------|------------|-------|
| **Company Association** | ❌ No company (system-wide) | ✅ Belongs to a company |
| **Company Required** | ❌ Not required | ✅ Required |
| **Data Access Scope** | 🌐 All companies | 🏢 Own company only |
| **Company Management** | ✅ Full CRUD | ❌ No access |
| **User Management** | ✅ All companies | ✅ Own company only |
| **Subscription Management** | ✅ Can manage | ❌ No access |
| **Company Settings** | ✅ Can update all | ❌ No access |
| **Expense Approval** | ✅ Can approve | ✅ Can approve |
| **Reports** | ✅ All companies | ✅ Own company only |
| **UI Navigation** | ✅ "Companies" menu | ❌ No "Companies" menu |

---

## 🎯 Detailed Comparison

### 1. **Company Association**

#### Super Admin
- **No company required** - Can exist without being tied to any company
- **System-wide access** - Not limited to a single tenant
- **Email uniqueness** - Globally unique across the entire system

```javascript
// User Model
company: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Company',
  required: function() {
    return this.role !== 'super_admin'; // ✅ Not required for super_admin
  }
}
```

#### Admin
- **Company required** - Must belong to a company
- **Company-scoped** - All operations limited to their company
- **Email uniqueness** - Unique per company (can have same email in different companies)

```javascript
// Admin must have a company
company: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Company',
  required: true // ✅ Required for admin
}
```

---

### 2. **Data Access Scope**

#### Super Admin
- **Access all companies' data** - Can view and manage data from any company
- **No company filtering** - Queries return data from all companies
- **Cross-company visibility** - Can see invoices, customers, items from all tenants

```javascript
// Middleware - auth.js
if (user.role === 'super_admin') {
  req.companyFilter = {}; // ✅ Empty filter = all companies
} else {
  req.companyFilter = { company: user.company?._id };
}
```

#### Admin
- **Access only own company** - Can only view/manage data from their company
- **Company filtering enforced** - All queries automatically filtered by `company_id`
- **Data isolation** - Cannot see other companies' data

```javascript
// All queries include company filter
const invoices = await Invoice.find({ 
  company: req.companyId // ✅ Filtered to own company
});
```

---

### 3. **Company Management**

#### Super Admin
- ✅ **Create companies** - Can create new tenant companies
- ✅ **View all companies** - Can list and search all companies
- ✅ **Edit any company** - Can update any company's details
- ✅ **Delete companies** - Can soft-delete companies
- ✅ **Manage subscriptions** - Can update subscription plans, status, limits
- ✅ **Update company settings** - Can modify currency, timezone, prefixes
- ✅ **View company stats** - Can see statistics for any company

**Routes:**
```javascript
// routes/companies.js
router.route('/')
  .get(authorize('super_admin'), getAllCompanies)  // ✅ Super admin only
  .post(authorize('super_admin'), createCompany);  // ✅ Super admin only

router.route('/:id')
  .delete(authorize('super_admin'), deleteCompany); // ✅ Super admin only
```

#### Admin
- ❌ **Cannot create companies** - No access to company creation
- ❌ **Cannot view companies list** - No "Companies" menu in UI
- ❌ **Cannot edit companies** - No access to company management
- ❌ **Cannot manage subscriptions** - No subscription management access
- ❌ **Cannot update company settings** - Limited to own company profile (if company_admin)

---

### 4. **User Management**

#### Super Admin
- ✅ **View all users** - Can see users from all companies
- ✅ **Create users for any company** - Can create users and assign to any company
- ✅ **Edit any user** - Can update users from any company
- ✅ **Delete any user** - Can delete users from any company
- ✅ **Assign any role** - Can create super_admin, company_admin, admin, etc.
- ✅ **View all activity logs** - Can see activity from all companies

```javascript
// userController.js
if (req.user.role !== 'super_admin') {
  query.company = req.user.company._id; // ✅ Super admin bypasses filter
}
```

#### Admin
- ✅ **View own company users** - Can see users from their company only
- ✅ **Create users for own company** - Can create users within their company
- ✅ **Edit own company users** - Can update users from their company
- ⚠️ **Cannot delete other admins** - Protection against deleting other admins
- ❌ **Cannot create super_admin** - Cannot create super_admin or company_admin roles
- ✅ **View own company activity** - Can see activity logs from their company

```javascript
// userController.js
// Protection: Admins cannot update/delete other Admins
if (user.role === 'admin' && user._id.toString() !== req.user.id) {
  return errorResponse(res, 'You cannot update another administrator', 403);
}
```

---

### 5. **Subscription Management**

#### Super Admin
- ✅ **Update subscription plans** - Can change plan (basic, pro, enterprise)
- ✅ **Modify subscription status** - Can set status (active, trial, suspended, cancelled)
- ✅ **Set subscription dates** - Can update startDate, endDate
- ✅ **Manage user limits** - Can set maxUsers, maxStorage
- ✅ **View subscription details** - Can see subscription info for any company

```javascript
// companyController.js
// Only super admin can update subscription
if (req.user.role === 'super_admin' && subscription) {
  updateFields.subscription = subscription; // ✅ Super admin only
}
```

#### Admin
- ❌ **No subscription access** - Cannot view or modify subscriptions
- ❌ **No plan management** - Cannot change subscription plans
- ❌ **No status updates** - Cannot modify subscription status

---

### 6. **Company Settings**

#### Super Admin
- ✅ **Update any company settings** - Can modify settings for any company
- ✅ **Change currency** - Can update company currency
- ✅ **Modify timezone** - Can update company timezone
- ✅ **Update date format** - Can change date format
- ✅ **Modify prefixes** - Can update invoicePrefix, receiptPrefix
- ✅ **Update company email** - Can change company email

```javascript
// companyController.js
// Email update requires super admin
if (email && req.user.role === 'super_admin') {
  updateFields.email = email; // ✅ Super admin only
}
```

#### Admin
- ❌ **Limited settings access** - Cannot modify company settings
- ⚠️ **Company Admin exception** - `company_admin` can update some settings for their own company

---

### 7. **Expense Management**

#### Super Admin
- ✅ **Can approve expenses** - Can approve expenses from any company
- ✅ **Auto-approved status** - Expenses created by super_admin are auto-approved
- ✅ **View all expenses** - Can see expenses from all companies
- ✅ **Delete expenses** - Can delete expenses (with restrictions)

```javascript
// expenseController.js
// Determine initial status - respect provided status if Admin
let initialStatus = req.user.role === 'admin' ? 'approved' : 'pending';
```

#### Admin
- ✅ **Can approve expenses** - Can approve expenses from their company
- ✅ **Auto-approved status** - Expenses created by admin are auto-approved
- ✅ **View own company expenses** - Can see expenses from their company
- ✅ **Delete expenses** - Can delete expenses (admin only)

```javascript
// expenseController.js
// Only admin can delete per user request
if (req.user.role !== 'admin') {
  return errorResponse(res, 'Only administrators can delete expenses', 403);
}
```

---

### 8. **Reports & Analytics**

#### Super Admin
- ✅ **All companies reports** - Can generate reports for all companies
- ✅ **Cross-company analytics** - Can compare data across companies
- ✅ **System-wide statistics** - Can view aggregated stats from all tenants
- ✅ **No company filtering** - Reports include data from all companies

```javascript
// reportController.js
if (req.user.role === 'super_admin') {
  return {}; // ✅ Empty match = all companies
}
```

#### Admin
- ✅ **Own company reports** - Can generate reports for their company only
- ✅ **Company-scoped analytics** - Analytics limited to their company
- ✅ **Company statistics** - Can view stats for their company only
- ✅ **Company filtering enforced** - All reports filtered by company_id

```javascript
// reportController.js
const companyMatch = req.user.role === 'super_admin' 
  ? {} 
  : { company: req.companyId }; // ✅ Admin filtered to own company
```

---

### 9. **UI Navigation**

#### Super Admin
- ✅ **"Companies" menu** - Has access to "Companies" section in sidebar
- ✅ **System Administration section** - Special section in sidebar
- ✅ **Company management pages** - Can access:
  - `/companies` - List all companies
  - `/companies/create` - Create new company
  - `/companies/:id/edit` - Edit company
  - `/companies/:id/users` - Manage company users
  - `/companies/:id/users/create` - Create company user

```javascript
// Sidebar.jsx
const superAdminItems = [
  { path: '/companies', icon: Building2, label: 'Companies' },
]
```

#### Admin
- ❌ **No "Companies" menu** - Cannot see companies section
- ✅ **Administration section** - Has "Users" and "Settings" in admin section
- ❌ **No company management pages** - Cannot access company management routes

---

### 10. **Authentication & Authorization**

#### Super Admin
- ✅ **No company validation** - Login doesn't check company status
- ✅ **No subscription check** - Can login even if company subscription is inactive
- ✅ **Bypass company filters** - All middleware allows access to all companies
- ✅ **Global permissions** - Can access any route (with role checks)

```javascript
// middleware/auth.js
// Validate company is active (unless super_admin)
if (user.role !== 'super_admin' && user.company) {
  // Check company status - ✅ Super admin bypasses this
}
```

#### Admin
- ✅ **Company validation** - Login checks if company is active
- ✅ **Subscription check** - Cannot login if company subscription is inactive
- ✅ **Company filtering** - All queries filtered by company_id
- ⚠️ **Role-based permissions** - Access limited by role and company

```javascript
// middleware/auth.js
if (user.company.subscription && 
    !['active', 'trial'].includes(user.company.subscription.status)) {
  return res.status(401).json({
    message: 'Company subscription is not active' // ✅ Admin blocked
  });
}
```

---

### 11. **Activity Logging**

#### Super Admin
- ✅ **Company field optional** - Activity logs don't require company
- ✅ **All activities logged** - Activities from all companies logged
- ✅ **Role: 'super_admin'** - Logged with super_admin role

```javascript
// ActivityLog model
company: {
  required: false, // ✅ Optional for super_admin
}
userRole: {
  enum: ['super_admin', 'company_admin', 'admin', 'accountant', 'staff']
}
```

#### Admin
- ✅ **Company field required** - Activity logs must include company
- ✅ **Company activities logged** - Only activities from own company logged
- ✅ **Role: 'admin'** - Logged with admin role

---

## 🔒 Security Differences

### Super Admin
- **No data isolation** - Can access all companies' data
- **Global permissions** - Highest level of access
- **System management** - Can manage the entire SaaS platform
- **No restrictions** - Bypasses most security filters

### Admin
- **Data isolation enforced** - Strictly limited to own company
- **Company-scoped permissions** - Access limited to their company
- **Company management** - Can manage their company's operations
- **Security filters applied** - All queries filtered by company_id

---

## 📝 Code Examples

### Creating a User

#### Super Admin
```javascript
// Can create user for any company
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
  company: anyCompanyId // ✅ Can specify any company
});
```

#### Admin
```javascript
// Can only create user for own company
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'staff',
  company: req.user.company._id // ✅ Must use own company
});
```

### Querying Data

#### Super Admin
```javascript
// Gets invoices from all companies
const invoices = await Invoice.find({}); // ✅ No filter
```

#### Admin
```javascript
// Gets invoices from own company only
const invoices = await Invoice.find({ 
  company: req.companyId 
}); // ✅ Filtered
```

---

## 🎯 Use Cases

### Super Admin
- **SaaS Platform Owner** - Manages the entire multi-tenant system
- **Company Onboarding** - Creates new tenant companies
- **Subscription Management** - Manages billing and subscriptions
- **System Monitoring** - Monitors all companies' activities
- **Support & Troubleshooting** - Can access any company's data for support

### Admin
- **Company Manager** - Manages operations within their company
- **Team Management** - Creates and manages users in their company
- **Business Operations** - Handles invoices, customers, inventory
- **Financial Management** - Approves expenses, views reports
- **Company Settings** - Configures company-specific settings (if company_admin)

---

## ✅ Summary

| Aspect | Super Admin | Admin |
|--------|------------|-------|
| **Scope** | System-wide | Company-scoped |
| **Company Required** | ❌ No | ✅ Yes |
| **Data Access** | All companies | Own company |
| **Company Management** | ✅ Full access | ❌ No access |
| **User Management** | All companies | Own company |
| **Subscription** | ✅ Can manage | ❌ No access |
| **Reports** | All companies | Own company |
| **UI Features** | Companies menu | Standard admin menu |

---

*This comparison is based on the current implementation of the multi-tenant ERP system.*

