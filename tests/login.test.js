const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

describe('Login', () => {
  it('debe devolver 200 y token con celular válido', async () => {

    await request(app)
      .post('/login')
      .send({ celular: '3001234567' });

    // Validación OTP
    const res = await request(app)
      .post('/otp')
      .send({ celular: '3001234567', otp: '123456' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('debe fallar con celular inválido', async () => {
    const res = await request(app)
      .post('/login')
      .send({ celular: 'abc' });

    expect(res.statusCode).toBe(400);
  });
});
