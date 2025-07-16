const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');

describe('Historial de Transferencias', () => {
  let tokenEmisor;
  let tokenReceptor;

  // Espera activa para evitar fallos por latencia
  async function esperarTransferencias(token, tipoEsperado, intentos = 5) {
    while (intentos-- > 0) {
      const res = await request(app)
        .get('/transferencias')
        .set('Authorization', `Bearer ${token}`);

      if (
        res.statusCode === 200 &&
        res.body?.data?.transferencias?.some(t => t.tipo === tipoEsperado)
      ) {
        return res;
      }

      await new Promise(resolve => setTimeout(resolve, 200)); // Espera 200ms
    }

    throw new Error(`No se encontró la transferencia tipo "${tipoEsperado}"`);
  }

  beforeAll(async () => {
    // Crear usuarios con login (mock)
    await request(app).post('/login').send({ celular: '3000000003' });
    await request(app).post('/login').send({ celular: '3000000004' });

    // Obtener tokens
    const resEmisor = await request(app).post('/otp').send({ celular: '3000000003', otp: '123456' });
    tokenEmisor = resEmisor.body.data.token;

    const resReceptor = await request(app).post('/otp').send({ celular: '3000000004', otp: '123456' });
    tokenReceptor = resReceptor.body.data.token;

    // Transferir dinero
    await request(app)
      .post('/transferir')
      .set('Authorization', `Bearer ${tokenEmisor}`)
      .send({ celular_destino: '3000000004', monto: 15500 });
  });

  it('emisor debe ver la transferencia como enviada', async () => {
    const res = await esperarTransferencias(tokenEmisor, 'ENVIADA');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.transferencias.length).toBeGreaterThan(0);
    expect(res.body.data.transferencias[0].tipo).toBe('ENVIADA');
  });

  it('receptor debe ver la transferencia como recibida', async () => {
    const res = await esperarTransferencias(tokenReceptor, 'RECIBIDA');

    expect(res.statusCode).toBe(200);
    expect(res.body.data.transferencias.length).toBeGreaterThan(0);
    expect(res.body.data.transferencias[0].tipo).toBe('RECIBIDA');
  });

  afterAll(async () => {
    await sequelize.query('TRUNCATE TABLE usuarios, transferencias RESTART IDENTITY CASCADE');
    await sequelize.close();
  });
});
