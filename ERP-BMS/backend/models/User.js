const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      // Super admin doesn't need a company
      return this.role !== 'super_admin';
    },
    index: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'company_admin', 'admin', 'accountant', 'staff'],
    default: 'staff'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  activityLog: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  // ✅ FIX: Ensure companyId is always a string ObjectId, never an object
  let companyId = null;
  if (this.company) {
    // Handle both ObjectId and populated company object
    companyId = this.company._id ? this.company._id.toString() : this.company.toString();
  }
  
  return jwt.sign(
    { 
      userId: this._id.toString(),
      email: this.email,
      role: this.role,
      companyId: companyId
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = jwt.sign(
    { userId: this._id },
    process.env.JWT_SECRET + this.password,
    { expiresIn: `${process.env.RESET_TOKEN_EXPIRE}m` }
  );
  
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + parseInt(process.env.RESET_TOKEN_EXPIRE) * 60 * 1000;
  
  return resetToken;
};

// Compound index for email uniqueness per company
// Super admin emails are globally unique, others are unique per company
userSchema.index({ email: 1, company: 1 }, { 
  unique: true, 
  partialFilterExpression: { company: { $exists: true } } 
});
userSchema.index({ company: 1 });
userSchema.index({ role: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;