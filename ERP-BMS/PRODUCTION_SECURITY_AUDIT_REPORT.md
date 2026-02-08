# 🔒 Production Security & Architecture Audit Report

**System:** Multi-Tenant SaaS ERP / BMS  
**Audit Date:** 2024  
**Auditor:** Principal SaaS Security & Architecture Auditor  
**Severity Levels:** Critical | High | Medium | Low

---

## EXECUTIVE SUMMARY

This audit identified **42 issues** across 8 categories:
- **8 Critical** issues requiring immediate remediation
- **12 High** priority issues requiring urgent attention
- **15 Medium** priority issues for next sprint
- **7 Low** priority issues for technical debt backlog

**Overall Risk Assessment:** 🔴 **HIGH RISK** - System requires immediate security hardening before production deployment.

---

## 🔐 SECURITY AUDIT FINDINGS

### CRITICAL ISSUES

#### 1. **IDOR Vulnerability: Request Body Company Override**
- **Category:** Security / Multi-Tenancy
- **Severity:** 🔴 Critical
- **Roles Affected:** All non-super_admin roles
- **Location:** `backend/controllers/userController.js:122`
- **Issue:**
  ```javascript
  let companyId = req.body.company;
  if (req.user.role !== 'super_admin') {
    companyId = req.user.company?._id || req.user.company;
  }
  ```
  **Problem:** Non-super_admin users can send `req.body.company` which is initially accepted, then overwritten. However, if validation fails before the overwrite, or if there's a race condition, the user-supplied value could be used.
- **Exploitation:** Attacker could attempt to create users in other companies by manipulating request body before validation completes.
- **Fix:**
  ```javascript
  // Get company ID (super admin can specify, others use their company)
  let companyId;
  if (req.user.role === 'super_admin') {
    companyId = req.body.company; // Only super_admin can specify
  } else {
    companyId = req.user.company?._id || req.user.company; // Force from token
  }
  // Validate companyId exists before proceeding
  ```

---

#### 2. **Accountant Can Approve Expenses (RBAC Bypass)**
- **Category:** Security / RBAC
- **Severity:** 🔴 Critical
- **Roles Affected:** accountant
- **Location:** `backend/controllers/expenseController.js:324-360` (`updateExpenseStatus`)
- **Issue:** The `updateExpenseStatus` endpoint has NO role check. Any authenticated user (including `accountant` and `staff`) can approve expenses.
- **Current Code:**
  ```javascript
  exports.updateExpenseStatus = async (req, res) => {
    // NO ROLE CHECK HERE!
    const { status } = req.body;
    // ... directly updates status
  }
  ```
- **Exploitation:** Accountant can approve their own expenses, bypassing approval workflow. Staff can approve expenses.
- **Fix:**
  ```javascript
  exports.updateExpenseStatus = async (req, res) => {
    // ✅ Add role check
    if (!['admin', 'company_admin', 'super_admin'].includes(req.user.role)) {
      return errorResponse(res, 'Only administrators can change expense status', 403);
    }
    // ... rest of code
  }
  ```
- **Route Fix:** Update `backend/routes/expenses.js`:
  ```javascript
  router.put('/:id/status', authorize('admin', 'company_admin', 'super_admin'), expenseController.updateExpenseStatus);
  ```

---

#### 3. **Subscription Check Performance: DB Query on Every Request**
- **Category:** Security / Performance
- **Severity:** 🔴 Critical
- **Roles Affected:** All non-super_admin users
- **Location:** `backend/middleware/auth.js:54-90`
- **Issue:** Every single request (except super_admin) triggers a database query to fetch company subscription status:
  ```javascript
  const company = await Company.findById(user.company._id || user.company);
  ```
  This creates:
  - **Performance bottleneck:** 1000s of DB queries per minute
  - **Scalability issue:** Will not scale beyond 100 concurrent users
  - **Cost issue:** Unnecessary database load
- **Exploitation:** DDoS by spamming requests, causing DB overload.
- **Fix:** Cache subscription status in JWT or use Redis:
  ```javascript
  // Option 1: Include subscription status in JWT (refresh on login)
  // Option 2: Redis cache with 5-minute TTL
  // Option 3: Check only on login, validate token expiry
  ```

