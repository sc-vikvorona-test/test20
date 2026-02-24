import express from 'express';
import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAILY_TARGETS = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78,
};

router.get('/targets', async (req, res) => {
  res.json(DAILY_TARGETS);
});

router.get('/week', async (req, res) => {
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
      return res.json({ daily: [], weekly: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
    }

    const daily = [];
    const weekly = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const day of mealPlan.days) {
      const dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      const mealIds = [day.meals.breakfast, day.meals.lunch, day.meals.dinner, ...(day.meals.snacks || [])].filter(Boolean);

      if (mealIds.length > 0) {
        const recipes = await Recipe.find({ _id: { $in: mealIds } });
        for (const recipe of recipes) {
          dayTotals.calories += recipe.nutrition?.calories || 0;
          dayTotals.protein += recipe.nutrition?.protein || 0;
          dayTotals.carbs += recipe.nutrition?.carbs || 0;
          dayTotals.fat += recipe.nutrition?.fat || 0;
        }
      }

      const percentOfTarget = DAILY_TARGETS.calories > 0
        ? Math.round((dayTotals.calories / DAILY_TARGETS.calories) * 100)
        : 0;

      daily.push({
        dayOfWeek: day.dayOfWeek,
        dayName: DAY_NAMES[day.dayOfWeek],
        ...dayTotals,
        percentOfTarget,
      });

      weekly.calories += dayTotals.calories;
      weekly.protein += dayTotals.protein;
      weekly.carbs += dayTotals.carbs;
      weekly.fat += dayTotals.fat;
    }

    res.json({ daily, weekly });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/recipe/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).select('title nutrition servings');
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.json({ title: recipe.title, nutrition: recipe.nutrition, servings: recipe.servings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
