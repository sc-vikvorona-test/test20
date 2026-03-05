import express from 'express';
import Comment from '../models/Comment.js';
import Recipe from '../models/Recipe.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/recipe/:recipeId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Comment.countDocuments({ recipe: req.params.recipeId });
    const comments = await Comment.find({ recipe: req.params.recipeId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ comments, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/recipe/:recipeId', auth, async (req, res) => {
  try {
    const existing = await Comment.findOne({
      recipe: req.params.recipeId,
      user: req.user._id,
    });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this recipe' });
    }

    const { text, rating } = req.body;
    const comment = new Comment({
      recipe: req.params.recipeId,
      user: req.user._id,
      text,
      rating,
    });
    await comment.save();
    await comment.populate('user', 'name');
    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { text, rating } = req.body;
    if (text !== undefined) comment.text = text;
    if (rating !== undefined) comment.rating = rating;

    await comment.save();
    await comment.populate('user', 'name');
    res.json(comment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('recipe', 'author');
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isOwner = comment.user.toString() === req.user._id.toString();
    const isRecipeAuthor = comment.recipe?.author?.toString() === req.user._id.toString();

    if (!isOwner && !isRecipeAuthor) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
