const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const routes = require('./routes');
const { connectDB } = require('./config/database');
const { httpRequestCounter, httpRequestDuration } = require('./utils/metrics');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', routes);

// Models
const User = require('./models/User');
const Transferencia = require('./models/Transferencia');

// Database connection
connectDB();

// User model synchronization
(async () => {
  try {
    await User.sync({ alter: true });
    logger.info('User model synchronized');
  } catch (err) {
    logger.error('Error synchronizing the User model:', err);
  }
})();

// Transferencia model synchronization
(async () => {
  try {
    await Transferencia.sync({ alter: true });
    logger.info('Transferencia model synchronized');
  } catch (err) {
    logger.error('Error synchronizing the Transferencia model:', err);
  }
})();

// Metrics
app.use((req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const seconds = duration[0] + duration[1] / 1e9;

    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status: res.statusCode
    });

    httpRequestDuration.observe({
      method: req.method,
      route: req.path,
      status: res.statusCode
    }, seconds);
  });

  next();
});

// Swagger setup
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Davipay',
      version: '1.0.0',
      description: 'Documentación de la API del servicio de transferencias Davipay',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js'],
});


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

module.exports = app;