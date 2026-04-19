import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, generateToken } from '../middleware/auth.js';
import { difySyncService } from '../services/difySyncService.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { studentId, email, password, firstName, familyName, entryYear } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ studentId }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this student ID or email' });
    }

    // Create user
    const user = await User.create({
      studentId,
      email,
      password,
      firstName,
      familyName,
      fullName: `${firstName} ${familyName}`,
      entryYear
    });

    const token = generateToken(user._id);

    // Sync user to Dify
    difySyncService.syncUser(user).catch(err => {
      console.error('Background Dify sync failed:', err.message);
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        studentId: user.studentId,
        email: user.email,
        firstName: user.firstName,
        familyName: user.familyName,
        fullName: user.fullName,
        entryYear: user.entryYear
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login (supports student ID or email, case-insensitive)
router.post('/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
      return res.status(400).json({ message: 'Student ID / email and password are required' });
    }

    // Allow login with either student ID or email, case-insensitive
    const identifier = studentId.trim();
    const isEmail = identifier.includes('@');

    const query = isEmail
      ? { email: new RegExp(`^${identifier}$`, 'i') }
      : { studentId: new RegExp(`^${identifier}$`, 'i') };

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    // Sync user to Dify on login (to update latest data)
    difySyncService.syncUser(user).catch(err => {
      console.error('Background Dify sync failed:', err.message);
    });

    res.json({
      token,
      user: {
        id: user._id,
        studentId: user.studentId,
        email: user.email,
        firstName: user.firstName,
        familyName: user.familyName,
        fullName: user.fullName,
        entryYear: user.entryYear,
        expectedGraduation: user.expectedGraduation,
        department: user.department,
        major: user.major,
        gpa: user.gpa,
        totalCredits: user.totalCredits,
        gurProgress: user.gurProgress,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user._id,
      studentId: user.studentId,
      email: user.email,
      firstName: user.firstName,
      familyName: user.familyName,
      fullName: user.fullName,
      entryYear: user.entryYear,
      expectedGraduation: user.expectedGraduation,
      department: user.department,
      major: user.major,
      gpa: user.gpa,
      totalCredits: user.totalCredits,
      gurProgress: user.gurProgress,
      avatar: user.avatar
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, familyName, expectedGraduation, department, major, avatar } = req.body;

    // Build update object
    const updateData = {};
    if (firstName) {
      updateData.firstName = firstName;
      updateData.fullName = `${firstName} ${familyName || req.body.familyName || ''}`.trim();
    }
    if (familyName) {
      updateData.familyName = familyName;
      const currentFirstName = req.body.firstName || (await User.findById(req.user.id)).firstName;
      updateData.fullName = `${currentFirstName} ${familyName}`.trim();
    }
    if (expectedGraduation) updateData.expectedGraduation = expectedGraduation;
    if (department) updateData.department = department;
    if (major) updateData.major = major;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Sync updated user to Dify
    difySyncService.syncUser(user).catch(err => {
      console.error('Background Dify sync failed:', err.message);
    });

    res.json({
      id: user._id,
      studentId: user.studentId,
      email: user.email,
      firstName: user.firstName,
      familyName: user.familyName,
      fullName: user.fullName,
      entryYear: user.entryYear,
      expectedGraduation: user.expectedGraduation,
      department: user.department,
      major: user.major,
      gpa: user.gpa,
      totalCredits: user.totalCredits,
      gurProgress: user.gurProgress,
      avatar: user.avatar
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload avatar
router.put('/avatar', protect, async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ message: 'Avatar data is required' });
    }

    // Validate base64 image (should start with data:image)
    if (!avatar.startsWith('data:image')) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    // Check size (base64 is ~33% larger than binary, limit to ~500KB base64 = ~375KB image)
    if (avatar.length > 500 * 1024) {
      return res.status(400).json({ message: 'Image size too large. Please use a smaller image.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar },
      { new: true, runValidators: true }
    ).select('-password');

    // Sync avatar update to Dify
    difySyncService.syncUser(user).catch(err => {
      console.error('Background Dify sync failed:', err.message);
    });

    res.json({
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Change password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
