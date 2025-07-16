const request = require('supertest');
const app = require('../src/app');

describe('Prometheus Metrics', () => {
  it('debe responder 200 y devolver métricas', async () => {
    const res = await request(app).get('/metrics');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    expect(res.text).toContain('http_requests_total');
  });
});