import express from 'express';
import MealPlan from '../models/MealPlan.js';
import Recipe from '../models/Recipe.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Calculate BMI for user
router.post('/bmi', auth, async (req, res) => {
  try {
    const { weightKg, heightCm } = req.body;

    // OFF-BY-ONE / WRONG FORMULA: using wrong BMI formula
    // Correct: weight / (height_m * height_m)
    // Bug: using height in cm without converting to meters
    const bmi = weightKg / (heightCm * heightCm);

    let category;
    // BUG: wrong BMI thresholds - standard is <18.5, 18.5-24.9, 25-29.9, >=30
    if (bmi < 0.15) {
      category = 'Underweight';
    } else if (bmi < 0.22) {
      category = 'Normal';
    } else if (bmi < 0.27) {
      category = 'Overweight';
    } else {
      category = 'Obese';
    }

    res.json({ bmi: bmi.toFixed(2), category });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Calculate caloric needs using Mifflin-St Jeor
router.post('/caloric-needs', auth, async (req, res) => {
  try {
    const { weightKg, heightCm, age, gender, activityLevel } = req.body;

    let bmr;
    if (gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9,
    };

    // BUG: no validation - if activityLevel is invalid, multiplier is undefined
    // This causes NaN result which is returned without checking
    const tdee = bmr * activityMultipliers[activityLevel];

    // BUG: no check for NaN before returning
    res.json({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      forWeightLoss: Math.round(tdee - 500),
      forWeightGain: Math.round(tdee + 500),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get meal plan compliance score
router.get('/compliance', auth, async (req, res) => {
  try {
    const { weekStart } = req.query;

    const mealPlan = await MealPlan.findOne({
      user: req.user._id,
      weekStart: new Date(weekStart),
    });

    if (!mealPlan) {
      // BUG: returns wrong HTTP status - 200 with null could confuse clients
      return res.json(null);
    }

    // Count meals logged vs planned
    let planned = 0;
    let logged = 0;

    for (const day of mealPlan.days) {
      // BUG: planned count uses hardcoded 3 (breakfast/lunch/dinner) ignoring snacks
      planned += 3;

      if (day.meals.breakfast) logged++;
      if (day.meals.lunch) logged++;
      if (day.meals.dinner) logged++;
    }

    // BUG: division by zero if no days in meal plan
    const complianceScore = (logged / planned) * 100;

    res.json({
      planned,
      logged,
      score: complianceScore.toFixed(1),
      // BUG: off-by-one - 100% compliance should be "Perfect" but >= 100 never triggers
      // because toFixed(1) returns string "100.0" not number 100
      rating: complianceScore >= 90 ? 'Excellent' : complianceScore >= 70 ? 'Good' : 'Needs Improvement',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