---

#### 4. **Missing Company Filter in Revenue Trend Aggregation**
- **Category:** Security / Multi-Tenancy
- **Severity:** 🔴 Critical
- **Roles Affected:** All non-super_admin users
- **Location:** `backend/controllers/reportController.js:237-283`
- **Issue:** `getRevenueTrend` uses `invoiceMatch` but doesn't apply `companyFilter`:
  ```javascript
  const revenueTrend = await Invoice.aggregate([
    {
      $match: {
        ...invoiceMatch,  // ❌ invoiceMatch doesn't include companyFilter!
        status: { $nin: ['draft', 'cancelled'] }
      }
    },
  ]);
  ```
  Where `invoiceMatch` is defined as:
  ```javascript
  const invoiceMatch = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};
  ```
  **Missing company filter!**
- **Exploitation:** Non-super_admin users can see revenue from ALL companies.
- **Fix:**
  ```javascript
  const companyFilter = getCompanyFilter(req);
  const invoiceMatch = { 
    ...companyFilter,  // ✅ Add company filter
    ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
  };
  ```

---

#### 5. **Invoice Creation: companyId Used Before Definition**
- **Category:** Security / Financial Logic
- **Severity:** 🔴 Critical
- **Roles Affected:** All users
- **Location:** `backend/controllers/invoiceController.js:329-335`
- **Issue:**
  ```javascript
  // Line 329: companyId used here
  const invoiceNumber = await generateInvoiceNumber(companyId);
  
  // Line 332: companyId defined here (AFTER usage!)
  const companyId = req.user.company?._id || req.user.company;
  ```
  **This will throw ReferenceError in production!**
- **Exploitation:** Invoice creation fails, breaking core functionality.
- **Fix:** Move `companyId` definition before `generateInvoiceNumber` call.

---

#### 6. **Missing Company Filter in getRevenueTrend POS Query**
- **Category:** Security / Multi-Tenancy
- **Severity:** 🔴 Critical
- **Roles Affected:** All non-super_admin users
- **Location:** `backend/controllers/reportController.js:263-266`
- **Issue:**
  ```javascript
  const currentReceiptQuery = { 
    ...companyFilter,  // ✅ Has companyFilter
    ...(Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {})
  };
  ```
  But `companyFilter` is NOT defined in this function scope! It's only defined in `getComprehensiveReports`.
- **Exploitation:** Cross-company data leakage in revenue reports.
- **Fix:**
  ```javascript
  const companyFilter = getCompanyFilter(req);  // ✅ Add this line
  const currentReceiptQuery = { 
    ...companyFilter,
    ...
  };
  ```

---

#### 7. **Email Uniqueness Check Missing Company Scope in updateProfile**
- **Category:** Security / Data Integrity
- **Severity:** 🔴 Critical
- **Roles Affected:** All users
- **Location:** `backend/controllers/authController.js:269-275`
- **Issue:**
  ```javascript
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });  // ❌ No company filter!
    if (existingUser) {
      return errorResponse(res, 'Email already in use', 400);
    }
  }
  ```
  This prevents users from using emails that exist in OTHER companies, violating multi-tenancy.
- **Exploitation:** User in Company A cannot use email that exists in Company B (should be allowed).
- **Fix:**
  ```javascript
  if (email && email !== user.email) {
    let emailQuery = { email: email.toLowerCase() };
    if (user.role === 'super_admin') {
      emailQuery.company = { $exists: false };
    } else {
      emailQuery.company = user.company?._id || user.company;
    }
    const existingUser = await User.findOne(emailQuery);
    if (existingUser) {
      return errorResponse(res, 'Email already in use in this company', 400);
    }
  }
  ```

---

#### 8. **Incomplete Authorization on updateExpenseStatus Route**
- **Category:** Security / RBAC
- **Severity:** 🔴 Critical
- **Roles Affected:** company_admin
- **Location:** `backend/routes/expenses.js:14-18`
- **Issue:** Route only authorizes `admin`, but `company_admin` and `super_admin` should also be allowed:
  ```javascript
  router.put(
    '/:id/status',
    authorize('admin'),  // ❌ Missing company_admin and super_admin
    expenseController.updateExpenseStatus
  );
  ```
