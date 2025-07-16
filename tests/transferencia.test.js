const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');

let token, emisorCelular = '3000000001', receptorCelular = '3000000002';

describe('Transferencia', () => {
  beforeAll(async () => {
    // Crear usuarios automáticamente a través del login
    const res1 = await request(app).post('/login').send({ celular: emisorCelular });
    const res2 = await request(app).post('/login').send({ celular: receptorCelular });

    // Obtener token del emisor
    const otpRes = await request(app).post('/otp').send({ celular: emisorCelular, otp: '123456' });
    token = otpRes.body.data.token;
  });

  it('debe transferir correctamente', async () => {
    const res = await request(app)
      .post('/transferir')
      .set('Authorization', `Bearer ${token}`)
      .send({
        celular_destino: receptorCelular,
        monto: 15500
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.saldo).toBeDefined();
  });

  it('debe fallar por saldo insuficiente', async () => {
    const res = await request(app)
      .post('/transferir')
      .set('Authorization', `Bearer ${token}`)
      .send({
        celular_destino: receptorCelular,
        monto: 9999999
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('SALDO_INSUFICIENTE');
  });

  it('debe fallar si el destino no existe', async () => {
    const res = await request(app)
      .post('/transferir')
      .set('Authorization', `Bearer ${token}`)
      .send({
        celular_destino: '3009999999',
        monto: 1000
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe('DESTINO_NO_EXISTE');
  });

  it('debe fallar si el emisor se transfiere a sí mismo', async () => {
    const res = await request(app)
      .post('/transferir')
      .set('Authorization', `Bearer ${token}`)
      .send({
        celular_destino: emisorCelular,
        monto: 1000
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('SELF_TRANSFER_NOT_ALLOWED');
  });

  it('debe fallar con payload inválido', async () => {
    const res = await request(app)
      .post('/transferir')
      .set('Authorization', `Bearer ${token}`)
      .send({
        celular_destino: '123', // inválido
        monto: -500              // inválido
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('debe fallar si no se envía token', async () => {
    const res = await request(app)
      .post('/transferir')
      .send({
        celular_destino: receptorCelular,
        monto: 1000
      });

    expect(res.statusCode).toBe(401);
  });
});
