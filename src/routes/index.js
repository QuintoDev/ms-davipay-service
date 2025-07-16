const express = require('express');
const router = express.Router();
const response = require('../utils/response');
const logger = require('../utils/logger');
const authRoutes = require('./auth');
const Joi = require('joi');
const User = require('../models/User');
const auth = require('../middleware/auth');
const Transferencia = require('../models/Transferencia');
const { sequelize } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { client } = require('../utils/metrics');

Transferencia.belongsTo(User, { as: 'origen', foreignKey: 'origenId' });
Transferencia.belongsTo(User, { as: 'destino', foreignKey: 'destinoId' });


// Health
router.get('/health', (req, res) => {
  logger.info({
    action: 'health_check',
    resource: 'health',
    status: 'success'
  });

  return response.success(res, { status: 'ok' }, 'The service is healthy');
});

// Login route
router.use('/login', authRoutes);

// OTP route
router.post('/otp', async (req, res) => {
  const { celular, otp } = req.body;
  const celularMasked = celular.replace(/^(\d{6})/, '******');

  const schema = Joi.object({
    celular: Joi.string().pattern(/^\d{10}$/).required(),
    otp: Joi.string().length(6).required()
  });

  const { error } = schema.validate({ celular, otp });
  if (error) {
    logger.warn({
      action: 'otp_validation',
      status: 'failed',
      reason: 'invalid_payload',
      celular: celularMasked
    });
    return response.error(res, 'VALIDATION_ERROR', 'Datos inválidos', error.details, 400);
  }

  if (otp !== '123456') {
    logger.warn({
      action: 'otp_validation',
      status: 'failed',
      reason: 'invalid_otp',
      celular: celularMasked
    });
    return response.error(res, 'INVALID_OTP', 'OTP incorrecto', {}, 401);
  }

  try {
    const user = await User.findOne({ where: { celular } });
    if (!user) {
      logger.warn({
        action: 'otp_validation',
        status: 'failed',
        reason: 'user_not_found',
        celular: celularMasked
      });
      return response.error(res, 'USER_NOT_FOUND', 'Usuario no encontrado', {}, 404);
    }

    const token = generateToken({ id: user.id, celular: user.celular });

    logger.info({
      action: 'otp_validation',
      status: 'success',
      userId: user.id
    });

    return response.success(res, { token }, 'Autenticación exitosa');
  } catch (err) {
    logger.error({
      action: 'otp_validation',
      status: 'error',
      message: 'Unexpected error validating OTP',
      celular: celularMasked,
      error: err.message
    });
    return response.error(res, 'INTERNAL_ERROR', 'Error procesando OTP');
  }
});

// Saldo route
router.get('/saldo', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      logger.warn({
        userId: req.user.id,
        action: 'check_balance',
        status: 'failed',
        reason: 'user_not_found'
      });
      return response.error(res, 'USER_NOT_FOUND', 'Usuario no encontrado', {}, 404);
    }

    logger.info({
      userId: user.id,
      action: 'check_balance',
      status: 'success'
    });

    return response.success(res, { saldo: Number(user.saldo) }, 'Saldo consultado correctamente');
  } catch (err) {
    logger.error({
      userId: req.user?.id || null,
      action: 'check_balance',
      status: 'error',
      message: 'Unexpected error retrieving balance',
      error: err.message
    });
    return response.error(res, 'INTERNAL_ERROR', 'Error al consultar saldo');
  }
})

