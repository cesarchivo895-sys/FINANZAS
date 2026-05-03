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

  return {
    from: jest.fn().mockImplementation(() => createQuery()),
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
  app.use('/api/savings-goals', require('../src/routes/savings-goals'));
  return app;
}

describe('Savings Goals API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    delete require.cache[require.resolve('../src/routes/savings-goals')];
    app = createTestApp();
  });

  describe('GET /api/savings-goals', () => {
    it('should return 200 with array', async () => {
      const res = await request(app).get('/api/savings-goals');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const res = await request(app).get('/api/savings-goals?status=active');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/savings-goals', () => {
    it('should return 400 if name missing', async () => {
      const res = await request(app)
        .post('/api/savings-goals')
        .send({ target_amount: 1000 });
      expect(res.status).toBe(400);
    });

    it('should return 400 if target_amount missing', async () => {
      const res = await request(app)
        .post('/api/savings-goals')
        .send({ name: 'Test Goal' });
      expect(res.status).toBe(400);
    });

    it('should create savings goal', async () => {
      const newGoal = {
        id: '123',
        name: 'Vacation',
        target_amount: 1000,
        current_amount: 0,
        user_id: 'test-user-id',
      };

      const query = supabase.from();
      query.single.mockResolvedValue({ data: newGoal, error: null });

      const res = await request(app)
        .post('/api/savings-goals')
        .send({
          name: 'Vacation',
          target_amount: 1000,
        });

      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/savings-goals/summary', () => {
    it('should return 200', async () => {
      const res = await request(app).get('/api/savings-goals/summary');
      expect(res.status).toBe(200);
      expect(res.body.totalTarget).toBeDefined();
      expect(res.body.totalSaved).toBeDefined();
    });
  });
});