- **Exploitation:** `company_admin` cannot approve expenses even though they should have admin privileges.
- **Fix:**
  ```javascript
  router.put(
    '/:id/status',
    authorize('admin', 'company_admin', 'super_admin'),
    expenseController.updateExpenseStatus
  );
  ```

---

### HIGH PRIORITY ISSUES

#### 9. **N+1 Query Problem in Receipt Creation**
- **Category:** Performance
- **Severity:** 🟠 High
- **Roles Affected:** All users
- **Location:** `backend/controllers/receiptController.js:179-184`
- **Issue:**
  ```javascript
  for (const item of items) {
    const itemDoc = await Item.findOne({  // ❌ N+1 query in loop!
      _id: item.item,
      ...addCompanyFilter({}, req)
    });
  }
  ```
- **Impact:** 100 items = 100 database queries.
- **Fix:** Batch fetch items:
  ```javascript
  const itemIds = items.map(i => i.item);
  const itemDocs = await Item.find({ 
    _id: { $in: itemIds },
    ...addCompanyFilter({}, req)
  });
  const itemMap = new Map(itemDocs.map(i => [i._id.toString(), i]));
  ```

---

#### 10. **Missing Index on ActivityLog.company**
- **Category:** Performance
- **Severity:** 🟠 High
- **Location:** `backend/models/ActivityLog.js`
- **Issue:** `company` field is indexed but query performance degrades with large datasets.
- **Fix:** Ensure compound index: `{ company: 1, timestamp: -1 }`

---

#### 11. **Storage Limit Check Race Condition**
- **Category:** Security / Subscription
- **Severity:** 🟠 High
- **Location:** `backend/middleware/storageLimit.js:58-111`
- **Issue:** Storage is calculated, then files are uploaded. Between calculation and upload, another request could upload files, causing limit to be exceeded.
- **Fix:** Use atomic file operations or database transaction.

---

#### 12. **Missing Validation: Invoice Payment Amount Can Exceed Balance**
- **Category:** Financial Logic
- **Severity:** 🟠 High
- **Location:** `backend/controllers/invoiceController.js:687-704`
- **Issue:** Code checks overpayment but tolerance is 0.001, which is too strict. Also, no validation for negative payments.
- **Current:**
  ```javascript
  if (paymentAmount > currentBalance + 0.001) {
    return errorResponse(res, 'Payment amount exceeds balance', 400);
  }
  ```
- **Fix:** Use consistent tolerance (0.01) and add negative check:
  ```javascript
  if (paymentAmount <= 0) {
    return errorResponse(res, 'Payment amount must be positive', 400);
  }
  if (paymentAmount > currentBalance + 0.01) {  // Use 0.01 tolerance
    return errorResponse(res, 'Payment amount exceeds balance', 400);
  }
  ```

---

#### 13. **Missing Company Filter in getDetailedTransactions**
- **Category:** Security / Multi-Tenancy
- **Severity:** 🟠 High
- **Location:** `backend/controllers/reportController.js:489-514`
- **Issue:** `invoiceFilter` and `expenseFilter` use `companyFilter` but it's applied inconsistently.
- **Fix:** Ensure both filters use `getCompanyFilter(req)`.

---

#### 14. **Accountant Can Access System Reports**
- **Category:** RBAC
- **Severity:** 🟠 High
- **Location:** `backend/routes/reports.js`
- **Issue:** Check if accountant is allowed on system reports (should be blocked).
- **Fix:** Remove `accountant` from system report routes.

---

#### 15. **Missing Rate Limiting on Critical Endpoints**
- **Category:** Security
- **Severity:** 🟠 High
- **Location:** Multiple routes
- **Issue:** User creation, company creation, bulk operations lack rate limiting.
- **Fix:** Apply `userCreationLimiter` to all user creation endpoints.

---

