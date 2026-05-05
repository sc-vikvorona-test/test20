import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  unit: { type: String, required: true },
});

const ratingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  value: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

const recipeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ingredients: [ingredientSchema],
  instructions: [{ type: String }],
  prepTime: { type: Number, default: 0 },
  cookTime: { type: Number, default: 0 },
  servings: { type: Number, default: 1 },
  cuisine: {
    type: String,
    enum: [
      'Italian',
      'Mexican',
      'Asian',
      'American',
      'Mediterranean',
      'Indian',
      'French',
      'Thai',
      'Japanese',
      'Greek',
      'Middle Eastern',
      'Other',
    ],
    default: 'Other',
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  dietary: [{
    type: String,
    enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'keto', 'paleo'],
  }],
  ratings: [ratingSchema],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },
  favoriteCount: { type: Number, default: 0 },
  tags: [{ type: String }],
  nutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
  },
  imageUrl: { type: String },
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

recipeSchema.index({ title: 'text', description: 'text' });

const Recipe = mongoose.model('Recipe', recipeSchema);

export default Recipe;
