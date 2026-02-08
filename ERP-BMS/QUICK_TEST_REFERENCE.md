# ⚡ Quick Test Reference

## 🚀 Quick Start Testing

### 1. Setup Test Environment

```bash
# Start backend server
cd backend
npm start

# In another terminal, run test script
node test_security_fixes.js
```

### 2. Manual API Testing (Postman/Insomnia)

#### Test User Update Company Validation
```http
PUT /api/users/:otherCompanyUserId
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "name": "Hacked User"
}
```
**Expected:** `404 User not found`

#### Test Role Escalation
```http
POST /api/users
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@test.com",
  "password": "Password123!",
  "role": "super_admin"
}
```
**Expected:** `403 Cannot assign super_admin role`

#### Test Company Access
```http
GET /api/companies/:otherCompanyId
Authorization: Bearer <companyAdminToken>
```
**Expected:** `403 Access denied`

#### Test Expense Status (Staff)
```http
POST /api/expenses
Authorization: Bearer <staffToken>
Content-Type: application/json

{
  "title": "Test Expense",
  "amount": 100,
  "status": "approved"
}
```
**Expected:** Expense created with status `pending` (not `approved`)

#### Test Storage Limit
```http
POST /api/expenses
Authorization: Bearer <adminToken>
Content-Type: multipart/form-data

title: "Large Expense"
amount: 100
attachments: <large file>
```
**Expected:** `400 Storage limit exceeded` (if over limit)

---

## 📋 Test Checklist

### Critical Fixes
- [ ] Admin cannot update users from other companies
- [ ] Admin cannot delete users from other companies
- [ ] Admin cannot assign super_admin role
- [ ] Company admin cannot access other companies
- [ ] JWT token invalidated when company changes
- [ ] Subscription checked on every request
- [ ] Email uniqueness works correctly
- [ ] User limits enforced

### High Priority Fixes
- [ ] Staff cannot set expense status
- [ ] Password reset scoped to company
- [ ] Storage limits enforced

---

## 🔍 Quick Verification Commands

### Check User Count vs Limit
```javascript
// In MongoDB shell or Compass
db.users.countDocuments({ company: ObjectId("companyId") })
// Compare with: db.companies.findOne({_id: ObjectId("companyId")}).subscription.maxUsers
```

### Check Storage Usage
```bash
# Calculate directory size
du -sh backend/uploads/<companyId>
```

### Check Subscription Status
```javascript
// In MongoDB
db.companies.findOne({_id: ObjectId("companyId")}).subscription.status
```

---

## ⚠️ Common Test Scenarios

### Scenario 1: Cross-Company Access Attempt
1. Login as Company A admin
2. Try to access Company B data
3. Should fail with 403/404

### Scenario 2: Role Escalation Attempt
1. Login as regular admin
2. Try to create/update user with super_admin role
3. Should fail with 403

### Scenario 3: Subscription Expiration
1. Set company subscription to expired
2. Try to access any endpoint
3. Should fail with 401

### Scenario 4: Limit Exceeded
1. Create users up to limit
2. Try to create one more
3. Should fail with 400

---

*For detailed test cases, see SECURITY_FIXES_TESTING_GUIDE.md*

