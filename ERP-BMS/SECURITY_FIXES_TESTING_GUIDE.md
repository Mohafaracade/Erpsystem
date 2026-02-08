# 🧪 Security Fixes Testing Guide

## Overview

This guide provides comprehensive test cases to verify all security fixes are working correctly.

**Date:** 2024  
**Status:** Testing Guide for Security Fixes

---

## 🎯 Testing Strategy

### Test Environment Setup

1. **Create Test Companies:**
   - Company A: `company-a@test.com` (Subscription: 5 users, 1000MB storage)
   - Company B: `company-b@test.com` (Subscription: 3 users, 500MB storage)

2. **Create Test Users:**
   - Super Admin: `superadmin@system.com`
   - Company A Admin: `admin-a@test.com` (Company A)
   - Company A Staff: `staff-a@test.com` (Company A)
   - Company B Admin: `admin-b@test.com` (Company B)
   - Company B Staff: `staff-b@test.com` (Company B)

3. **Test Tools:**
   - Postman / Insomnia for API testing
   - Browser DevTools for frontend testing
   - MongoDB Compass for database inspection

---

## 🔴 CRITICAL FIXES TESTING

### ✅ TEST #1: User Update Company Validation (FIX #1)

**Objective:** Verify admins cannot update users from other companies.

**Test Steps:**
1. Login as `admin-a@test.com` (Company A)
2. Get user ID of a user from Company B
3. Try to update that user:
   ```bash
   PUT /api/users/:companyBUserId
   {
     "name": "Hacked User"
   }
   ```

**Expected Result:**
- ❌ Should return `404 User not found` (not `403 Access denied` to prevent info leakage)
- User from Company B should NOT be updated

**Pass Criteria:**
- ✅ Cannot update users from other companies
- ✅ Returns 404, not 403
- ✅ Database shows user unchanged

---

### ✅ TEST #2: User Delete Company Validation (FIX #2)

**Objective:** Verify admins cannot delete users from other companies.

**Test Steps:**
1. Login as `admin-a@test.com` (Company A)
2. Get user ID of a user from Company B
3. Try to delete that user:
   ```bash
   DELETE /api/users/:companyBUserId
   ```

**Expected Result:**
- ❌ Should return `404 User not found`
- User from Company B should NOT be deleted

**Pass Criteria:**
- ✅ Cannot delete users from other companies
- ✅ Returns 404
- ✅ Database shows user still exists

---

### ✅ TEST #3: Role Escalation Prevention (FIX #3)

**Objective:** Verify admins cannot escalate roles to super_admin.

**Test Cases:**

#### Test 3.1: Admin Creating Super Admin
1. Login as `admin-a@test.com`
2. Try to create user with super_admin role:
   ```bash
   POST /api/users
   {
     "name": "New Super Admin",
     "email": "newsuper@test.com",
     "password": "Password123!",
     "role": "super_admin"
   }
   ```

**Expected Result:**
- ❌ Should return `403 Cannot assign super_admin role`
- User should NOT be created

#### Test 3.2: Admin Updating User to Super Admin
1. Login as `admin-a@test.com`
2. Get ID of a regular user in Company A
3. Try to update their role:
   ```bash
   PUT /api/users/:userId
   {
     "role": "super_admin"
   }
   ```

**Expected Result:**
- ❌ Should return `403 Cannot assign super_admin role`
- User role should NOT change

#### Test 3.3: Super Admin Can Create Super Admin
1. Login as `superadmin@system.com`
2. Create user with super_admin role:
   ```bash
   POST /api/users
   {
     "name": "Another Super Admin",
     "email": "super2@system.com",
     "password": "Password123!",
     "role": "super_admin"
   }
   ```

**Expected Result:**
- ✅ Should succeed (super_admin can create super_admin)
- User should be created

**Pass Criteria:**
- ✅ Non-super-admin cannot assign super_admin role
- ✅ Super admin can assign super_admin role
- ✅ Role validation works in both create and update

---

### ✅ TEST #4: Company Access Validation (FIX #4)

**Objective:** Verify company admins cannot access other companies.

**Test Cases:**

