import express from 'express';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

// Update user profile - no input validation
router.put('/update', async (req, res) => {
  try {
    // NO VALIDATION: accepting arbitrary fields from user
    // User could inject MongoDB operators like $set, $unset, etc.
    const updates = req.body;

    // MASS ASSIGNMENT: allows updating any user field including sensitive ones
    // like 'role', 'isAdmin', 'passwordHash', etc.
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,  // Direct pass of user input to DB update
      { new: true, runValidators: false }  // runValidators: false makes it worse
    );

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user by ID - IDOR + info disclosure
router.get('/:userId', async (req, res) => {
  try {
    // NO AUTHORIZATION: any logged-in user can view any other user's profile
    // including sensitive fields
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // SENSITIVE DATA EXPOSURE: returning password hash and internal fields
    res.json(user);  // Should use .select('-password -__v') or a DTO
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload profile picture - path traversal vulnerability
router.post('/avatar', async (req, res) => {
  try {
    const { filename, content } = req.body;

    // PATH TRAVERSAL: user controls filename, could write to ../../../etc/passwd
    const uploadDir = '/tmp/uploads/avatars';
    const filePath = path.join(uploadDir, filename);  // No path.basename() sanitization!

    // Also accepts base64 content without validating it's actually an image
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(filePath, buffer);

    await User.findByIdAndUpdate(req.user._id, {
      avatarUrl: `/uploads/avatars/${filename}`,
    });

    res.json({ avatarUrl: `/uploads/avatars/${filename}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete account - no confirmation, no cascade
router.delete('/delete', async (req, res) => {
  try {
    // NO CONFIRMATION: deletes immediately without password verification
    await User.findByIdAndDelete(req.user._id);
    // BUG: doesn't delete associated meal plans, recipes, etc.
    res.json({ message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
