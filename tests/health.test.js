const request = require('supertest');
const app = require('../src/app');

describe('Health Check', () => {
    it('debe responder 200 con estado OK', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.data.status).toBe('ok');
    });
});
