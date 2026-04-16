import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  familyName: { type: String, required: true },
  fullName: { type: String }, // Combined name for display
  entryYear: { type: Number, required: true },
  expectedGraduation: { type: String },
  department: { type: String },
  major: { type: String },
  gpa: { type: Number, default: 0 },
  totalCredits: { type: Number, default: 0 },
  gurProgress: { type: Number, default: 0 },
  avatar: { type: String },
  wellnessNotes: [{
    note: String,
    date: Date
  }]
}, { timestamps: true });

// Normalize identifiers and hash password before saving
userSchema.pre('save', async function(next) {
  // Normalize email and student ID for consistent lookup
  if (this.isModified('email') && this.email) {
    this.email = this.email.trim().toLowerCase();
  }
  if (this.isModified('studentId') && this.studentId) {
    this.studentId = this.studentId.trim();
  }

  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
