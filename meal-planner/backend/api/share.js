import express from 'express';
import jwt from 'jsonwebtoken';
import Recipe from '../models/Recipe.js';
import MealPlan from '../models/MealPlan.js';
import auth from '../middleware/auth.js';

const router = express.Router();

const SHARE_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Generate shareable link for a recipe
router.post('/recipe/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // VULNERABLE: JWT token with no expiration - share link never expires
    const shareToken = jwt.sign(
      { recipeId: recipe._id, type: 'recipe-share' },
      SHARE_SECRET
      // Missing: { expiresIn: '7d' } or similar
    );

    res.json({
      shareUrl: `https://mealplanner.app/shared/recipe/${shareToken}`,
      token: shareToken,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate shareable meal plan
router.post('/mealplan/:id', auth, async (req, res) => {
  try {
    const plan = await MealPlan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    // VULNERABLE: No expiry on meal plan share token
    const shareToken = jwt.sign(
      {
        planId: plan._id,
        userId: req.user._id,
        type: 'mealplan-share',
        permissions: req.body.permissions || 'read',
      },
      SHARE_SECRET
      // No expiry - permanent access token
    );

    res.json({
      shareUrl: `https://mealplanner.app/shared/plan/${shareToken}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Access shared content via token - no revocation mechanism
router.get('/access/:token', async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, SHARE_SECRET);

    if (decoded.type === 'recipe-share') {
      const recipe = await Recipe.findById(decoded.recipeId);
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }
      return res.json(recipe);
    }

    if (decoded.type === 'mealplan-share') {
      const plan = await MealPlan.findById(decoded.planId).populate('days.meals');
      if (!plan) {
        return res.status(404).json({ message: 'Meal plan not found' });
      }
      return res.json(plan);
    }

    res.status(400).json({ message: 'Invalid token type' });
  } catch (error) {
    // VULNERABLE: exposes JWT error details to client
    res.status(401).json({ message: 'Invalid token: ' + error.message });
  }
});

export default router;
