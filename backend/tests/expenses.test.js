const request = require('supertest');
const express = require('express');

// Mock Supabase
jest.mock('../src/supabase', () => {
  // Create mock chain inside the factory
  function createQuery() {
    const query = {};
    ['select','insert','update','delete','eq','order','limit','gte','lte','upsert'].forEach(m => {
      query[m] = jest.fn().mockReturnValue(query);
    });
    query.then = function(resolve) {
      return Promise.resolve({ data: [], error: null }).then(resolve);
    };
    query.single = jest.fn().mockResolvedValue({ data: null, error: null });
    return query;
  }

  const query = createQuery();

  return {
    from: jest.fn().mockReturnValue(query),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@test.com' } },
        error: null,
      }),
    },
  };
});

const supabase = require('../src/supabase');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = { id: 'test-user-id', name: 'Test User', email: 'test@test.com' };
    next();
  });
  const expensesRouter = require('../src/routes/expenses');
  app.use('/api/expenses', expensesRouter);
  return app;
}

describe('Expenses API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    delete require.cache[require.resolve('../src/routes/expenses')];
    app = createTestApp();
  });

  describe('GET /api/expenses', () => {
    it('should return 200 and array', async () => {
      const res = await request(app).get('/api/expenses');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/expenses', () => {
    it('should return 400 if amount missing', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .send({ description: 'Test', date: '2024-01-01' });
      expect(res.status).toBe(400);
    });

    it('should return 400 if date missing', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .send({ amount: 100, description: 'Test' });
      expect(res.status).toBe(400);
    });

    it('should create expense', async () => {
      const newExpense = {
        id: '123',
        amount: 100,
        description: 'Test expense',
        user_id: 'test-user-id',
        date: '2024-01-01',
        type: 'expense',
        categories: null,
      };

      supabase.from().single.mockResolvedValue({ data: newExpense, error: null });

      const res = await request(app)
        .post('/api/expenses')
        .send({ amount: 100, description: 'Test expense', date: '2024-01-01' });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(100);
    });
  });

  describe('GET /api/expenses/summary', () => {
    it('should return summary', async () => {
      const mockData = [
        { type: 'expense', amount: 100, categories: { name: 'Food', icon: '🍕', color: '#FF0' } },
        { type: 'income', amount: 500, categories: null },
      ];

      // Set up the chain to resolve with our data
      const query = supabase.from();
      query.then = jest.fn().mockImplementation((resolve) => {
        return Promise.resolve({ data: mockData, error: null }).then(resolve);
      });

      const res = await request(app).get('/api/expenses/summary');
      expect(res.status).toBe(200);
      expect(res.body.summary.total_expenses).toBe(100);
      expect(res.body.summary.total_income).toBe(500);
    });
  });
});
