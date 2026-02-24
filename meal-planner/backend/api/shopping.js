import express from 'express';
import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

const INGREDIENT_CATEGORIES = {
  produce: ['vegetable', 'fruit', 'herb', 'onion', 'garlic', 'tomato', 'pepper', 'lettuce', 'spinach', 'carrot', 'broccoli', 'mushroom'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg'],
  meat: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'lamb'],
  spices: ['salt', 'pepper', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon', 'turmeric', 'coriander'],
  pantry: ['flour', 'sugar', 'oil', 'vinegar', 'sauce', 'paste', 'rice', 'pasta', 'bread', 'stock', 'broth', 'beans', 'lentil'],
  frozen: ['frozen'],
  beverages: ['juice', 'wine', 'beer', 'water', 'soda'],
};

const customItemsStore = new Map();

const categorizeIngredient = (name) => {
  const lowerName = name.toLowerCase();
  for (const [category, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (keywords.some((kw) => lowerName.includes(kw))) {
      return category;
    }
  }
  return 'pantry';
};

router.get('/generate', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({ message: 'weekStart parameter is required' });
    }

    const mealPlan = await MealPlan.findOne({
      user: req.user._id,
      weekStart: new Date(weekStart),
    });

    if (!mealPlan) {
      return res.json({ categories: {}, total: 0 });
    }

    const recipeIds = new Set();
    for (const day of mealPlan.days) {
      const { breakfast, lunch, dinner, snacks } = day.meals;
      if (breakfast) recipeIds.add(breakfast.toString());
      if (lunch) recipeIds.add(lunch.toString());
      if (dinner) recipeIds.add(dinner.toString());
      if (snacks) snacks.forEach((s) => recipeIds.add(s.toString()));
    }

    const recipes = await Recipe.find({ _id: { $in: Array.from(recipeIds) } });

    const aggregated = {};
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const key = ingredient.name.toLowerCase();
        if (aggregated[key]) {
          aggregated[key].amount += ingredient.amount;
        } else {
          aggregated[key] = {
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            category: categorizeIngredient(ingredient.name),
          };
        }
      }
    }

    const categorized = {};
    for (const item of Object.values(aggregated)) {
      if (!categorized[item.category]) {
        categorized[item.category] = [];
      }
      categorized[item.category].push({
        name: item.name,
        amount: item.amount,
        unit: item.unit,
      });
    }

    for (const category of Object.keys(categorized)) {
      categorized[category].sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json({
      categories: categorized,
      total: Object.values(aggregated).length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/custom', async (req, res) => {
  try {
    const { weekStart, items } = req.body;
    if (!weekStart || !items) {
      return res.status(400).json({ message: 'weekStart and items are required' });
    }

    const key = `${req.user._id}-${weekStart}`;
    const existing = customItemsStore.get(key) || [];
    const updated = [...existing, ...items];
    customItemsStore.set(key, updated);

    res.status(201).json({ items: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/custom', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({ message: 'weekStart parameter is required' });
    }

    const key = `${req.user._id}-${weekStart}`;
    const items = customItemsStore.get(key) || [];
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
