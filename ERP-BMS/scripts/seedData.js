const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const { generateCustomerCode, generateItemCode } = require('../utils/generateId');

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('? Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@ims.com' });
    if (!admin) {
      console.error('? Admin user not found. Run setup script first.');
      process.exit(1);
    }

    console.log('?? Seeding sample data...');
    // Customers & Items creation here...
    process.exit(0);
  } catch (error) {
    console.error('? Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
