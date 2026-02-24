import express from 'express';
import MealPlan from '../models/MealPlan.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

const getWeekStart = (dateString) => {
  const date = dateString ? new Date(dateString) : new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

router.get('/week', async (req, res) => {
  try {
    const weekStart = getWeekStart(req.query.date);
    const mealPlan = await MealPlan.findOne({
      user: req.user._id,
      weekStart,
    }).populate('days.meals.breakfast days.meals.lunch days.meals.dinner days.meals.snacks');

    if (!mealPlan) {
      return res.json({ weekStart, days: [] });
    }

    res.json(mealPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/week', async (req, res) => {
  try {
    const { weekStart, days } = req.body;

    const mealPlan = await MealPlan.findOneAndUpdate(
      { user: req.user._id, weekStart: new Date(weekStart) },
      { user: req.user._id, weekStart: new Date(weekStart), days },
      { upsert: true, new: true, runValidators: true }
    ).populate('days.meals.breakfast days.meals.lunch days.meals.dinner days.meals.snacks');

    res.json(mealPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/week/:id', async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({ _id: req.params.id, user: req.user._id });
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    await mealPlan.deleteOne();
    res.json({ message: 'Meal plan deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/week/:id/meal', async (req, res) => {
  try {
    const { dayOfWeek, mealType, recipeId } = req.body;
    const mealPlan = await MealPlan.findOne({ _id: req.params.id, user: req.user._id });

    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    let day = mealPlan.days.find((d) => d.dayOfWeek === dayOfWeek);

    if (!day) {
      mealPlan.days.push({ dayOfWeek, meals: { breakfast: null, lunch: null, dinner: null, snacks: [] } });
      day = mealPlan.days[mealPlan.days.length - 1];
    }

    if (mealType === 'snacks') {
      day.meals.snacks.push(recipeId);
    } else {
      day.meals[mealType] = recipeId;
    }

    await mealPlan.save();

    const updated = await MealPlan.findById(mealPlan._id).populate(
      'days.meals.breakfast days.meals.lunch days.meals.dinner days.meals.snacks'
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;