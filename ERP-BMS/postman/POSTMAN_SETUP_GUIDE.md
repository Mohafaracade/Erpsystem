# 📮 Postman Setup Guide

## Quick Start

### 1. Import Collection and Environment

1. **Open Postman**
2. **Import Collection:**
   - Click "Import" button
   - Select `Security_Fixes_Test_Collection.json`
   - Collection will appear in sidebar

3. **Import Environment:**
   - Click "Import" button
   - Select `Postman_Environment.json`
   - Environment will be available in dropdown

4. **Select Environment:**
   - Click environment dropdown (top right)
   - Select "Security Fixes Test Environment"

### 2. Configure Base URL

1. Click on environment name (top right)
2. Edit "baseUrl" variable if needed
3. Default: `http://localhost:5000`

### 3. Run Tests

#### Step 1: Login First
1. Go to **"1. Authentication"** folder
2. Run **"Login - Super Admin"** first
3. Run **"Login - Company A Admin"**
4. Run **"Login - Company A Staff"**
5. Run **"Login - Company B Admin"**

**Note:** Tokens are automatically saved to environment variables!

#### Step 2: Run Security Tests
1. Go to **"2. CRITICAL FIXES"** folder
2. Run tests in order:
   - User Management tests
   - Company Access tests
   - Subscription tests

3. Go to **"3. HIGH PRIORITY FIXES"** folder
4. Run tests:
   - Expense Status tests
   - Password Reset tests
   - Storage Limit tests

---

## 📋 Test Execution Order

### Recommended Order:

1. ✅ **Authentication** (Login all users)
   - Login - Super Admin
   - Login - Company A Admin
   - Login - Company A Staff
   - Login - Company B Admin

2. ✅ **Get User IDs** (for cross-company tests)
   - Get All Users (Company A Admin)
   - Get All Users (Company B Admin)

3. ✅ **Critical Fixes Tests**
   - Try Update User from Other Company (Should FAIL)
   - Try Delete User from Other Company (Should FAIL)
   - Try Create User with Super Admin Role (Should FAIL)
   - Try Access Other Company (Should FAIL)
   - Try Update Other Company (Should FAIL)

4. ✅ **High Priority Fixes Tests**
   - Staff Create Expense with Status (Status should be 'pending')
   - Staff Try Update Expense Status (Should FAIL)
   - Password Reset tests
   - Storage Limit tests

---

## 🔍 Understanding Test Results

### ✅ PASS Criteria:

**Test #1: User Update Company Validation**
- Status: `404 Not Found`
- Message: "User not found"
- ✅ User from other company NOT updated

**Test #2: User Delete Company Validation**
- Status: `404 Not Found`
- Message: "User not found"
- ✅ User from other company NOT deleted

**Test #3: Role Escalation Prevention**
- Status: `403 Forbidden`
- Message: "Cannot assign super_admin role"
- ✅ User NOT created with super_admin role

**Test #4: Company Access Validation**
- Status: `403 Forbidden`
- Message: "Access denied"
- ✅ Cannot access other company data

**Test #9: Expense Status (Staff)**
- Status: `201 Created`
- Expense status: `pending` (not `approved`)
- ✅ Staff cannot bypass approval

**Test #10: Password Reset**
- Status: `200 OK`
- Same success message (no user enumeration)
- ✅ Properly scoped to company

**Test #11: Storage Limit**
- Status: `400 Bad Request`
- Message: "Storage limit exceeded"
- ✅ Upload blocked when over limit

---

## 🛠️ Manual Configuration

### If Auto-Save Doesn't Work:

1. **Get User IDs Manually:**
   - Run "Get All Users" requests
   - Copy user IDs from response
   - Update environment variables:
     - `companyAUserId`
     - `companyBUserId`

2. **Get Company IDs:**
   - Run "Get All Companies" (Super Admin)
   - Copy company IDs from response
   - Update environment variables:
     - `companyAId`
     - `companyBId`

3. **Update Expense ID:**
   - Create an expense first
   - Copy expense ID from response
   - Update `:expenseId` in "Staff Try Update Expense Status" request

---

## 📊 Test Results Checklist

After running all tests, verify:

### Critical Fixes:
- [ ] ✅ Cannot update users from other companies
- [ ] ✅ Cannot delete users from other companies
- [ ] ✅ Cannot assign super_admin role
- [ ] ✅ Cannot access other companies
- [ ] ✅ Subscription checked on every request
- [ ] ✅ User limits enforced

### High Priority Fixes:
- [ ] ✅ Staff cannot set expense status
- [ ] ✅ Password reset scoped to company
- [ ] ✅ Storage limits enforced

---

## 🐛 Troubleshooting

### Issue: Tokens Not Saving
**Solution:**
- Check environment is selected
- Verify test scripts are running
- Manually copy tokens to environment

### Issue: 401 Unauthorized
**Solution:**
- Re-run login requests
- Check token is valid
- Verify backend server is running

### Issue: Variables Not Found
**Solution:**
- Run "Get All Users" requests first
- Manually set IDs in environment
- Check variable names match

### Issue: Tests Failing Unexpectedly
**Solution:**
- Verify test data exists in database
- Check user/company IDs are correct
- Review expected vs actual results

---

## 📝 Notes

- **All tests use environment variables** - Make sure environment is selected
- **Tokens auto-save** - After login, tokens are saved automatically
- **Some tests require manual setup** - Like expense IDs, file uploads
- **Test results shown in Postman** - Check "Test Results" tab

---

## 🚀 Quick Test Run

1. Import collection and environment
2. Select environment
3. Run all login requests (in order)
4. Run "Get All Users" requests
5. Run all security test requests
6. Check test results (green = pass, red = fail)

---

*Happy Testing! 🧪*

