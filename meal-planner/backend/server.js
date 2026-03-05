import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import authRoutes from './api/auth.js';
import recipeRoutes from './api/recipes.js';
import mealPlanRoutes from './api/mealplans.js';
import shoppingRoutes from './api/shopping.js';
import nutritionRoutes from './api/nutrition.js';
import collectionsRoutes from './api/collections.js';
import commentsRoutes from './api/comments.js';
import templateRoutes from './api/templates.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

connectDB();

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/mealplans', mealPlanRoutes);
app.use('/api/shopping', shoppingRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/templates', templateRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
