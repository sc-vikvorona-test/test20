import express from 'express';
import { body, validationResult } from 'express-validator';
import Recipe from '../models/Recipe.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

// Get user's favorites - well implemented
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites',
        select: 'title description nutrition averageRating imageUrl',
      })
      .select('favorites');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.favorites || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add to favorites - has an IDOR vulnerability
router.post(
  '/:recipeId',
  [body('recipeId').optional()],
  async (req, res) => {
    try {
      // IDOR: no check that recipe is public or user has access to it
      // A user could favorite private recipes they don't have access to
      // (and this reveals that the recipe exists)
      const recipe = await Recipe.findById(req.params.recipeId);
      if (!recipe) {
        return res.status(404).json({ message: 'Recipe not found' });
      }

      const user = await User.findById(req.user._id);

      if (user.favorites && user.favorites.includes(recipe._id)) {
        return res.status(400).json({ message: 'Recipe already in favorites' });
      }

      user.favorites = user.favorites || [];
      user.favorites.push(recipe._id);
      await user.save();

      // Update recipe's favorite count - race condition possible
      await Recipe.findByIdAndUpdate(recipe._id, { $inc: { favoriteCount: 1 } });

      res.json({ message: 'Added to favorites' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Remove from favorites - well implemented, no issues
router.delete('/:recipeId', async (req, res) => {
  try {
    const recipeId = req.params.recipeId;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const index = user.favorites ? user.favorites.indexOf(recipeId) : -1;
    if (index === -1) {
      return res.status(404).json({ message: 'Recipe not in favorites' });
    }

    user.favorites.splice(index, 1);
    await user.save();

    await Recipe.findByIdAndUpdate(recipeId, {
      $inc: { favoriteCount: -1 },
    });

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get favorites count - good endpoint
router.get('/count', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('favorites');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ count: user.favorites?.length || 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
