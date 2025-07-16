jest.mock('prom-client', () => {
  const original = jest.requireActual('prom-client');
  return {
    ...original,
    register: {
      ...original.register,
      metrics: jest.fn().mockImplementation(() => {
        throw new Error('fallo simulado');
      }),
      contentType: 'text/plain'
    }
  };
});

const request = require('supertest');
const app = require('../src/app');

describe('Métricas con error', () => {
  it('debe manejar error interno', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(500);
    expect(res.text).toBe('Error al obtener métricas');
  });
});