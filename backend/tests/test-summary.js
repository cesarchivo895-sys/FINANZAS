const request = require('supertest');
const express = require('express');

jest.mock('../src/supabase', () => {
  function createQuery() {
    const query = {};
    ['select','insert','update','delete','eq','order','limit','gte','lte'].forEach(m => {
      query[m] = jest.fn().mockReturnValue(query);
    });
    query.then = function(resolve) {
      return Promise.resolve({ data: [{target_amount: 1000, current_amount: 500, status: 'active'}] }).then(resolve);
    };
    query.single = jest.fn().mockResolvedValue({ data: null, error: null });
    return query;
  }

  return {
    from: jest.fn().mockReturnValue(createQuery()),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test' } }),
    },
  };
});

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { id: 'test' }; next(); });
  app.use('/api/savings-goals', require('../src/routes/savings-goals'));
  return app;
}

describe('Summary', () => {
  it('should work', async () => {
    const app = createApp();
    const res = await request(app).get('/api/savings-goals/summary');
    console.log('Status:', res.status, 'Body:', res.body);
    expect(res.status).toBe(200);
  });
});