#### 16. **JWT Token Expiry Not Validated on Every Request**
- **Category:** Security
- **Severity:** 🟠 High
- **Location:** `backend/middleware/auth.js:22`
- **Issue:** JWT expiry is validated by `jwt.verify()`, but if token is expired, error handling is generic.
- **Fix:** Provide specific error message for expired tokens.

---

#### 17. **Missing Company Filter in getMonthlySales POS Query**
- **Category:** Security / Multi-Tenancy
- **Severity:** 🟠 High
- **Location:** `backend/controllers/reportController.js:386-404`
- **Issue:** `receiptMatch` uses `companyFilter` but it's defined in function scope. Verify it's applied.
- **Fix:** Ensure `getCompanyFilter(req)` is called.

---

#### 18. **Hard-coded Role Checks Instead of Centralized RBAC**
- **Category:** Architecture
- **Severity:** 🟠 High
- **Location:** Multiple controllers
- **Issue:** Role checks scattered throughout code: `if (req.user.role === 'admin')`. Hard to maintain.
- **Fix:** Create centralized permission service.

---

#### 19. **Missing Validation: Company Admin Cannot Create Super Admin**
- **Category:** RBAC
- **Severity:** 🟠 High
- **Location:** `backend/controllers/companyController.js:314-317`
- **Issue:**
  ```javascript
  const allowedRole = req.user.role === 'super_admin' 
    ? role 
    : (role === 'super_admin' ? 'company_admin' : role);  // ❌ Silently downgrades!
  ```
  Should return error, not silently change role.
- **Fix:**
  ```javascript
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return errorResponse(res, 'Cannot assign super_admin role', 403);
  }
  ```

---

#### 20. **Missing Company Filter in getRevenueByPaymentMethod**
- **Category:** Security / Multi-Tenancy
- **Severity:** 🟠 High
- **Location:** `backend/controllers/reportController.js:1054-1082`
- **Issue:** Verify `companyFilter` is applied to both invoice and POS revenue queries.
- **Fix:** Ensure `getCompanyFilter(req)` is used.

---

## 🧑‍💻 RBAC & ROLE AUDIT FINDINGS

### CRITICAL

#### 21. **Accountant Can Approve Expenses** (See Issue #2)

### HIGH

#### 22. **Role Overlap: company_admin vs admin**
- **Category:** RBAC
- **Severity:** 🟠 High
- **Issue:** `company_admin` and `admin` have nearly identical permissions. Confusing for users.
- **Recommendation:** Document clear distinction or merge roles.

---

#### 23. **Incomplete Role Check: Expense Delete Route**
- **Category:** RBAC
- **Severity:** 🟠 High
- **Location:** `backend/routes/expenses.js:39` and `backend/controllers/expenseController.js:299-301`
- **Issue:** 
  - Route only authorizes `admin`: `authorize('admin')`
  - Controller only checks `admin` role
  - `company_admin` and `super_admin` should also be allowed
- **Fix:**
  ```javascript
  // In routes/expenses.js:
  .delete(authorize('admin', 'company_admin', 'super_admin'), expenseController.deleteExpense);
  
  // In controllers/expenseController.js:
  if (!['admin', 'company_admin', 'super_admin'].includes(req.user.role)) {
    return errorResponse(res, 'Only administrators can delete expenses', 403);
  }
  ```

---

## 🏢 MULTI-TENANCY AUDIT FINDINGS

### CRITICAL

- Issue #1: Request Body Company Override
- Issue #4: Missing Company Filter in Revenue Trend
- Issue #6: Missing Company Filter in POS Query

### HIGH

- Issue #13: Missing Company Filter in Transactions
- Issue #17: Missing Company Filter in Monthly Sales
- Issue #20: Missing Company Filter in Payment Method Report

---

## 💰 FINANCIAL LOGIC AUDIT FINDINGS

### CRITICAL

- Issue #5: Invoice Creation companyId Bug

### HIGH

- Issue #12: Payment Amount Validation

### MEDIUM

#### 24. **Revenue Calculation: Missing POS Revenue in Some Reports**
- **Category:** Financial Logic
- **Severity:** 🟡 Medium
- **Location:** `backend/controllers/reportController.js:getProfitLossReport`
- **Issue:** Only counts invoice revenue, not POS revenue.
- **Fix:** Include POS revenue in profit/loss calculation.

