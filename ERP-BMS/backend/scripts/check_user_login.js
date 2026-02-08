/**
 * Script to check user login credentials
 * Run: node scripts/check_user_login.js <email>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company'); // ✅ Ensure Company model is registered for populate
const bcrypt = require('bcryptjs');

const checkUserLogin = async () => {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Please provide email address');
      console.log('Usage: node scripts/check_user_login.js <email>');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find user by email (case-insensitive search)
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password')
      .populate('company', 'name email isActive subscription.status subscription.endDate');

    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      console.log('\nChecking all users in database:');
      const allUsers = await User.find({}).select('email role');
      if (allUsers.length === 0) {
        console.log('   No users found in database');
      } else {
        allUsers.forEach((u, i) => {
          console.log(`   ${i + 1}. ${u.email} (${u.role})`);
        });
      }
      process.exit(1);
    }

    console.log(`✅ User found: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Has Password: ${user.password ? 'YES' : 'NO'}`);
    console.log(`   Password Length: ${user.password ? user.password.length : 0}`);
    
    if (user.company) {
      console.log(`   Company: ${user.company.name}`);
      console.log(`   Company Active: ${user.company.isActive}`);
      console.log(`   Subscription Status: ${user.company.subscription?.status || 'NOT SET'}`);
      console.log(`   Subscription End Date: ${user.company.subscription?.endDate || 'NOT SET'}`);
      
      // Check subscription validity
      const now = new Date();
      const endDate = user.company.subscription?.endDate;
      const status = user.company.subscription?.status;
      
      let subscriptionValid = false;
      if (user.company.isActive && ['active', 'trial'].includes(status)) {
        if (!endDate || endDate > now) {
          subscriptionValid = true;
        }
      }
      console.log(`   ✅ Valid Subscription: ${subscriptionValid ? 'YES' : 'NO'}`);
    } else {
      console.log(`   Company: None (super_admin)`);
    }

    // Test password if provided
    const testPassword = process.argv[3];
    if (testPassword) {
      console.log('\n--- Testing Password ---');
      try {
        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log(`   Password Match: ${isValid ? '✅ YES' : '❌ NO'}`);
        
        if (!isValid) {
          console.log('\n⚠️  Password does not match!');
          console.log('   Possible issues:');
          console.log('   1. Wrong password entered');
          console.log('   2. Password was not hashed correctly');
          console.log('   3. Password was double-hashed');
        }
      } catch (error) {
        console.log(`   ❌ Error comparing password: ${error.message}`);
        console.log('   Password might be corrupted or not hashed');
      }
    } else {
      console.log('\n💡 To test password, run:');
      console.log(`   node scripts/check_user_login.js ${email} <password>`);
    }

    // Check if user can login
    console.log('\n--- Login Status ---');
    if (!user.isActive) {
      console.log('   ❌ User is deactivated');
    } else if (user.role !== 'super_admin' && user.company) {
      if (!user.company.isActive) {
        console.log('   ❌ Company is inactive');
      } else if (!['active', 'trial'].includes(user.company.subscription?.status)) {
        console.log('   ❌ Subscription is not active');
      } else if (user.company.subscription?.endDate && user.company.subscription.endDate < new Date()) {
        console.log('   ❌ Subscription has expired');
      } else {
        console.log('   ✅ User can login');
      }
    } else {
      console.log('   ✅ User can login (super_admin)');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkUserLogin();

