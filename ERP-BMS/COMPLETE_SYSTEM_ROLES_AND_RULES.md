# 📋 Complete System Roles, Rules & Permissions

## Multi-Tenant SaaS ERP System - Complete Rules Documentation

**Date:** 2024  
**System:** ERP-BMS Multi-Tenant SaaS Platform  
**Version:** Production Ready

---

## 🎭 SYSTEM ROLES (5 Roles)

### 1. **super_admin**
- **Scope:** System-wide (all companies)
- **Company Required:** ❌ No
- **Description:** System administrator with full access to all companies and features

### 2. **company_admin**
- **Scope:** Company-scoped (own company only)
- **Company Required:** ✅ Yes
- **Description:** Company administrator managing their own company

### 3. **admin**
- **Scope:** Company-scoped (own company only)
- **Company Required:** ✅ Yes
- **Description:** Company administrator for daily operations

### 4. **accountant**
- **Scope:** Company-scoped (own company only)
- **Company Required:** ✅ Yes
- **Description:** Financial specialist with limited access

### 5. **staff**
- **Scope:** Company-scoped (own company only)
- **Company Required:** ✅ Yes
- **Description:** Basic user with minimal permissions

---

## 🔐 AUTHENTICATION & AUTHORIZATION RULES

### Authentication Rules
1. **JWT Token Required:** All protected routes require valid JWT token
2. **Token Format:** `Bearer <token>` in Authorization header
3. **Token Expiry:** Set by `JWT_EXPIRE` environment variable
4. **Token Validation:** 
   - Validates user exists and is active
   - Validates company subscription status (unless super_admin)
   - Validates token companyId matches current user company

### Authorization Rules
1. **Role-Based Access:** Uses `authorize()` middleware
2. **Company Isolation:** All data scoped to company (unless super_admin)
3. **Subscription Check:** Validated on EVERY request (unless super_admin)

---

## 💰 SUBSCRIPTION & FINANCIAL RULES

### Subscription Status Rules
1. **Active Subscription Required:**
   - Status must be `'active'` or `'trial'`
   - `endDate` must be in the future (if set)
   - Company must be `isActive: true`

2. **Subscription Validation:**
   - Checked on EVERY request (not just login)
   - Blocks access if subscription expired
   - Blocks access if subscription suspended

3. **Super Admin Bypass:**
   - Super admin bypasses all subscription checks
   - Can access system even if company subscription expired

### Subscription Limits

#### User Limits
- **Rule:** `maxUsers` from subscription plan
- **Enforcement:** Checked when creating new users
- **Error:** `"User limit reached (X). Please upgrade your subscription."`
- **Location:** `userController.createUser()`, `companyController.createCompanyUser()`
- **Default:** 5 users (free plan)

#### Storage Limits
- **Rule:** `maxStorage` in MB from subscription plan
- **Enforcement:** Checked before file upload
- **Error:** `"Storage limit exceeded. Used: XMB / YMB"`
- **Location:** `middleware/storageLimit.js`
- **Default:** 1000 MB (1 GB)
- **Calculation:** Includes all files in company upload directory + expense attachments

### Financial Calculation Rules

#### Revenue Calculation
- **Invoice Revenue:** Uses `amountPaid` (NOT `total`)
- **POS Revenue:** Only standalone sales (`invoice: null`)
- **No Double-Counting:** Invoice payments NOT counted in POS revenue
- **Excludes:** Draft and cancelled invoices

#### Financial Tolerance
- **Tolerance:** $0.01 (one cent)
- **Purpose:** Handle floating-point arithmetic errors
- **Usage:** `balanceDue <= 0.01` treated as fully paid

---

## 👥 USER MANAGEMENT RULES

### User Creation Rules

#### Who Can Create Users
- **super_admin:** Can create all roles (including super_admin, company_admin)
- **company_admin:** Can create admin, accountant, staff
- **admin:** Can create accountant, staff
- **accountant:** ❌ Cannot create users
- **staff:** ❌ Cannot create users

#### Role Assignment Rules
1. **super_admin** can assign:
   - ✅ super_admin
   - ✅ company_admin
   - ✅ admin
   - ✅ accountant
   - ✅ staff

2. **company_admin** can assign:
   - ❌ super_admin (BLOCKED)
   - ❌ company_admin (BLOCKED)
   - ✅ admin
   - ✅ accountant
   - ✅ staff

3. **admin** can assign:
   - ❌ super_admin (BLOCKED)
   - ❌ company_admin (BLOCKED)
   - ❌ admin (BLOCKED - cannot create other admins)
   - ✅ accountant
   - ✅ staff