// Transferir route
router.post('/transferir', auth, async (req, res) => {
  const { celular_destino, monto } = req.body;

  const schema = Joi.object({
    celular_destino: Joi.string().pattern(/^\d{10}$/).required(),
    monto: Joi.number().positive().required()
  });

  const { error } = schema.validate({ celular_destino, monto });
  if (error) {
    logger.warn({
      userId: req.user.id,
      action: 'transfer_attempt',
      status: 'failed',
      reason: 'invalid_payload'
    });
    return response.error(res, 'VALIDATION_ERROR', 'Datos inválidos', error.details, 400);
  }

  try {
    const emisor = await User.findByPk(req.user.id);
    const receptor = await User.findOne({ where: { celular: celular_destino } });

    if (emisor.id === receptor.id) {
      await Transferencia.create({
        origenId: emisor.id,
        destinoId: receptor.id,
        monto,
        estado: 'FALLIDA',
        motivoFalla: 'TRANSFERENCIA_A_SI_MISMO'
      });

      logger.warn({
        userId: emisor.id,
        action: 'transfer_attempt',
        status: 'failed',
        reason: 'self_transfer'
      });

      return response.error(res, 'SELF_TRANSFER_NOT_ALLOWED', 'No puedes transferirte dinero a ti mismo', {}, 400);
    }

    if (!receptor) {
      await Transferencia.create({
        origenId: emisor.id,
        destinoId: null,
        monto,
        estado: 'FALLIDA',
        motivoFalla: 'DESTINO_NO_EXISTE'
      });

      logger.warn({
        userId: emisor.id,
        action: 'transfer_attempt',
        status: 'failed',
        reason: 'destination_not_found'
      });

      return response.error(res, 'DESTINO_NO_EXISTE', 'El número destino no existe', {}, 404);
    }

    if (Number(emisor.saldo) < Number(monto)) {
      await Transferencia.create({
        origenId: emisor.id,
        destinoId: receptor.id,
        monto,
        estado: 'FALLIDA',
        motivoFalla: 'SALDO_INSUFICIENTE'
      });

      logger.warn({
        userId: emisor.id,
        action: 'transfer_attempt',
        status: 'failed',
        reason: 'insufficient_funds'
      });

      return response.error(res, 'SALDO_INSUFICIENTE', 'No tienes saldo suficiente', {}, 400);
    }

    // Atomic transaction
    await sequelize.transaction(async (t) => {
      await emisor.update(
        { saldo: Number(emisor.saldo) - Number(monto) },
        { transaction: t }
      );

      await receptor.update(
        { saldo: Number(receptor.saldo) + Number(monto) },
        { transaction: t }
      );

      await Transferencia.create({
        origenId: emisor.id,
        destinoId: receptor.id,
        monto,
        estado: 'EXITOSA'
      }, { transaction: t });
    });

    logger.info({
      userId: emisor.id,
      action: 'transfer',
      status: 'success',
      destinationUserId: receptor.id
    });

    const nuevoSaldo = await User.findByPk(emisor.id);

    return response.success(
      res,
      { saldo: Number(nuevoSaldo.saldo) },
      'Transferencia realizada exitosamente'
    );
  } catch (err) {
    logger.error({
      userId: req.user?.id || null,
      action: 'transfer',
      status: 'error',
      message: 'Unexpected error during transfer',
      error: err.message
    });
    return response.error(res, 'INTERNAL_ERROR', 'Error al procesar la transferencia');
  }
});

// Transferencias route
router.get('/transferencias', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const transferencias = await Transferencia.findAndCountAll({
      where: { origenId: req.user.id },
      include: [
        { model: User, as: 'destino', attributes: ['celular'] },
        { model: User, as: 'origen', attributes: ['celular'] }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    logger.info({
      userId: req.user.id,
      action: 'view_transfer_history',
      status: 'success',
      page,
      limit
    });

    const result = transferencias.rows.map(t => ({
      id: t.id,
      fecha: t.createdAt,
      valor: Number(t.monto),
      origen: t.origen?.celular || null,
      destino: t.destino?.celular || null,
      estado: t.estado,
      motivoFalla: t.motivoFalla || null
    }));

    return response.success(res, {
      page,
      total: transferencias.count,
      transferencias: result
    }, 'Historial de transferencias');
  } catch (err) {
    logger.error({
      userId: req.user?.id || null,
      action: 'view_transfer_history',
      status: 'error',
      message: 'Failed to retrieve transfer history',
      error: err.message
    });
    return response.error(res, 'INTERNAL_ERROR', 'Error al consultar transferencias');
  }
});

// Metrics route
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await client.register.metrics();

    logger.info({
      action: 'expose_metrics',
      resource: 'metrics',
      status: 'success'
    });
    res.set('Content-Type', client.register.contentType);
    res.end(metrics);
  } catch (err) {
    logger.error({
      action: 'expose_metrics',
      resource: 'metrics',
      status: 'error',
      message: 'Failed to generate metrics',
      error: err.message
    });
    return res.status(500).send('Error al obtener métricas');
  }
});


module.exports = router;
