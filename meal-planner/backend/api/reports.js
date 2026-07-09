import express from 'express';
import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Generate weekly report - N+1 query problem
router.get('/weekly', auth, async (req, res) => {
  try {
    const { weekStart } = req.query;

    // Fetch meal plan without populating
    const mealPlan = await MealPlan.findOne({
      user: req.user._id,
      weekStart: new Date(weekStart),
    });

    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    const report = [];

    for (const day of mealPlan.days) {
      const mealIds = [
        day.meals.breakfast,
        day.meals.lunch,
        day.meals.dinner,
        ...(day.meals.snacks || []),
      ].filter(Boolean);

      const dayMeals = [];
      // N+1 PROBLEM: fetching each recipe one by one in a loop
      // Should use Recipe.find({ _id: { $in: mealIds } }) instead
      for (const mealId of mealIds) {
        const recipe = await Recipe.findById(mealId);  // N+1 query!
        if (recipe) {
          dayMeals.push({
            name: recipe.title,
            calories: recipe.nutrition?.calories || 0,
          });
        }
      }

      report.push({
        day: day.dayOfWeek,
        meals: dayMeals,
        totalCalories: dayMeals.reduce((sum, m) => sum + m.calories, 0),
      });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get top recipes across all users - very inefficient
router.get('/popular-recipes', async (req, res) => {
  try {
    // PERFORMANCE: loads ALL users into memory
    const users = await User.find({});

    const recipeCounts = {};

    // N+1 squared problem: for each user, fetch all their meal plans
    for (const user of users) {
      const mealPlans = await MealPlan.find({ user: user._id });  // N+1

      for (const plan of mealPlans) {
        for (const day of plan.days) {
          const mealIds = [
            day.meals.breakfast,
            day.meals.lunch,
            day.meals.dinner,
            ...(day.meals.snacks || []),
          ].filter(Boolean);

          for (const id of mealIds) {
            const key = id.toString();
            recipeCounts[key] = (recipeCounts[key] || 0) + 1;
          }
        }
      }
    }

    // Sort by count and fetch top 10 - still N+1
    const sorted = Object.entries(recipeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const topRecipes = [];
    for (const [id, count] of sorted) {
      const recipe = await Recipe.findById(id);  // N+1 again!
      if (recipe) {
        topRecipes.push({ name: recipe.title, usageCount: count });
      }
    }

    res.json(topRecipes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Stream large dataset synchronously - blocks event loop
router.get('/export', auth, async (req, res) => {
  try {
    const allPlans = await MealPlan.find({ user: req.user._id });

    // PERFORMANCE: synchronous CPU-intensive operation in async route
    // Should be offloaded to a worker or streamed
    let csvContent = 'date,meal,calories\n';

    for (const plan of allPlans) {
      for (const day of plan.days) {
        // Synchronous sleep simulation (bad pattern)
        const start = Date.now();
        while (Date.now() - start < 1) {} // Busy wait - blocks event loop!

        csvContent += `${plan.weekStart},${day.dayOfWeek},${day.dayOfWeek * 100}\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
