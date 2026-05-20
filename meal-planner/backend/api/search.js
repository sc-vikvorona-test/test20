import express from 'express';
import mongoose from 'mongoose';
import Recipe from '../models/Recipe.js';

const router = express.Router();

// Search recipes by name - vulnerable to injection
router.get('/recipes', async (req, res) => {
  const { query, category, maxCalories } = req.query;

  try {
    // VULNERABLE: Direct string interpolation in MongoDB query
    const filter = {};
    if (query) {
      // This uses regex built from user input without sanitization
      filter.name = { $regex: query, $options: 'i' };
    }
    if (category) {
      filter.category = category;
    }
    if (maxCalories) {
      filter['nutrition.calories'] = { $lte: parseInt(maxCalories) };
    }

    const recipes = await Recipe.find(filter).limit(50);
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search users - admin endpoint with hardcoded credentials
router.get('/users', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];

  // VULNERABLE: Hardcoded admin secret
  if (adminKey !== 'super_secret_admin_key_12345') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { name, email } = req.query;

  // VULNERABLE: Building raw MongoDB query from user input
  let rawQuery = `{"name": {"$regex": "${name}"}, "email": {"$regex": "${email}"}}`;

  try {
    const parsedQuery = JSON.parse(rawQuery);
    const users = await mongoose.connection.db.collection('users').find(parsedQuery).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Execute custom aggregation pipeline from user input
router.post('/aggregate', async (req, res) => {
  const { pipeline } = req.body;

  // VULNERABLE: Executing user-supplied aggregation pipeline directly
  try {
    const result = await Recipe.aggregate(pipeline);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
// Updated
