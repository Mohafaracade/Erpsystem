/**
 * Multi-Tenancy Migration Script
 * 
 * This script migrates existing data to support multi-tenancy:
 * 1. Creates a default company
 * 2. Assigns all existing users to the default company
 * 3. Assigns all existing data to the default company
 * 
 * Run: node migrations/001_add_multi_tenancy.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Item = require('../models/Item');
const Expense = require('../models/Expense');
const SalesReceipt = require('../models/SalesReceipt');
const ActivityLog = require('../models/ActivityLog');

const DEFAULT_COMPANY_NAME = process.env.DEFAULT_COMPANY_NAME || 'Default Company';
const DEFAULT_COMPANY_EMAIL = process.env.DEFAULT_COMPANY_EMAIL || 'admin@defaultcompany.com';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@system.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';

async function migrate() {
  try {
    console.log('🔄 Starting Multi-Tenancy Migration...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Create default company
    console.log('📦 Step 1: Creating default company...');
    let defaultCompany = await Company.findOne({ email: DEFAULT_COMPANY_EMAIL });
    
    if (!defaultCompany) {
      // Create super admin user first (if doesn't exist)
      let superAdmin = await User.findOne({ email: SUPER_ADMIN_EMAIL });
      if (!superAdmin) {
        // Use plain password - User model's pre-save hook will hash it
        superAdmin = await User.create({
          name: 'Super Administrator',
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD, // Plain password - will be hashed by pre-save hook
          role: 'super_admin',
          isActive: true
        });
        console.log('   ✅ Created super admin user');
      } else {
        console.log('   ℹ️  Super admin user already exists');
      }

      defaultCompany = await Company.create({
        name: DEFAULT_COMPANY_NAME,
        email: DEFAULT_COMPANY_EMAIL,
        subscription: {
          plan: 'enterprise',
          status: 'active',
          startDate: new Date(),
          billingCycle: 'monthly',
          maxUsers: 1000,
          maxStorage: 10000
        },
        settings: {
          currency: 'USD',
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          invoicePrefix: 'INV',
          receiptPrefix: 'REC'
        },
        isActive: true,
        activatedAt: new Date(),
        createdBy: superAdmin._id
      });
      console.log('   ✅ Created default company:', defaultCompany.name);
    } else {
      console.log('   ℹ️  Default company already exists');
    }

    const companyId = defaultCompany._id;
    console.log(`   📍 Company ID: ${companyId}\n`);

    // Step 2: Update users (assign to default company, except super_admin)
    console.log('👥 Step 2: Updating users...');
    const usersToUpdate = await User.find({ 
      role: { $ne: 'super_admin' },
      company: { $exists: false }
    });
    
    if (usersToUpdate.length > 0) {
      await User.updateMany(
        { _id: { $in: usersToUpdate.map(u => u._id) } },
        { $set: { company: companyId } }
      );
      console.log(`   ✅ Updated ${usersToUpdate.length} users`);
    } else {
      console.log('   ℹ️  No users to update');
    }
    console.log('');

    // Step 3: Update customers
    console.log('👤 Step 3: Updating customers...');
    const customersToUpdate = await Customer.find({ company: { $exists: false } });
    if (customersToUpdate.length > 0) {
      await Customer.updateMany(
        { _id: { $in: customersToUpdate.map(c => c._id) } },
        { $set: { company: companyId } }
      );
      console.log(`   ✅ Updated ${customersToUpdate.length} customers`);
    } else {
      console.log('   ℹ️  No customers to update');
    }
    console.log('');

    // Step 4: Update invoices
    console.log('📄 Step 4: Updating invoices...');
    const invoicesToUpdate = await Invoice.find({ company: { $exists: false } });
    if (invoicesToUpdate.length > 0) {
      await Invoice.updateMany(
        { _id: { $in: invoicesToUpdate.map(i => i._id) } },
        { $set: { company: companyId } }
      );
      console.log(`   ✅ Updated ${invoicesToUpdate.length} invoices`);
    } else {
      console.log('   ℹ️  No invoices to update');
    }
    console.log('');

    // Step 5: Update items
    console.log('📦 Step 5: Updating items...');
    const itemsToUpdate = await Item.find({ company: { $exists: false } });
    if (itemsToUpdate.length > 0) {
      await Item.updateMany(
        { _id: { $in: itemsToUpdate.map(i => i._id) } },
        { $set: { company: companyId } }
      );
      console.log(`   ✅ Updated ${itemsToUpdate.length} items`);
    } else {
      console.log('   ℹ️  No items to update');
    }
    console.log('');

    // Step 6: Update expenses
    console.log('💰 Step 6: Updating expenses...');
    const expensesToUpdate = await Expense.find({ company: { $exists: false } });
    if (expensesToUpdate.length > 0) {
      await Expense.updateMany(
        { _id: { $in: expensesToUpdate.map(e => e._id) } },
        { $set: { company: companyId } }
      );
      console.log(`   ✅ Updated ${expensesToUpdate.length} expenses`);
    } else {
      console.log('   ℹ️  No expenses to update');
    }
    console.log('');

    // Step 7: Update sales receipts
    console.log('🧾 Step 7: Updating sales receipts...');
    const receiptsToUpdate = await SalesReceipt.find({ company: { $exists: false } });
    if (receiptsToUpdate.length > 0) {
      await SalesReceipt.updateMany(
        { _id: { $in: receiptsToUpdate.map(r => r._id) } },
        { $set: { company: companyId } }
      );
      console.log(`   ✅ Updated ${receiptsToUpdate.length} sales receipts`);
    } else {
      console.log('   ℹ️  No sales receipts to update');
    }
    console.log('');

    // Step 8: Update activity logs
    console.log('📋 Step 8: Updating activity logs...');
    const logsToUpdate = await ActivityLog.find({ company: { $exists: false } });
    if (logsToUpdate.length > 0) {
      // For activity logs, we need to get company from user
      for (const log of logsToUpdate) {
        const user = await User.findById(log.user);
        if (user && user.company) {
          await ActivityLog.updateOne(
            { _id: log._id },
            { $set: { company: user.company } }
          );
        } else {
          await ActivityLog.updateOne(
            { _id: log._id },
            { $set: { company: companyId } }
          );
        }
      }
      console.log(`   ✅ Updated ${logsToUpdate.length} activity logs`);
    } else {
      console.log('   ℹ️  No activity logs to update');
    }
    console.log('');

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Summary:');
    console.log(`   - Default Company: ${defaultCompany.name} (${defaultCompany.email})`);
    console.log(`   - Super Admin: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   - Super Admin Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log('\n⚠️  IMPORTANT: Change the super admin password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();

