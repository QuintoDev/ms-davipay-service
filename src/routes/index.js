/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Health check endpoint
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Usuario
 *     description: Operaciones de usuario
 *   - name: Transferencias
 *     description: Operaciones de transferencias
 *   - name: Métricas
 *     description: Endpoint de métricas
 */
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
const { Op } = require('sequelize');

Transferencia.belongsTo(User, { as: 'origen', foreignKey: 'origenId' });
Transferencia.belongsTo(User, { as: 'destino', foreignKey: 'destinoId' });

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: The service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                 message:
 *                   type: string
 *                   example: The service is healthy
 */
router.get('/health', (req, res) => {
  logger.info({
    action: 'health_check',
    resource: 'health',
    status: 'success'
  });

  return response.success(res, { status: 'ok' }, 'The service is healthy');
});

/**
 * @swagger
 *  /login:
 *   post:
 *     summary: Login de usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               celular:
 *                 type: string
 *                 example: "3001234567"
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 */
router.use('/login', authRoutes);

/**
 * @swagger
  * /otp:
 *   post:
 *     summary: Validar OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               celular:
 *                 type: string
 *                 example: "3001234567"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 message:
 *                   type: string
 *                   example: Autenticación exitosa
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *                     message:
 *                       type: string
 *                       example: Datos inválidos
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           message:
 *                             type: string
 *                             example: '"celular" with value "*******5612" fails to match the required pattern: /^\\d{10}$/'
 *                           path:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["celular"]
 *                           type:
 *                             type: string
 *                             example: string.pattern.base
 *                           context:
 *                             type: object
 *                             additionalProperties: true
 *       401:
 *         description: OTP incorrecto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: INVALID_OTP
 *                     message:
 *                       type: string
 *                       example: OTP incorrecto
 *                     details:
 *                       type: object
 *                       example: {}
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: USER_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: Usuario no encontrado
 *                     details:
 *                       type: object
 *                       example: {}
 */
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

/**
 * @swagger
 * /saldo:
 *   get:
 *     summary: Consultar saldo
 *     tags: [Usuario]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saldo consultado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     saldo:
 *                       type: number
 *                       example: 100000
 *                 message:
 *                   type: string
 *                   example: Saldo consultado correctamente
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: INVALID_TOKEN
 *                     message:
 *                       type: string
 *                       example: Token inválido o expirado
 *                     details:
 *                       type: object
 */
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

/**
 * @swagger
 * /transferir:
 *   post:
 *     summary: Realizar transferencia
 *     tags: [Transferencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               celular_destino:
 *                 type: string
 *                 example: "3007654321"
 *               monto:
 *                 type: number
 *                 example: 10000
 *     responses:
 *       200:
 *         description: Transferencia realizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     saldo:
 *                       type: number
 *                       example: 94300
 *                 message:
 *                   type: string
 *                   example: Transferencia realizada exitosamente
 *       400:
 *         description: Error de validación o lógica de negocio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *                     message:
 *                       type: string
 *                       example: Datos inválidos
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *             examples:
 *               Validación:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: VALIDATION_ERROR
 *                     message: Datos inválidos
 *                     details:
 *                       - message: '"monto" must be a positive number'
 *               Saldo insuficiente:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: SALDO_INSUFICIENTE
 *                     message: No tienes saldo suficiente
 *               Transferencia a sí mismo:
 *                 value:
 *                   success: false
 *                   error:
 *                     code: SELF_TRANSFER_NOT_ALLOWED
 *                     message: No puedes transferirte dinero a ti mismo
 *       404:
 *         description: Usuario destino no existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: DESTINO_NO_EXISTE
 *                     message:
 *                       type: string
 *                       example: El número destino no existe
 *                     details:
 *                       type: object
 *                       example: {}
 *       401:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: INVALID_TOKEN
 *                     message:
 *                       type: string
 *                       example: Token inválido o expirado
 *                     details:
 *                       type: object
 */
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

/**
 * @swagger
 * /transferencias:
 *   get:
 *     summary: Consultar historial de transferencias
 *     tags: [Transferencias]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Historial de transferencias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 transferencias:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       fecha:
 *                         type: string
 *                         format: date-time
 *                       valor:
 *                         type: number
 *                       origen:
 *                         type: string
 *                       destino:
 *                         type: string
 *                       estado:
 *                         type: string
 *                       motivoFalla:
 *                         type: string
 *                       tipo:
 *                         type: string
 *                         enum: [ENVIADA, RECIBIDA]
 */
router.get('/transferencias', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const transferencias = await Transferencia.findAndCountAll({
      where: {
        [Op.or]: [
          { origenId: req.user.id },
          { destinoId: req.user.id }
        ]
      },
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

    const result = transferencias.rows.map(t => {
      const tipo = t.origenId === req.user.id ? 'ENVIADA' : 'RECIBIDA';

      return {
        id: t.id,
        fecha: t.createdAt,
        valor: Number(t.monto),
        origen: t.origen?.celular || null,
        destino: t.destino?.celular || null,
        estado: t.estado,
        motivoFalla: t.motivoFalla || null,
        tipo
      };
    });

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

/**
 * @swagger
 *  /metrics:
 *   get:
 *     summary: Obtener métricas del servicio
 *     tags: [Métricas]
 *     responses:
 *       200:
 *         description: Métricas en formato Prometheus
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
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