#### Company Association Rules
1. **company_admin** MUST have company
2. **admin** MUST have company
3. **accountant** MUST have company
4. **staff** MUST have company
5. **super_admin** does NOT require company

#### Email Uniqueness Rules
1. **super_admin:** Email globally unique (no company)
2. **Regular users:** Email unique per company
3. **Validation:** Checked on create and update

#### User Limit Rules
1. **Enforced:** When creating users
2. **Check:** `userCount >= maxUsers`
3. **Error:** Returns 400 with limit message
4. **Bypass:** Super admin bypasses user limits

### User Update Rules

#### Company Isolation
- **Rule:** Users can only update users from their own company
- **Exception:** Super admin can update any user
- **Validation:** Company ID checked in query
- **Error:** Returns 404 if user not found in company

#### Role Update Restrictions
1. **Cannot escalate roles:**
   - Admin cannot update user to super_admin
   - Admin cannot update user to company_admin
   - Admin cannot update other admins

2. **Self-update:**
   - Users can update themselves
   - Cannot change own role to higher privilege

### User Delete Rules

#### Company Isolation
- **Rule:** Users can only delete users from their own company
- **Exception:** Super admin can delete any user
- **Validation:** Company ID checked in query
- **Error:** Returns 404 if user not found in company

#### Delete Restrictions
1. **Cannot delete:**
   - Admin cannot delete other admins
   - Users cannot delete themselves
   - Cannot delete super_admin (unless you are super_admin)

---

## 🏢 COMPANY MANAGEMENT RULES

### Company Access Rules

#### Who Can Access Companies
1. **super_admin:**
   - ✅ Can access ALL companies
   - ✅ Can create companies
   - ✅ Can update any company
   - ✅ Can delete companies
   - ✅ Can view all company stats

2. **company_admin:**
   - ✅ Can access ONLY their own company
   - ❌ Cannot access other companies
   - ✅ Can update their own company (limited fields)
   - ❌ Cannot delete company
   - ✅ Can view their company stats

3. **Other roles:**
   - ❌ Cannot access company management endpoints

### Company Update Rules

#### Field Restrictions
1. **super_admin** can update:
   - ✅ All fields (name, email, phone, address)
   - ✅ Subscription (plan, status, endDate, maxUsers, maxStorage)
   - ✅ Settings (currency, timezone, dateFormat, prefixes)

2. **company_admin** can update:
   - ✅ Name, phone, address
   - ❌ Email (restricted)
   - ❌ Subscription (restricted - super_admin only)
   - ✅ Settings (currency, timezone, dateFormat, prefixes)

### Company User Management

#### Who Can Manage Company Users
- **super_admin:** Can manage users in any company
- **company_admin:** Can manage users in their own company
- **admin:** Can manage users in their own company
- **accountant:** ❌ Cannot manage users
- **staff:** ❌ Cannot manage users

---

## 📊 REPORTS & ANALYTICS RULES

### Financial Reports (Accountant Access)
**Accessible to:** `super_admin`, `company_admin`, `admin`, `accountant`

1. ✅ Dashboard Overview
2. ✅ Revenue Trend
3. ✅ Monthly Sales
4. ✅ Expenses by Category
5. ✅ Revenue by Payment Method
6. ✅ Payment Velocity
7. ✅ Collection Rate
8. ✅ Expense Trend
9. ✅ Top Vendors
10. ✅ Expense Metrics
11. ✅ Sales Report
12. ✅ Expense Report
13. ✅ Profit & Loss Report

### System Reports (Admin Only)
**Accessible to:** `super_admin`, `company_admin`, `admin` (NO accountant)

1. ✅ Comprehensive Reports
2. ✅ Top Customers
3. ✅ Invoice Status Distribution
4. ✅ Detailed Transactions
5. ✅ Customer Report
6. ✅ Item Sales Report
7. ✅ Aging Report

### Export Rules
- **Rate Limit:** 5 exports per hour
- **Record Limit:** 10,000 records per export
- **Access:** All roles except staff
- **Error:** Returns 400 if limit exceeded

---

## 💳 EXPENSE MANAGEMENT RULES

### Expense Creation Rules

#### Status Rules
1. **staff/accountant:**
   - ✅ Can create expenses
   - ❌ Cannot set status (always 'pending')
   - ❌ Status from request body is IGNORED

2. **admin/company_admin/super_admin:**
   - ✅ Can create expenses
   - ✅ Can set status to 'approved' or 'paid'
   - ✅ Auto-approved by default

### Expense Update Rules

