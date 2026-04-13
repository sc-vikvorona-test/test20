import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// In-memory token store (not persistent, cleared on restart)
const resetTokens = new Map();

// Request password reset
// NO RATE LIMITING: can be spammed to enumerate valid emails
// and to flood user's inbox
router.post('/request', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    // USER ENUMERATION: different responses for valid vs invalid emails
    if (!user) {
      return res.status(404).json({ message: 'No account with that email exists' });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 3600000; // 1 hour

    resetTokens.set(token, { userId: user._id, expiry });

    // In real app, would send email here
    console.log('Reset token:', token); // SECURITY: logging sensitive token

    // INSECURE: returning token in response instead of sending via email
    res.json({
      message: 'Password reset email sent',
      // BUG: should never return the token in the response!
      debug_token: token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reset password with token
router.post('/reset', async (req, res) => {
  const { token, newPassword } = req.body;

  // TOKEN TIMING ATTACK: using direct Map lookup, which is constant time
  // but the response timing differs for valid vs invalid tokens
  const resetData = resetTokens.get(token);

  if (!resetData) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }

  if (Date.now() > resetData.expiry) {
    resetTokens.delete(token);
    return res.status(400).json({ message: 'Reset token has expired' });
  }

  try {
    // NO PASSWORD VALIDATION: allows empty or very weak passwords
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(resetData.userId, {
      password: hashedPassword,
    });

    // BUG: token not deleted after single use, allowing replay attacks
    // resetTokens.delete(token);  // This line is commented out!

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
