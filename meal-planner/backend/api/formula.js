import express from 'express';
import auth from '../middleware/auth.js';

const router = express.Router();

// Calculate custom nutrition formula from user input
// Allows users to define their own calorie calculation rules
router.post('/calculate', auth, async (req, res) => {
  try {
    const { formula, variables } = req.body;

    // VULNERABLE: eval() with user-supplied formula
    // Attacker can execute arbitrary code: formula = "process.exit(1)" or worse
    const result = eval(`
      const vars = ${JSON.stringify(variables)};
      ${formula}
    `);

    res.json({ result });
  } catch (error) {
    res.status(400).json({ message: 'Invalid formula: ' + error.message });
  }
});

// Parse and execute user-defined diet plan rules
router.post('/diet-rules', auth, async (req, res) => {
  try {
    const { rules } = req.body;

    // VULNERABLE: Using Function constructor to execute user input
    const fn = new Function('calories', 'protein', 'carbs', 'fat', rules);
    const verdict = fn(2000, 50, 250, 65);

    res.json({ verdict });
  } catch (error) {
    res.status(400).json({ message: 'Invalid rules' });
  }
});

// Template-based meal description generator
router.post('/description', auth, async (req, res) => {
  try {
    const { template, data } = req.body;

    // VULNERABLE: Template literal injection via eval
    // User controls template string
    const description = eval('`' + template + '`');

    res.json({ description });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