#### Test 4.1: Get Other Company
1. Login as `admin-a@test.com` (Company A)
2. Get Company B ID
3. Try to access Company B:
   ```bash
   GET /api/companies/:companyBId
   ```

**Expected Result:**
- ❌ Should return `403 Access denied`
- Should NOT return Company B data

#### Test 4.2: Update Other Company
1. Login as `admin-a@test.com`
2. Try to update Company B:
   ```bash
   PUT /api/companies/:companyBId
   {
     "name": "Hacked Company"
   }
   ```

**Expected Result:**
- ❌ Should return `403 Access denied`
- Company B should NOT be updated

#### Test 4.3: Get Other Company Users
1. Login as `admin-a@test.com`
2. Try to get Company B users:
   ```bash
   GET /api/companies/:companyBId/users
   ```

**Expected Result:**
- ❌ Should return `403 Access denied`
- Should NOT return Company B users

#### Test 4.4: Get Other Company Stats
1. Login as `admin-a@test.com`
2. Try to get Company B stats:
   ```bash
   GET /api/companies/:companyBId/stats
   ```

**Expected Result:**
- ❌ Should return `403 Access denied`
- Should NOT return Company B stats

**Pass Criteria:**
- ✅ Cannot access other companies via any endpoint
- ✅ All company endpoints properly validate access
- ✅ ObjectId comparison works correctly

---

### ✅ TEST #5: JWT Company Validation (FIX #11)

**Objective:** Verify JWT tokens are invalidated when company changes.

**Test Steps:**
1. Login as `admin-a@test.com` (Company A)
2. Save the JWT token
3. In database, change user's company to Company B
4. Try to use the saved token:
   ```bash
   GET /api/users
   Authorization: Bearer <saved_token>
   ```

**Expected Result:**
- ❌ Should return `401 Token invalid: Company changed. Please login again.`
- Should NOT allow access with old token

**Pass Criteria:**
- ✅ Token invalidated when company changes
- ✅ User must re-login after company change
- ✅ Prevents token reuse after company change

---

### ✅ TEST #6: Subscription Check on Every Request (FIX #20)

**Objective:** Verify subscription status is checked on every request.

**Test Steps:**
1. Login as `admin-a@test.com` (Company A)
2. Save the JWT token
3. In database, change Company A subscription status to 'suspended'
4. Try to use the token:
   ```bash
   GET /api/invoices
   Authorization: Bearer <token>
   ```

**Expected Result:**
- ❌ Should return `401 Company subscription is not active`
- Should NOT allow access

**Test Steps (Trial Expiration):**
1. Login as `admin-a@test.com`
2. Save the JWT token
3. In database, set Company A subscription:
   - status: 'trial'
   - endDate: yesterday (past date)
4. Try to use the token:
   ```bash
   GET /api/invoices
   Authorization: Bearer <token>
   ```

**Expected Result:**
- ❌ Should return `401 Company subscription has expired`
- Should NOT allow access

**Pass Criteria:**
- ✅ Subscription checked on every request
- ✅ Expired trials blocked
- ✅ Suspended subscriptions blocked
- ✅ Active subscriptions work

---

### ✅ TEST #7: Email Uniqueness Logic (FIX #8)

**Objective:** Verify email uniqueness works correctly for super_admin and regular users.

**Test Cases:**

#### Test 7.1: Super Admin Email Globally Unique
1. Create super_admin user: `super1@system.com`
2. Try to create another super_admin with same email:
   ```bash
   POST /api/users
   {
     "name": "Duplicate Super",
     "email": "super1@system.com",
     "password": "Password123!",
     "role": "super_admin"
   }
   ```

**Expected Result:**
- ❌ Should return `400 User with this email already exists`
- User should NOT be created

#### Test 7.2: Regular User Email Unique Per Company
1. Create user in Company A: `user@test.com`
2. Try to create user in Company B with same email:
   ```bash
   POST /api/users
   {
     "name": "User B",
     "email": "user@test.com",
     "password": "Password123!",
     "role": "staff",
     "company": "<companyBId>"
   }
   ```

