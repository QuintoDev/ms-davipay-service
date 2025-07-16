const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transferencia = sequelize.define('Transferencia', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  origenId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  destinoId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  monto: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('EXITOSA', 'FALLIDA'),
    defaultValue: 'EXITOSA'
  },
  motivoFalla: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'transferencias',
  timestamps: true
});

module.exports = Transferencia;
