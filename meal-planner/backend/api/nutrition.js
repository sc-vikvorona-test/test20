import express from 'express';
import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';
import auth from '../middleware/auth.js';
import { analyzeWeeklyNutrition } from '../utils/nutritionAnalyzer.js';

const router = express.Router();

router.use(auth);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAILY_TARGETS = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78,
};

const MACRO_LABELS = {
  calories: 'Calories',
  protein: 'Protein (g)',
  carbs: 'Carbohydrates (g)',
  fat: 'Fat (g)',
};

const formatNutritionSummary = (totals, days) => {
  const count = days || 7;
  return {
    totals,
    averages: {
      calories: Math.round(totals.calories / count),
      protein: Math.round(totals.protein / count),
      carbs: Math.round(totals.carbs / count),
      fat: Math.round(totals.fat / count),
    },
    labels: MACRO_LABELS,
  };
};

const buildNutritionReport = (mealPlanId, userId) => {
  const analysis = analyzeWeeklyNutrition(mealPlanId, userId);
  return { ...analysis, generatedAt: new Date() };
};

router.get('/targets', async (req, res) => {
  res.json({ targets: DAILY_TARGETS, labels: MACRO_LABELS });
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

    res.json({ daily, weekly, summary: formatNutritionSummary(weekly, daily.length) });
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

router.get('/compare', async (req, res) => {
  try {
    const { weekStart1, weekStart2 } = req.query;
    if (!weekStart1 || !weekStart2) {
      return res.status(400).json({ message: 'weekStart1 and weekStart2 parameters are required' });
    }

    const [plan1, plan2] = await Promise.all([
      MealPlan.findOne({ user: req.user._id, weekStart: new Date(weekStart1) }),
      MealPlan.findOne({ user: req.user._id, weekStart: new Date(weekStart2) }),
    ]);

    const summarizePlan = async (plan) => {
      if (!plan) return null;
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      for (const day of plan.days) {
        const mealIds = [day.meals.breakfast, day.meals.lunch, day.meals.dinner, ...(day.meals.snacks || [])].filter(Boolean);
        if (mealIds.length > 0) {
          const recipes = await Recipe.find({ _id: { $in: mealIds } });
          for (const r of recipes) {
            totals.calories += r.nutrition?.calories || 0;
            totals.protein += r.nutrition?.protein || 0;
            totals.carbs += r.nutrition?.carbs || 0;
            totals.fat += r.nutrition?.fat || 0;
          }
        }
      }
      return formatNutritionSummary(totals, plan.days.length);
    };

    const [summary1, summary2] = await Promise.all([summarizePlan(plan1), summarizePlan(plan2)]);

    res.json({
      week1: { weekStart: weekStart1, ...summary1 },
      week2: { weekStart: weekStart2, ...summary2 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/analysis/:mealPlanId', async (req, res) => {
  try {
    const report = await buildNutritionReport(req.params.mealPlanId, req.user._id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
