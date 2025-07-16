// tests/login.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/models');

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

describe('POST /login', () => {
  it('debería crear un usuario con celular válido', async () => {
    const res = await request(app)
      .post('/login')
      .send({ celular: '3001234567' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.celular).toBe('3001234567');
  });

  it('debería rechazar celular inválido', async () => {
    const res = await request(app)
      .post('/login')
      .send({ celular: 'abc123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
