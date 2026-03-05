import mongoose from 'mongoose';

const templateMealSlotSchema = new mongoose.Schema({
  breakfast: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  lunch: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  dinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  snacks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipe' }],
});

const templateDaySchema = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  meals: templateMealSlotSchema,
});

const mealPlanTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  days: [templateDaySchema],
  isPublic: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const MealPlanTemplate = mongoose.model('MealPlanTemplate', mealPlanTemplateSchema);

export default MealPlanTemplate;
