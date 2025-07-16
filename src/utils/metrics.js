const client = require('prom-client');

client.collectDefaultMetrics();

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Número total de peticiones HTTP',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.5, 1, 2, 5]
});

module.exports = {
  client,
  httpRequestCounter,
  httpRequestDuration
};
