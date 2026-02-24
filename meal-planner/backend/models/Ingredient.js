import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    unique: true,
  },
  category: {
    type: String,
    enum: ['produce', 'dairy', 'meat', 'pantry', 'spices', 'frozen', 'beverages'],
    required: true,
  },
  defaultUnit: {
    type: String,
    required: true,
  },
  caloriesPer100g: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
});

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

export default Ingredient;