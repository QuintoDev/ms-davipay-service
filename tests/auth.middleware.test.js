const request = require('supertest');
const app = require('../src/app');
const { delay } = require('../utils/testHelper');

describe('Middleware de Autenticación', () => {
  it('debe fallar si no se envía token', async () => {
    const res = await request(app).get('/saldo');
    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toMatch(/Token no proporcionado/);
  });

  it('debe fallar si el token es inválido', async () => {
    const res = await request(app)
      .get('/saldo')
      .set('Authorization', 'Bearer token_falso');
    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toMatch(/Token inválido/);
  });

it('debe pasar si el token es válido', async () => {
  await request(app).post('/login').send({ celular: '3001234567' });

  const otpRes = await request(app).post('/otp').send({ celular: '3001234567', otp: '123456' });
  await delay(100);

  expect(otpRes.statusCode).toBe(200);
  expect(otpRes.body?.data?.token).toBeDefined();

  const token = otpRes.body.data.token;

  const saldoRes = await request(app)
    .get('/saldo')
    .set('Authorization', `Bearer ${token}`);

  expect(saldoRes.statusCode).toBe(200);
  expect(saldoRes.body.data.saldo).toBeDefined();
});

});