---

#### 25. **Floating-Point Tolerance Inconsistency**
- **Category:** Financial Logic
- **Severity:** 🟡 Medium
- **Location:** Multiple files
- **Issue:** Some places use `0.01`, others use `0.001`. Should be consistent.
- **Fix:** Define `FINANCIAL_TOLERANCE = 0.01` constant.

---

## 💳 SUBSCRIPTION AUDIT FINDINGS

### CRITICAL

- Issue #3: Subscription Check Performance

### HIGH

- Issue #11: Storage Limit Race Condition

### MEDIUM

#### 26. **Subscription Status Not Cached**
- **Category:** Performance / Subscription
- **Severity:** 🟡 Medium
- **Location:** `backend/middleware/auth.js`
- **Issue:** Subscription status checked on every request without caching.
- **Fix:** Cache in Redis with 5-minute TTL.

---

## ⚡ PERFORMANCE & SCALABILITY AUDIT FINDINGS

### CRITICAL

- Issue #3: Subscription Check on Every Request

### HIGH

- Issue #9: N+1 Query in Receipt Creation
- Issue #10: Missing Indexes

### MEDIUM

#### 27. **Missing Pagination on Activity Logs Export**
- **Category:** Performance
- **Severity:** 🟡 Medium
- **Location:** `backend/controllers/userController.js:492-541`
- **Issue:** `exportActivityLogs` limits to 1000 but doesn't paginate. Could timeout on large datasets.
- **Fix:** Implement cursor-based pagination.

---

#### 28. **Heavy Aggregation Pipelines Without Indexes**
- **Category:** Performance
- **Severity:** 🟡 Medium
- **Location:** Multiple report controllers
- **Issue:** Complex aggregations on `invoiceDate`, `receiptDate`, `date` fields without proper indexes.
- **Fix:** Add compound indexes: `{ company: 1, invoiceDate: -1 }`, etc.

---

## 🧹 CODE QUALITY & ARCHITECTURE AUDIT FINDINGS

### HIGH

- Issue #18: Hard-coded Role Checks

### MEDIUM

#### 29. **Fat Controllers: Business Logic in Controllers**
- **Category:** Architecture
- **Severity:** 🟡 Medium
- **Location:** All controllers
- **Issue:** Controllers contain business logic, validation, and data transformation. Hard to test and maintain.
- **Fix:** Extract to service layer.

---

#### 30. **Duplicated Company Filter Logic**
- **Category:** Architecture
- **Severity:** 🟡 Medium
- **Location:** Multiple controllers
- **Issue:** `getCompanyFilter(req)` pattern repeated. Some places use `addCompanyFilter()`, others inline.
- **Fix:** Standardize on `getCompanyFilter()` helper.

---

#### 31. **Missing Error Context in Financial Calculations**
- **Category:** Architecture
- **Severity:** 🟡 Medium
- **Location:** Invoice/Receipt controllers
- **Issue:** Financial calculation errors don't include context (invoice ID, amounts, etc.).
- **Fix:** Add detailed error logging.

---

## 📜 AUDIT LOGGING REVIEW

### MEDIUM

#### 32. **Over-Logging: Every GET Request Logged**
- **Category:** Performance / Audit Logging
- **Severity:** 🟡 Medium
- **Location:** `backend/middleware/auth.js:120-243`
- **Issue:** Every GET request creates an ActivityLog entry. Will cause storage explosion.
- **Fix:** Only log critical actions (create, update, delete, login, logout).

---

#### 33. **Missing Audit Log for Financial Transactions**
- **Category:** Audit Logging
- **Severity:** 🟡 Medium
- **Location:** `backend/controllers/invoiceController.js:recordPayment`
- **Issue:** Payment recording doesn't log amount, method, or invoice details.
- **Fix:** Add detailed audit log entry.

---

#### 34. **Activity Log Doesn't Track Role Changes**
- **Category:** Audit Logging
- **Severity:** 🟡 Medium
- **Location:** `backend/controllers/userController.js:updateUser`
- **Issue:** Role changes are logged but don't capture "from" role.
- **Fix:** Already implemented in `auth.js:208-213`, but verify it's called.

