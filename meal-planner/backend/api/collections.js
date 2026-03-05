import express from 'express';
import Collection from '../models/Collection.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/public', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const total = await Collection.countDocuments({ isPublic: true });
    const collections = await Collection.find({ isPublic: true })
      .populate('user', 'name')
      .populate('recipes', 'title imageUrl averageRating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ collections, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.user._id })
      .populate('recipes', 'title imageUrl averageRating')
      .sort({ createdAt: -1 });
    res.json(collections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const collection = new Collection({
      name,
      description,
      isPublic: isPublic !== undefined ? isPublic : true,
      user: req.user._id,
    });
    await collection.save();
    res.status(201).json(collection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('recipes', 'title imageUrl cuisine averageRating nutrition.calories prepTime cookTime');
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    res.json(collection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description, isPublic } = req.body;
    if (name !== undefined) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (isPublic !== undefined) collection.isPublic = isPublic;

    await collection.save();
    res.json(collection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await collection.deleteOne();
    res.json({ message: 'Collection deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/recipes', auth, async (req, res) => {
  try {
    const { recipeId } = req.body;
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (collection.recipes.map((r) => r.toString()).includes(recipeId)) {
      return res.status(400).json({ message: 'Recipe already in collection' });
    }

    collection.recipes.push(recipeId);
    await collection.save();
    res.json(collection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id/recipes/:recipeId', auth, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) return res.status(404).json({ message: 'Collection not found' });
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    collection.recipes = collection.recipes.filter(
      (r) => r.toString() !== req.params.recipeId
    );
    await collection.save();
    res.json(collection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