**Expected Result:**
- ✅ Should succeed (same email allowed in different companies)
- User should be created

#### Test 7.3: Same Email in Same Company
1. Create user in Company A: `user@test.com`
2. Try to create another user in Company A with same email:
   ```bash
   POST /api/users
   {
     "name": "Duplicate User",
     "email": "user@test.com",
     "password": "Password123!",
     "role": "staff"
   }
   ```

**Expected Result:**
- ❌ Should return `400 User with this email already exists`
- User should NOT be created

**Pass Criteria:**
- ✅ Super admin emails globally unique
- ✅ Regular user emails unique per company
- ✅ Same email allowed in different companies
- ✅ Duplicate email blocked in same company

---

### ✅ TEST #8: User Limit Enforcement (FIX #18)

**Objective:** Verify user limits are enforced per subscription.

**Test Steps:**
1. Login as `admin-a@test.com` (Company A, limit: 5 users)
2. Check current user count (should be less than 5)
3. Create users until limit is reached
4. Try to create one more user:
   ```bash
   POST /api/users
   {
     "name": "Extra User",
     "email": "extra@test.com",
     "password": "Password123!",
     "role": "staff"
   }
   ```

**Expected Result:**
- ❌ Should return `400 User limit reached (5). Please upgrade your subscription.`
- User should NOT be created

**Pass Criteria:**
- ✅ User limit enforced
- ✅ Clear error message with limit info
- ✅ Cannot exceed subscription limit

---

## 🟠 HIGH PRIORITY FIXES TESTING

### ✅ TEST #9: Expense Status Can Be Set by Staff (FIX #9)

**Objective:** Verify staff cannot bypass expense approval workflow.

**Test Cases:**

#### Test 9.1: Staff Creating Expense with Status
1. Login as `staff-a@test.com`
2. Create expense with status in body:
   ```bash
   POST /api/expenses
   {
     "title": "Test Expense",
     "amount": 100,
     "status": "approved"  // ❌ Should be ignored
   }
   ```

**Expected Result:**
- ✅ Expense created but status should be 'pending' (not 'approved')
- Status from request body should be ignored

#### Test 9.2: Staff Updating Expense Status
1. Login as `staff-a@test.com`
2. Create expense (status: 'pending')
3. Try to update status:
   ```bash
   PUT /api/expenses/:expenseId
   {
     "status": "approved"
   }
   ```

**Expected Result:**
- ❌ Should return `403 Only administrators can change expense status`
- Status should remain 'pending'

#### Test 9.3: Admin Creating Expense with Status
1. Login as `admin-a@test.com`
2. Create expense with status:
   ```bash
   POST /api/expenses
   {
     "title": "Admin Expense",
     "amount": 100,
     "status": "approved"
   }
   ```

**Expected Result:**
- ✅ Expense created with status 'approved'
- Admin can set status

**Pass Criteria:**
- ✅ Staff cannot set expense status
- ✅ Staff expenses default to 'pending'
- ✅ Admins can set expense status
- ✅ Approval workflow enforced

---

### ✅ TEST #10: Password Reset Scoped to Company (FIX #12)

**Objective:** Verify password reset is properly scoped to company.

**Test Cases:**

#### Test 10.1: Password Reset with CompanyId
1. Request password reset:
   ```bash
   POST /api/auth/forgot-password
   {
     "email": "staff-a@test.com",
     "companyId": "<companyAId>"
   }
   ```

**Expected Result:**
- ✅ Should return success message
- Reset email sent to correct user

#### Test 10.2: Password Reset with Wrong CompanyId
1. Request password reset with wrong company:
   ```bash
   POST /api/auth/forgot-password
   {
     "email": "staff-a@test.com",
     "companyId": "<companyBId>"  // Wrong company
   }
   ```

**Expected Result:**
- ✅ Should return success message (no user enumeration)
- ❌ Reset email should NOT be sent (user not found in Company B)

#### Test 10.3: Password Reset Without CompanyId (Regular User)
1. Request password reset without companyId:
   ```bash
   POST /api/auth/forgot-password
   {
     "email": "staff-a@test.com"
   }
   ```

