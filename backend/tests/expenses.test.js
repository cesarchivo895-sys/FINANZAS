const request = require('supertest');
const express = require('express');
const { jest } = require('@jest/globals');

// Mock supabase
jest.mock('../src/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  upsert: jest.fn().mockReturnThis(),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@test.com' } },
      error: null,
    }),
  },
}));

const supabase = require('../src/supabase');

// Create express app for testing
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  app.use((req, res, next) => {
    req.user = { id: 'test-user-id', name: 'Test User', email: 'test@test.com' };
    next();
  });

  const authRouter = require('../src/routes/auth');
  const expensesRouter = require('../src/routes/expenses');

  app.use('/api/auth', authRouter);
  app.use('/api/expenses', expensesRouter);

  return app;
}

describe('Expenses API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /api/expenses', () => {
    it('should return expenses for authenticated user', async () => {
      const mockExpenses = [
        { id: '1', amount: 100, user_id: 'test-user-id', categories: null },
        { id: '2', amount: 200, user_id: 'test-user-id', categories: null },
      ];

      supabase.from().select().eq().order().limit().mockResolvedValue({
        data: mockExpenses,
        error: null,
      });

      const res = await request(app).get('/api/expenses');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by period', async () => {
      supabase.from().select().eq().order().limit().mockResolvedValue({
        data: [],
        error: null,
      });

      const res = await request(app).get('/api/expenses?period=monthly');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/expenses', () => {
    it('should create expense with valid data', async () => {
      const newExpense = {
        id: '123',
        amount: 100,
        description: 'Test expense',
        user_id: 'test-user-id',
        date: '2026-05-03',
        type: 'expense',
        categories: null,
      };

      supabase.from().insert().select().single.mockResolvedValue({
        data: newExpense,
        error: null,
      });

      const res = await request(app).post('/api/expenses').send({
        amount: 100,
        description: 'Test expense',
        date: '2026-05-03',
      });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(100);
    });

    it('should return 400 if amount or date missing', async () => {
      const res = await request(app).post('/api/expenses').send({
        description: 'Missing amount and date',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/expenses/summary', () => {
    it('should return summary data', async () => {
      const mockExpenses = [
        { type: 'expense', amount: 100, categories: { name: 'Food', icon: '🍕', color: '#FF0' } },
        { type: 'income', amount: 500, categories: null },
      ];

      supabase.from().select().mockResolvedValue({
        data: mockExpenses,
        error: null,
      });

      const res = await request(app).get('/api/expenses/summary');
      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.total_expenses).toBe(100);
      expect(res.body.summary.total_income).toBe(500);
    });
  });
});
