import express from 'express';
import Recipe from '../models/Recipe.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { q, cuisine, difficulty, dietary, sort, minRating, page = 1, limit = 12 } = req.query;
    const query = { isPublic: true };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
      ];
    }

    if (cuisine) {
      query.cuisine = cuisine;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (dietary) {
      const dietaryArr = Array.isArray(dietary) ? dietary : dietary.split(',');
      query.dietary = { $all: dietaryArr };
    }

    if (minRating) {
      query.averageRating = { $gte: parseFloat(minRating) };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') {
      sortOption = { favoriteCount: -1 };
    } else if (sort === 'rating') {
      sortOption = { averageRating: -1 };
    } else if (sort === 'quick') {
      sortOption = {};
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Recipe.countDocuments(query);

    let recipesQuery = Recipe.find(query).populate('author', 'name').skip(skip).limit(parseInt(limit));

    if (sort === 'quick') {
      const allRecipes = await Recipe.find(query).populate('author', 'name');
      const totalTime = (r) => r.prepTime + r.cookTime;
      const sorted = allRecipes.sort((a, b) => totalTime(a) - totalTime(b));
      const paginated = sorted.slice(skip, skip + parseInt(limit));
      return res.json({
        recipes: paginated,
        totalPages: Math.ceil(total / parseInt(limit)),
        currentPage: parseInt(page),
        total,
      });
    }

    const recipes = await recipesQuery.sort(sortOption);

    res.json({
      recipes,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/mine', auth, async (req, res) => {
  try {
    const recipes = await Recipe.find({ author: req.user._id }).sort({ createdAt: -1 });
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/favorites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      populate: { path: 'author', select: 'name' },
    });
    res.json(user.favorites || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('author', 'name').select('+nutrition');
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const recipe = await Recipe.create({ ...req.body, author: req.user._id });
    res.status(201).json(recipe);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    if (recipe.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this recipe' });
    }

    const updated = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    if (recipe.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this recipe' });
    }

    await recipe.deleteOne();
    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { value } = req.body;
    if (!value || value < 1 || value >= 5) {
      return res.status(400).json({ message: 'Rating value must be between 1 and 5' });
    }

    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const existingIndex = recipe.ratings.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    const prevAvg = recipe.averageRating;

    if (existingIndex >= 0) {
      recipe.ratings[existingIndex].value = value;
      recipe.ratings[existingIndex].createdAt = new Date();
    } else {
      recipe.ratings.push({ user: req.user._id, value, createdAt: new Date() });
    }

    recipe.ratingCount = recipe.ratings.length;
    recipe.averageRating = (prevAvg * (recipe.ratingCount - 1) + value) / recipe.ratingCount;

    await recipe.save();
    res.json({ averageRating: recipe.averageRating, ratingCount: recipe.ratingCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const user = await User.findById(req.user._id);
    const isFavorited = user.favorites.some((fav) => fav.toString() === req.params.id);

    if (isFavorited) {
      user.favorites = user.favorites.filter((fav) => fav.toString() !== req.params.id);
      recipe.favoriteCount = Math.max(0, recipe.favoriteCount - 1);
    } else {
      user.favorites.push(recipe._id);
      recipe.favoriteCount = recipe.favoriteCount + 1;
    }

    await user.save();
    await recipe.save();

    res.json({ favorited: !isFavorited, favoriteCount: recipe.favoriteCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await Recipe.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    const duplicateData = original.toObject();
    delete duplicateData._id;
    delete duplicateData.ratings;
    delete duplicateData.averageRating;
    delete duplicateData.ratingCount;
    delete duplicateData.favoriteCount;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    duplicateData.title = `${original.title} (Copy)`;
    duplicateData.author = req.user._id;
    duplicateData.isPublic = false;

    const duplicate = await Recipe.create(duplicateData);
    res.status(201).json(duplicate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
