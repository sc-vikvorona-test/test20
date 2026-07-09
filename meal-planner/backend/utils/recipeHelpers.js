/**
 * Utility functions for recipe operations
 * These are intentionally clean and well-written (testing for false positives)
 */

/**
 * Calculates the total nutritional value for a recipe scaled to given servings
 * @param {Object} recipe - Recipe object with nutrition property
 * @param {number} servings - Number of servings
 * @returns {Object} Scaled nutrition values
 */
export function scaleNutrition(recipe, servings) {
  if (!recipe || !recipe.nutrition) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  if (servings <= 0) {
    throw new Error('Servings must be a positive number');
  }

  const scale = servings / (recipe.servings || 1);

  return {
    calories: Math.round(recipe.nutrition.calories * scale),
    protein: Math.round(recipe.nutrition.protein * scale * 10) / 10,
    carbs: Math.round(recipe.nutrition.carbs * scale * 10) / 10,
    fat: Math.round(recipe.nutrition.fat * scale * 10) / 10,
  };
}

/**
 * Validates that all required recipe fields are present and valid
 * @param {Object} recipeData - Raw recipe data from request
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRecipeData(recipeData) {
  const errors = [];

  if (!recipeData.title || recipeData.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (recipeData.title && recipeData.title.length > 200) {
    errors.push('Title must be 200 characters or less');
  }

  if (!Array.isArray(recipeData.ingredients) || recipeData.ingredients.length === 0) {
    errors.push('At least one ingredient is required');
  }

  if (recipeData.ingredients) {
    recipeData.ingredients.forEach((ingredient, index) => {
      if (!ingredient.name || ingredient.name.trim().length === 0) {
        errors.push(`Ingredient ${index + 1}: name is required`);
      }
      if (typeof ingredient.amount !== 'number' || ingredient.amount <= 0) {
        errors.push(`Ingredient ${index + 1}: amount must be a positive number`);
      }
      if (!ingredient.unit || ingredient.unit.trim().length === 0) {
        errors.push(`Ingredient ${index + 1}: unit is required`);
      }
    });
  }

  if (recipeData.prepTime !== undefined && (typeof recipeData.prepTime !== 'number' || recipeData.prepTime < 0)) {
    errors.push('Prep time must be a non-negative number');
  }

  if (recipeData.cookTime !== undefined && (typeof recipeData.cookTime !== 'number' || recipeData.cookTime < 0)) {
    errors.push('Cook time must be a non-negative number');
  }

  if (recipeData.servings !== undefined && (typeof recipeData.servings !== 'number' || recipeData.servings <= 0)) {
    errors.push('Servings must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formats recipe for API response, removing sensitive/internal fields
 * @param {Object} recipe - Mongoose recipe document
 * @returns {Object} Sanitized recipe object
 */
export function formatRecipeResponse(recipe) {
  const obj = recipe.toObject ? recipe.toObject() : { ...recipe };

  // Remove internal fields
  delete obj.__v;

  return {
    id: obj._id,
    title: obj.title,
    description: obj.description || '',
    author: obj.author,
    ingredients: obj.ingredients,
    instructions: obj.instructions || [],
    prepTime: obj.prepTime || 0,
    cookTime: obj.cookTime || 0,
    servings: obj.servings || 1,
    cuisine: obj.cuisine,
    difficulty: obj.difficulty,
    dietary: obj.dietary || [],
    averageRating: obj.averageRating || 0,
    ratingCount: obj.ratingCount || 0,
    nutrition: obj.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    imageUrl: obj.imageUrl || null,
    isPublic: obj.isPublic,
    createdAt: obj.createdAt,
  };
}

/**
 * Calculates average rating from ratings array
 * @param {Array} ratings - Array of rating objects with 'value' property
 * @returns {number} Average rating rounded to 1 decimal place
 */
export function calculateAverageRating(ratings) {
  if (!ratings || ratings.length === 0) {
    return 0;
  }

  const sum = ratings.reduce((total, rating) => total + rating.value, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
