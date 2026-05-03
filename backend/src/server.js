require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const expensesRouter = require('./routes/expenses');
const categoriesRouter = require('./routes/categories');
const budgetsRouter = require('./routes/budgets');
const savingsGoalsRouter = require('./routes/savings-goals');
const recommendationsRouter = require('./routes/recommendations');
const familiesRouter = require('./routes/families');
const exportRouter = require('./routes/export');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/expenses', authMiddleware, expensesRouter);
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/budgets', authMiddleware, budgetsRouter);
app.use('/api/savings-goals', authMiddleware, savingsGoalsRouter);
app.use('/api/recommendations', authMiddleware, recommendationsRouter);
app.use('/api/families', authMiddleware, familiesRouter);
app.use('/api/export', authMiddleware, exportRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Finanzas Familia API running on http://localhost:${PORT}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});
