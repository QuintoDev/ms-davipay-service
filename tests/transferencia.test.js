const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');
const { delay } = require('../utils/testHelper');

let token;
const emisorCelular = '3000000001';
const receptorCelular = '3000000002';

async function crearUsuarioYObtenerToken(celular) {
  await request(app).post('/login').send({ celular });
  await delay(100);

  const otpRes = await request(app).post('/otp').send({ celular, otp: '123456' });
  await delay(100);

  if (otpRes.statusCode !== 200 || !otpRes.body?.data?.token) {
    console.error('No se pudo obtener el token para:', celular, otpRes.body);
  }

  return otpRes.body.data.token;
}

describe('Transferencia', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });

    token = await crearUsuarioYObtenerToken(emisorCelular);
    await crearUsuarioYObtenerToken(receptorCelular);
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
        celular_destino: '123',
        monto: -500
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