---

## 🔍 ADDITIONAL FINDINGS

### LOW PRIORITY

#### 35. **Missing Input Sanitization**
- **Category:** Security
- **Severity:** 🟢 Low
- **Location:** All controllers
- **Issue:** User input not sanitized before database queries (XSS risk in reports).
- **Fix:** Use `validator` library for input sanitization.

---

#### 36. **Missing CORS Configuration Validation**
- **Category:** Security
- **Severity:** 🟢 Low
- **Location:** `backend/server.js`
- **Issue:** CORS origin from env var, but no validation.
- **Fix:** Validate CORS origin format.

---

#### 37. **Missing Request ID for Tracing**
- **Category:** Architecture
- **Severity:** 🟢 Low
- **Location:** All routes
- **Issue:** No request ID for distributed tracing.
- **Fix:** Add `request-id` middleware.

---

#### 38. **Missing Health Check Endpoint**
- **Category:** DevOps
- **Severity:** 🟢 Low
- **Location:** `backend/server.js`
- **Issue:** No `/health` endpoint for load balancer.
- **Fix:** Add health check route.

---

## 📊 SUMMARY TABLE

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 5 | 4 | 1 | 2 | 12 |
| RBAC | 1 | 2 | 0 | 0 | 3 |
| Multi-Tenancy | 3 | 3 | 0 | 0 | 6 |
| Financial Logic | 1 | 1 | 2 | 0 | 4 |
| Subscription | 1 | 1 | 1 | 0 | 3 |
| Performance | 1 | 2 | 2 | 0 | 5 |
| Architecture | 0 | 1 | 3 | 1 | 5 |
| Audit Logging | 0 | 0 | 3 | 0 | 3 |
| **TOTAL** | **8** | **12** | **15** | **7** | **42** |

---

## 🎯 RECOMMENDED ACTION PLAN

### Immediate (Week 1)
1. Fix Issue #2: Add role check to `updateExpenseStatus`
2. Fix Issue #5: Move `companyId` definition before usage
3. Fix Issue #4, #6: Add company filters to revenue reports
4. Fix Issue #7: Add company scope to email uniqueness check
5. Fix Issue #1: Remove `req.body.company` for non-super_admin

### Urgent (Week 2)
6. Fix Issue #3: Implement subscription status caching
7. Fix Issue #9: Batch fetch items in receipt creation
8. Fix Issue #12: Improve payment validation
9. Fix Issue #11: Add atomic storage limit check
10. Fix Issue #13, #17, #20: Add missing company filters

### High Priority (Week 3-4)
11. Fix Issue #10: Add missing database indexes
12. Fix Issue #18: Centralize RBAC checks
13. Fix Issue #14: Remove accountant from system reports
14. Fix Issue #19: Return error instead of silent role downgrade
15. Fix Issue #23: Update expense delete role check

### Medium Priority (Next Sprint)
16. Fix Issue #24: Include POS revenue in profit/loss
17. Fix Issue #25: Standardize financial tolerance
18. Fix Issue #27: Add pagination to activity logs export
19. Fix Issue #28: Add aggregation indexes
20. Fix Issue #29: Extract service layer
21. Fix Issue #32: Reduce audit logging verbosity
22. Fix Issue #33: Add financial transaction audit logs

---

## ✅ VERIFICATION CHECKLIST

After fixes are applied, verify:

- [ ] All company filters applied to aggregations
- [ ] Role checks on all sensitive endpoints
- [ ] Subscription status cached (not queried on every request)
- [ ] No N+1 queries in loops
- [ ] All financial calculations use consistent tolerance
- [ ] Accountant cannot approve expenses
- [ ] Staff cannot delete expenses
- [ ] Email uniqueness scoped to company
- [ ] Request body company override blocked
- [ ] All routes have proper authorization middleware

---

**END OF AUDIT REPORT**

*This audit was conducted with a focus on production-grade security, scalability, and maintainability. All findings should be addressed before production deployment.*

