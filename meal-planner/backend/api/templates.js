import express from 'express';
import MealPlanTemplate from '../models/MealPlanTemplate.js';
import MealPlan from '../models/MealPlan.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const templates = await MealPlanTemplate.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, days, isPublic } = req.body;
    const template = new MealPlanTemplate({
      name,
      description,
      user: req.user._id,
      days: days || [],
      isPublic: isPublic !== undefined ? isPublic : false,
    });
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/from-week', auth, async (req, res) => {
  try {
    const { weekStart, name, description } = req.body;
    const weekDate = new Date(weekStart);
    const weekEnd = new Date(weekDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const plan = await MealPlan.findOne({
      user: req.user._id,
      weekStart: { $gte: weekDate, $lt: weekEnd },
    });

    if (!plan) {
      return res.status(404).json({ message: 'No meal plan found for that week' });
    }

    const days = plan.days.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      meals: {
        breakfast: d.meals.breakfast || null,
        lunch: d.meals.lunch || null,
        dinner: d.meals.dinner || null,
        snacks: d.meals.snacks || [],
      },
    }));

    const template = new MealPlanTemplate({
      name,
      description,
      user: req.user._id,
      days,
    });
    await template.save();
    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const template = await MealPlanTemplate.findById(req.params.id)
      .populate('days.meals.breakfast', 'title')
      .populate('days.meals.lunch', 'title')
      .populate('days.meals.dinner', 'title')
      .populate('days.meals.snacks', 'title');
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const template = await MealPlanTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    if (template.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await template.deleteOne();
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/apply', auth, async (req, res) => {
  try {
    const { weekStart } = req.body;
    const template = await MealPlanTemplate.findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    const weekDate = new Date(weekStart);
    const weekEnd = new Date(weekDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const days = template.days.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      meals: {
        breakfast: d.meals.breakfast || null,
        lunch: d.meals.lunch || null,
        dinner: d.meals.dinner || null,
        snacks: d.meals.snacks || [],
      },
    }));

    const plan = await MealPlan.findOneAndUpdate(
      { user: req.user._id, weekStart: { $gte: weekDate, $lt: weekEnd } },
      { user: req.user._id, weekStart: weekDate, days },
      { upsert: true, new: true }
    );

    await plan.populate([
      { path: 'days.meals.breakfast', select: 'title imageUrl cuisine averageRating nutrition prepTime cookTime' },
      { path: 'days.meals.lunch', select: 'title imageUrl cuisine averageRating nutrition prepTime cookTime' },
      { path: 'days.meals.dinner', select: 'title imageUrl cuisine averageRating nutrition prepTime cookTime' },
      { path: 'days.meals.snacks', select: 'title imageUrl cuisine averageRating nutrition prepTime cookTime' },
    ]);

    res.json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
