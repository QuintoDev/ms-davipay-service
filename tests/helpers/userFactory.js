// tests/helpers/userFactory.js
const request = require('supertest');
const app = require('../../src/app');

const generatePhone = () => '3' + Math.floor(100000000 + Math.random() * 900000000);

const crearUsuarioConToken = async () => {
  const celular = generatePhone();

  // 1. Crea el usuario con solo /login
  await request(app).post('/login').send({ celular });

  // 2. Autentica con OTP
  const res = await request(app)
    .post('/otp')
    .send({ celular, otp: '123456' });

  const token = res.body?.data?.token;

  if (!token) {
    throw new Error(`No se pudo obtener token para celular ${celular}`);
  }

  return { token, celular };
};

module.exports = { crearUsuarioConToken };
