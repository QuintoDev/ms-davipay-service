const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'localhost',
  dialect: 'postgres',
  logging: (msg) => {
    if (!msg.includes('"celular"')) {
      logger.info(msg);
    }
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Connection to PostgreSQL established successfully.');
  } catch (error) {
    logger.error('Error connecting to the database:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB
};
