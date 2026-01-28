const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const setupDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('? Connected to MongoDB');

    const adminExists = await User.findOne({ email: 'admin@ims.com' });
    if (!adminExists) {
      const adminUser = new User({
        name: 'Super Admin',
        email: 'admin@ims.com',
        password: 'Admin@123',
        role: 'admin',
        isActive: true
      });
      await adminUser.save();
      console.log('? Admin user created successfully');
    } else {
      console.log('? Admin user already exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('? Error setting up database:', error);
    process.exit(1);
  }
};

setupDatabase();