#### Status Change Rules
1. **staff/accountant:**
   - ❌ Cannot change expense status
   - ❌ Cannot approve expenses
   - ❌ Cannot mark as paid
   - **Error:** Returns 403 "Only administrators can change expense status"

2. **admin/company_admin/super_admin:**
   - ✅ Can change expense status
   - ✅ Can approve expenses
   - ✅ Can mark as paid

#### Delete Rules
- **Access:** Admin only
- **Rule:** Only admins can delete expenses

### Expense Approval Workflow
1. **Staff creates expense:** Status = 'pending'
2. **Admin reviews:** Can approve or reject
3. **Admin marks paid:** After payment received
4. **Staff cannot bypass:** Status changes blocked

---

## 📄 INVOICE MANAGEMENT RULES

### Invoice Creation
- **Access:** All authenticated users
- **Company Isolation:** ✅ Enforced
- **Validation:** Required fields validated

### Invoice Payment Recording
- **Access:** `admin`, `accountant` only
- **Rule:** Only admins and accountants can record payments
- **Location:** `POST /api/invoices/:id/payments`

### Invoice Deletion
- **Access:** Admin only
- **Rule:** Only admins can delete invoices

---

## 👤 CUSTOMER MANAGEMENT RULES

### Customer Operations
- **Create/Read/Update:** All authenticated users
- **Delete:** Admin only
- **Company Isolation:** ✅ Enforced

---

## 📦 ITEM MANAGEMENT RULES

### Item Operations
- **Create/Read/Update:** All authenticated users
- **Delete:** Admin only
- **Status Toggle:** Admin only
- **Company Isolation:** ✅ Enforced

---

## 📝 SALES RECEIPT RULES

### Receipt Operations
- **Create/Read/Update:** All authenticated users
- **Company Isolation:** ✅ Enforced
- **POS Revenue:** Only standalone receipts (not linked to invoices)

---

## 🔒 SECURITY RULES

### Rate Limiting Rules

#### Authentication Endpoints
- **Login:** 5 attempts per 15 minutes
- **Password Reset:** 3 attempts per hour
- **User Creation:** 10 users per hour

#### General API
- **Rate Limit:** 100 requests per 15 minutes
- **Applies to:** All protected routes

#### Export Endpoints
- **Rate Limit:** 5 exports per hour
- **Applies to:** Report exports

### Password Rules
1. **Minimum Length:** 6 characters
2. **Hashing:** bcrypt with salt rounds 10
3. **Reset:** Requires companyId for regular users
4. **Super Admin Reset:** No companyId required

### JWT Token Rules
1. **Payload Contains:**
   - `userId` (string ObjectId)
   - `email`
   - `role`
   - `companyId` (string ObjectId or null)

2. **Validation:**
   - Token companyId must match current user company
   - Token invalidated if company changes
   - Forces re-login if company changed

### File Upload Rules
1. **Storage Limit:** Enforced per company
2. **Company Isolation:** Files stored in company-specific directories
3. **Filename:** Includes company ID for isolation
4. **Check:** Before upload, not after

---

## 🏛️ COMPANY ISOLATION RULES

### Data Isolation
1. **All Queries:** Filtered by company (unless super_admin)
2. **Company Filter:** Applied automatically via middleware
3. **Cross-Company Access:** ❌ BLOCKED
4. **IDOR Prevention:** Company validation in all queries

### Company Filter Application
- **Super Admin:** No filter (access all)
- **Other Roles:** `{ company: user.company._id }`
- **Automatic:** Applied via `req.companyFilter`

---

## 📈 DATA ACCESS RULES

### Read Access
- **Own Company:** ✅ All users can read their company data
- **Other Companies:** ❌ BLOCKED (except super_admin)
- **Super Admin:** ✅ Can read all companies

### Write Access
- **Own Company:** ✅ Based on role permissions
- **Other Companies:** ❌ BLOCKED (except super_admin)
- **Super Admin:** ✅ Can write to all companies

### Delete Access
- **Own Company:** ✅ Admin roles only
- **Other Companies:** ❌ BLOCKED (except super_admin)
- **Super Admin:** ✅ Can delete from all companies

---

## 🚫 RESTRICTION RULES

### Accountant Restrictions
1. **Cannot Access:**
   - ❌ System reports (user activity, system stats)
   - ❌ User management
   - ❌ Company management
   - ❌ Expense approval (can view, cannot approve)

2. **Can Access:**
   - ✅ Financial reports
   - ✅ Invoice payment recording
   - ✅ View expenses
   - ✅ View invoices

### Staff Restrictions
1. **Cannot Access:**
   - ❌ Reports
   - ❌ User management
   - ❌ Company management
   - ❌ Expense approval
   - ❌ Invoice deletion
   - ❌ Customer deletion
   - ❌ Item deletion

