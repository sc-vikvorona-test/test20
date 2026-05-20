import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';

const NUTRIENT_WEIGHTS = {
  calories: 0.4,
  protein: 0.3,
  carbs: 0.2,
  fat: 0.1,
};

const DAILY_TARGETS = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 78,
};

const scoreNutrient = (actual, target) => {
  if (target === 0) return 100;
  const ratio = actual / target;
  if (ratio >= 0.9 && ratio <= 1.1) return 100;
  if (ratio >= 0.75 && ratio <= 1.25) return 80;
  if (ratio >= 0.6 && ratio <= 1.4) return 60;
  return Math.max(0, 100 - Math.abs(ratio - 1) * 100);
};

export const analyzeWeeklyNutrition = async (mealPlanId, userId) => {
  const mealPlan = await MealPlan.findOne({ _id: mealPlanId, user: userId });
  if (!mealPlan) {
    throw new Error('Meal plan not found');
  }

  const dayScores = [];
  const weeklyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  for (const day of mealPlan.days) {
    const mealIds = [
      day.meals.breakfast,
      day.meals.lunch,
      day.meals.dinner,
      ...(day.meals.snacks || []),
    ].filter(Boolean);

    const dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    if (mealIds.length > 0) {
      const recipes = await Recipe.find({ _id: { $in: mealIds } });
      for (const recipe of recipes) {
        dayTotals.calories += recipe.nutrition?.calories || 0;
        dayTotals.protein += recipe.nutrition?.protein || 0;
        dayTotals.carbs += recipe.nutrition?.carbs || 0;
        dayTotals.fat += recipe.nutrition?.fat || 0;
      }
    }

    const dayScore = Object.entries(NUTRIENT_WEIGHTS).reduce((score, [nutrient, weight]) => {
      return score + scoreNutrient(dayTotals[nutrient], DAILY_TARGETS[nutrient]) * weight;
    }, 0);

    dayScores.push({ dayOfWeek: day.dayOfWeek, score: Math.round(dayScore), totals: dayTotals });

    weeklyTotals.calories += dayTotals.calories;
    weeklyTotals.protein += dayTotals.protein;
    weeklyTotals.carbs += dayTotals.carbs;
    weeklyTotals.fat += dayTotals.fat;
  }

  const overallScore = Math.round(dayScores.reduce((sum, d) => sum + d.score, 0) / (dayScores.length || 1));

  const insights = [];
  if (weeklyTotals.protein / 7 < DAILY_TARGETS.protein * 0.8) {
    insights.push('Your weekly protein intake is below target. Consider adding more lean meats, legumes, or dairy.');
  }
  if (weeklyTotals.calories / 7 > DAILY_TARGETS.calories * 1.2) {
    insights.push('Your average daily calorie intake exceeds the target. Review portion sizes.');
  }
  if (weeklyTotals.fat / 7 > DAILY_TARGETS.fat * 1.3) {
    insights.push('Fat intake is elevated. Try substituting with lower-fat cooking methods.');
  }

  return {
    overallScore,
    dayScores,
    weeklyTotals,
    insights,
  };
};