**Expected Result:**
- ✅ Should return success message (no user enumeration)
- ❌ Reset email should NOT be sent (requires companyId for regular users)

#### Test 10.4: Password Reset for Super Admin
1. Request password reset for super_admin:
   ```bash
   POST /api/auth/forgot-password
   {
     "email": "superadmin@system.com"
   }
   ```

**Expected Result:**
- ✅ Should return success message
- ✅ Reset email sent (super_admin doesn't need companyId)

#### Test 10.5: User Enumeration Prevention
1. Request password reset for non-existent email:
   ```bash
   POST /api/auth/forgot-password
   {
     "email": "nonexistent@test.com",
     "companyId": "<companyAId>"
   }
   ```

**Expected Result:**
- ✅ Should return same success message as valid email
- ❌ Should NOT reveal if user exists or not

**Pass Criteria:**
- ✅ Password reset scoped to company
- ✅ Wrong companyId doesn't send reset
- ✅ Super admin doesn't need companyId
- ✅ No user enumeration possible
- ✅ Always returns same success message

---

### ✅ TEST #11: Storage Limit Enforcement (FIX #19)

**Objective:** Verify storage limits are enforced per subscription.

**Test Steps:**
1. Login as `admin-a@test.com` (Company A, limit: 1000MB)
2. Check current storage usage
3. Upload files until near limit
4. Try to upload file that exceeds limit:
   ```bash
   POST /api/expenses
   Content-Type: multipart/form-data
   {
     "title": "Large Expense",
     "amount": 100,
     "attachments": <file larger than available storage>
   }
   ```

**Expected Result:**
- ❌ Should return `400 Storage limit exceeded. Used: XMB / 1000MB. Available: YMB.`
- File should NOT be uploaded
- Clear error message with usage details

**Test Steps (Within Limit):**
1. Delete some files to free up space
2. Try to upload file within limit:
   ```bash
   POST /api/expenses
   {
     "title": "Small Expense",
     "amount": 50,
     "attachments": <file within available storage>
   }
   ```

**Expected Result:**
- ✅ Should succeed
- File uploaded successfully

**Pass Criteria:**
- ✅ Storage limit enforced
- ✅ Clear error message with usage
- ✅ Uploads blocked when limit exceeded
- ✅ Uploads allowed when within limit
- ✅ Storage calculation accurate

---

## 📋 TEST CHECKLIST

### Critical Fixes
- [ ] Test #1: User Update Company Validation
- [ ] Test #2: User Delete Company Validation
- [ ] Test #3: Role Escalation Prevention
- [ ] Test #4: Company Access Validation
- [ ] Test #5: JWT Company Validation
- [ ] Test #6: Subscription Check on Every Request
- [ ] Test #7: Email Uniqueness Logic
- [ ] Test #8: User Limit Enforcement

### High Priority Fixes
- [ ] Test #9: Expense Status Can Be Set by Staff
- [ ] Test #10: Password Reset Scoped to Company
- [ ] Test #11: Storage Limit Enforcement

---

## 🐛 Troubleshooting

### Common Issues

1. **Token Not Invalidating:**
   - Check JWT_SECRET is set correctly
   - Verify token contains companyId
   - Check middleware is running

2. **Storage Limit Not Working:**
   - Verify company has subscription.maxStorage set
   - Check storage calculation function
   - Verify middleware is applied to routes

3. **Company Validation Failing:**
   - Check ObjectId comparison logic
   - Verify user.company is populated
   - Check company exists in database

---

## 📊 Test Results Template

```
Test #1: User Update Company Validation
Status: ✅ PASS / ❌ FAIL
Notes: [Any issues found]

Test #2: User Delete Company Validation
Status: ✅ PASS / ❌ FAIL
Notes: [Any issues found]

[... continue for all tests ...]
```

---

## ✅ Success Criteria

All tests must pass before deploying to production:
- ✅ All critical fixes working
- ✅ All high priority fixes working
- ✅ No security vulnerabilities exposed
- ✅ Proper error messages
- ✅ No information leakage
- ✅ Multi-tenant isolation maintained

---

*Complete all tests before production deployment.*

