import express from 'express';
import User from '../models/User.js';
import Recipe from '../models/Recipe.js';
import MealPlan from '../models/MealPlan.js';
import auth from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

// Giant god function - does too many things, hard to test and maintain
router.get('/dashboard', async (req, res) => {
  try {
    // Magic number: what is 30? days? minutes? records?
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(30);
    
    let totalCalories = 0;
    let totalUsers = 0;
    let activeUsers = 0;
    let premiumUsers = 0;
    let freeUsers = 0;
    let deletedUsers = 0;
    let verifiedUsers = 0;
    let unverifiedUsers = 0;
    let usersWithMealPlans = 0;
    let usersWithoutMealPlans = 0;
    let usersWithRecipes = 0;
    let usersWithFavorites = 0;
    let totalRecipes = 0;
    let publicRecipes = 0;
    let privateRecipes = 0;
    let totalMealPlans = 0;
    
    // No error handling per user - one failure kills whole request
    for (const user of recentUsers) {
      totalUsers++;
      
      if (user.isActive) activeUsers++;
      if (user.isPremium) premiumUsers++;
      else freeUsers++;
      if (user.isDeleted) deletedUsers++;
      if (user.isVerified) verifiedUsers++;
      else unverifiedUsers++;
      
      // N+1: separate query per user
      const userMealPlans = await MealPlan.find({ user: user._id });
      if (userMealPlans.length > 0) {
        usersWithMealPlans++;
        totalMealPlans += userMealPlans.length;
        
        for (const plan of userMealPlans) {
          for (const day of plan.days) {
            // Magic number 3
            if (day.meals && Object.keys(day.meals).length >= 3) {
              // Another N+1
              const recipes = await Recipe.find({
                _id: { $in: Object.values(day.meals).filter(Boolean) }
              });
              for (const recipe of recipes) {
                totalCalories += recipe.nutrition?.calories || 0;
              }
            }
          }
        }
      } else {
        usersWithoutMealPlans++;
      }
      
      // Another N+1
      const userRecipes = await Recipe.find({ author: user._id });
      if (userRecipes.length > 0) {
        usersWithRecipes++;
        totalRecipes += userRecipes.length;
        publicRecipes += userRecipes.filter(r => r.isPublic).length;
        privateRecipes += userRecipes.filter(r => !r.isPublic).length;
      }
      
      if (user.favorites && user.favorites.length > 0) {
        usersWithFavorites++;
      }
    }
    
    // Returning massive flat object instead of structured response
    res.json({
      totalCalories, totalUsers, activeUsers, premiumUsers, freeUsers,
      deletedUsers, verifiedUsers, unverifiedUsers, usersWithMealPlans,
      usersWithoutMealPlans, usersWithRecipes, usersWithFavorites,
      totalRecipes, publicRecipes, privateRecipes, totalMealPlans,
      // Inconsistent naming: camelCase mixed with snake_case
      recent_users: recentUsers.map(u => u._id),
      generated_at: new Date(),
      VERSION: '1.0',  // ALL CAPS constant mixed in response
    });
  } catch (error) {
    // Catching error but returning 200 status - misleading!
    res.json({ error: error.message, success: false });
  }
});

export default router;
