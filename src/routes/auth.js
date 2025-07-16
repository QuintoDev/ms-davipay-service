const express = require('express');
const router = express.Router();
const Joi = require('joi');
const User = require('../models/User');
const logger = require('../utils/logger');
const response = require('../utils/response');

const schema = Joi.object({
  celular: Joi.string().pattern(/^\d{10}$/).required()
});

router.post('/', async (req, res) => {
  const { celular } = req.body;
  const celularMasked = celular.replace(/^(\d{6})/, '******');

  const { error } = schema.validate({ celular });
  if (error) {
    logger.warn({
      action: 'login_attempt',
      resource: 'user',
      status: 'validation_failed',
      celular: celularMasked,
      message: 'Invalid phone number format'
    });
    return response.error(res, 'VALIDATION_ERROR', 'Número de celular inválido', { celularMasked }, 400);
  }

  try {
    let user = await User.findOne({ where: { celular } });

    if (!user) {
      user = await User.create({ celular, saldo: 100000 });
      logger.info({
        action: 'login',
        resource: 'user',
        status: 'created',
        celular: celularMasked
      });
    } else {
      logger.info({
        action: 'login',
        resource: 'user',
        status: 'existing_user',
        celular: celularMasked
      });
    }

    return response.success(res, { celular }, 'OTP enviado ****56');
  } catch (err) {
    logger.error({
      action: 'login',
      resource: 'user',
      status: 'error',
      message: 'Error during login',
      error: err.message
    });
    return response.error(res, 'INTERNAL_ERROR', 'Error al iniciar sesión');
  }
});

module.exports = router;
