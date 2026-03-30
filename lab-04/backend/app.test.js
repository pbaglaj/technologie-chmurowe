const request = require('supertest');
const app = require('./index');

describe('Endpoint API Tests', () => {
    it('GET /health powinien zwrócić status 200 oraz "ok"', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('uptime');
    });

    it('GET /stats powinien zwrócić poprawne statystyki startowe', async () => {
        const res = await request(app).get('/stats');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('count', 0);
        expect(res.body).toHaveProperty('instanceId');
        expect(res.body).toHaveProperty('totalRequests');
    });
});