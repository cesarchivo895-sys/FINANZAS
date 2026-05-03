const request = require('supertest');
const express = require('express');

// Create a simple mock chain
function createChain(resolveData) {
  const chain = {};
  ['select','insert','update','delete','eq','order','limit','gte','lte'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve) => Promise.resolve(resolveData || { data: [], error: null });
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  return chain;
}

jest.mock('../src/supabase', () => ({
  from: jest.fn().mockImplementation(() => createChain()),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test' } }),
  },
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { id: 'test' }; next(); });
  app.use('/api/expenses', require('../src/routes/expenses'));
  return app;
}

describe('Simple', () => {
  it('GET /api/expenses returns 200', async () => {
    const app = createApp();
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(200);
  });
});
