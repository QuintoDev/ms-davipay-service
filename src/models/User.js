const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transferencia = require('./Transferencia');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  celular: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      is: /^\d{10}$/
    }
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: true
  },
  saldo: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0.00,
    allowNull: false
  }
}, {
  tableName: 'usuarios',
  timestamps: true
});

User.hasMany(Transferencia, { foreignKey: 'origenId', as: 'transferenciasEnviadas' });
User.hasMany(Transferencia, { foreignKey: 'destinoId', as: 'transferenciasRecibidas' });

module.exports = User;
