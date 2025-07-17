const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');

let token;

beforeAll(async () => {
  // Login y OTP para obtener token válido
  await request(app).post('/login').send({ celular: '3001234567' });
  const res = await request(app)
    .post('/otp')
    .send({ celular: '3001234567', otp: '123456' });

  expect(res.statusCode).toBe(200);
  expect(res.body.data).toBeDefined();
  expect(res.body.data.token).toBeDefined();

  token = res.body.data.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Saldo', () => {
  it('debe retornar el saldo correctamente', async () => {
    const res = await request(app)
      .get('/saldo')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.saldo).toBeDefined();
    expect(typeof res.body.data.saldo).toBe('number');
  });

  it('debe fallar si no se envía token', async () => {
    const res = await request(app).get('/saldo');
    expect(res.statusCode).toBe(401);
  });
});
