const { sequelize } = require('../src/config/database');

async function initDB() {
    try {
        console.log('Conectando a la base de datos...');
        await sequelize.authenticate();
        console.log('Conexión establecida.');

        console.log('Sincronizando modelos...');
        await sequelize.sync({ force: true });
        console.log('Tablas sincronizadas.');

        process.exit(0);
    } catch (error) {
        console.error('Error al sincronizar la base de datos:', error);
        process.exit(1);
    }
}

initDB();
