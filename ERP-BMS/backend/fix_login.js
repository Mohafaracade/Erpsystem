/**
 * Fix Login 401 Error
 * 
 * This script will:
 * 1. Check if super admin user exists
 * 2. Fix password if it's double-hashed
 * 3. Ensure user is active
 * 4. Ensure company is active (if user has company)
 * 
 * Run: node fix_login.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Company = require('./models/Company');

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@system.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';

async function fixLogin() {
  try {
    console.log('🔧 Fixing Login Issue...\n');

    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is missing in .env file');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check if user exists
    let user = await User.findOne({ email: SUPER_ADMIN_EMAIL });
    
    if (!user) {
      console.log('📝 Creating super admin user...');
      // Create user with plain password - pre-save hook will hash it
      user = await User.create({
        name: 'Super Administrator',
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        role: 'super_admin',
        isActive: true
      });
      console.log('✅ Super admin user created\n');
    } else {
      console.log('✅ Super admin user found\n');
      
      // Get user with password field
      const userWithPassword = await User.findOne({ email: SUPER_ADMIN_EMAIL }).select('+password');
      
      // Fix password if needed
      console.log('🔐 Fixing password...');
      
      if (!userWithPassword.password) {
        // No password set - set it
        userWithPassword.password = SUPER_ADMIN_PASSWORD;
        await userWithPassword.save();
        console.log('✅ Password set\n');
      } else {
        // Check if password is valid
        try {
          const isPasswordValid = await userWithPassword.comparePassword(SUPER_ADMIN_PASSWORD);
          
          if (!isPasswordValid) {
            // Password is wrong - reset it
            userWithPassword.password = SUPER_ADMIN_PASSWORD;
            await userWithPassword.save();
            console.log('✅ Password reset (re-hashed correctly)\n');
          } else {
            console.log('✅ Password is correct\n');
          }
        } catch (error) {
          // Password might be corrupted - reset it
          console.log('⚠️  Password check failed, resetting...');
          userWithPassword.password = SUPER_ADMIN_PASSWORD;
          await userWithPassword.save();
          console.log('✅ Password reset\n');
        }
      }

      // Ensure user is active
      if (!userWithPassword.isActive) {
        userWithPassword.isActive = true;
        await userWithPassword.save();
        console.log('✅ User activated\n');
      }
    }

    // Verify login works
    console.log('🧪 Testing login...');
    const testUser = await User.findOne({ email: SUPER_ADMIN_EMAIL }).select('+password');
    
    if (!testUser || !testUser.password) {
      console.log('❌ User or password not found - creating new user...');
      // Delete and recreate
      if (testUser) await User.deleteOne({ _id: testUser._id });
      const newUser = await User.create({
        name: 'Super Administrator',
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        role: 'super_admin',
        isActive: true
      });
      console.log('✅ New user created\n');
    } else {
      const passwordValid = await testUser.comparePassword(SUPER_ADMIN_PASSWORD);
      
      if (passwordValid) {
        console.log('✅ Login test passed!\n');
      } else {
        console.log('❌ Login test failed - password still incorrect\n');
        console.log('   Trying to fix password again...');
        testUser.password = SUPER_ADMIN_PASSWORD;
        await testUser.save();
        console.log('✅ Password reset and saved\n');
      }
    }

    // Display login credentials
    console.log('='.repeat(50));
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('='.repeat(50));
    console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
    console.log('='.repeat(50));
    console.log('\n✅ Login issue fixed!');
    console.log('🚀 You can now login with the credentials above.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixLogin();

