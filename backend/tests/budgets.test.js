const request = require('supertest');
const express = require('express');

// Mock Supabase
jest.mock('../src/supabase', () => {
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
    req.user = { id: 'test-user-id', name: 'Test User' };
    next();
  });
  app.use('/api/budgets', require('../src/routes/budgets'));
  return app;
}

describe('Budgets API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    delete require.cache[require.resolve('../src/routes/budgets')];
    app = createTestApp();
  });

  describe('GET /api/budgets', () => {
    it('should return 200 with array', async () => {
      const res = await request(app).get('/api/budgets');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by period', async () => {
      const res = await request(app).get('/api/budgets?period=monthly');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/budgets', () => {
    it('should return 400 if amount missing', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ period: 'monthly' });
      expect(res.status).toBe(400);
    });

    it('should create budget', async () => {
      const newBudget = {
        id: '1',
        amount: 1000,
        period: 'monthly',
        user_id: 'test-user-id',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      supabase.from().single.mockResolvedValue({ data: newBudget, error: null });

      const res = await request(app)
        .post('/api/budgets')
        .send({
          amount: 1000,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe(1000);
    });
  });

  describe('GET /api/budgets/status', () => {
    it('should return status array', async () => {
      const res = await request(app).get('/api/budgets/status');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
