import mongoose from 'mongoose';

const mealSlotSchema = new mongoose.Schema({
  breakfast: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  lunch: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  dinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  snacks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
});

const daySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  meals: mealSlotSchema,
});

const mealPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  weekStart: {
    type: Date,
    required: true,
  },
  days: [daySchema],
});

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);

export default MealPlan;