2. **Can Access:**
   - ✅ Create/view invoices
   - ✅ Create/view customers
   - ✅ Create/view items
   - ✅ Create expenses (pending status only)

---

## 📋 AUDIT LOGGING RULES

### What Gets Logged
1. **All Actions:**
   - Login/Logout
   - Create/Update/Delete operations
   - View operations (reports, data)

2. **Critical Actions (Enhanced Logging):**
   - Role changes
   - Company updates
   - Subscription changes
   - User deletions
   - Super admin actions (flagged)

### Log Data Captured
- User ID, name, role
- Company ID
- Action type
- Entity type and ID
- IP address
- User agent
- Timestamp
- Request details (for critical actions)

---

## 🔄 SUBSCRIPTION STATUS RULES

### Subscription States
1. **active:**
   - ✅ Full access
   - ✅ Must have valid endDate (if set)
   - ✅ Company must be active

2. **trial:**
   - ✅ Full access
   - ✅ Must have valid endDate
   - ✅ Auto-expires when endDate passes

3. **suspended:**
   - ❌ Access blocked
   - ❌ Returns 401 on all requests

4. **expired:**
   - ❌ Access blocked
   - ❌ Returns 401 on all requests

### Subscription Validation
- **Checked:** On EVERY request (not just login)
- **Location:** `middleware/auth.js` (protect middleware)
- **Bypass:** Super admin bypasses all checks

---

## 📊 SUMMARY TABLE

| Feature | super_admin | company_admin | admin | accountant | staff |
|---------|-------------|---------------|-------|------------|-------|
| **Company Management** | ✅ All | ✅ Own | ❌ | ❌ | ❌ |
| **User Management** | ✅ All | ✅ Own Company | ✅ Own Company | ❌ | ❌ |
| **Create Users** | ✅ All Roles | ✅ admin/staff/accountant | ✅ staff/accountant | ❌ | ❌ |
| **Invoices** | ✅ All | ✅ Own Company | ✅ Own Company | ✅ Own Company | ✅ Own Company |
| **Record Payments** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Customers** | ✅ All | ✅ Own Company | ✅ Own Company | ✅ Own Company | ✅ Own Company |
| **Items** | ✅ All | ✅ Own Company | ✅ Own Company | ✅ Own Company | ✅ Own Company |
| **Expenses** | ✅ All | ✅ Own Company | ✅ Own Company | ✅ View Only | ✅ Create (pending) |
| **Approve Expenses** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Financial Reports** | ✅ All | ✅ Own Company | ✅ Own Company | ✅ Own Company | ❌ |
| **System Reports** | ✅ All | ✅ Own Company | ✅ Own Company | ❌ | ❌ |
| **Export Data** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Delete Operations** | ✅ All | ✅ Own Company | ✅ Own Company | ❌ | ❌ |

---

## 🎯 KEY RULES SUMMARY

### 1. Company Isolation
- ✅ All data scoped to company
- ✅ Cross-company access BLOCKED
- ✅ Super admin exception

### 2. Subscription Enforcement
- ✅ Checked on every request
- ✅ Blocks expired/suspended subscriptions
- ✅ Super admin bypass

### 3. Role Escalation Prevention
- ✅ Cannot assign higher roles
- ✅ Cannot create super_admin (unless you are super_admin)
- ✅ Cannot create company_admin (unless you are super_admin)

### 4. User Limits
- ✅ Enforced per subscription plan
- ✅ Checked on user creation
- ✅ Super admin bypass

### 5. Storage Limits
- ✅ Enforced per subscription plan
- ✅ Checked before upload
- ✅ Super admin bypass

### 6. Rate Limiting
- ✅ Login: 5/15min
- ✅ Password Reset: 3/hour
- ✅ User Creation: 10/hour
- ✅ Export: 5/hour
- ✅ General API: 100/15min

### 7. Financial Rules
- ✅ Revenue = amountPaid (not total)
- ✅ No double-counting
- ✅ Financial tolerance: $0.01

### 8. Expense Approval
- ✅ Staff cannot approve
- ✅ Only admins can change status
- ✅ Workflow enforced

---

## 📝 NOTES

1. **All rules enforced at backend** - Frontend protection is UX only
2. **Company isolation is mandatory** - No exceptions except super_admin
3. **Subscription checks are real-time** - Not cached
4. **Rate limits are per IP** - Can be adjusted per endpoint
5. **Audit logging is comprehensive** - All actions tracked

---

*This document covers all roles, rules, and permissions in the ERP-BMS system. All rules are enforced at the backend level for security.*

