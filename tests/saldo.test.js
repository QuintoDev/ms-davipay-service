const { crearUsuarioConToken } = require('./helpers/userFactory');

describe('Consulta de saldo', () => {
  let usuario;

  beforeAll(async () => {
    usuario = await crearUsuarioConToken();
  });

  it('debe retornar el saldo correctamente', async () => {
    const res = await request(app)
      .get('/saldo')
      .set('Authorization', `Bearer ${usuario.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.saldo).toBeDefined();
  });
});
