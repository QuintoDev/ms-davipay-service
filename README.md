# ms-davipay-service

Servicio backend para simulación de transferencias entre usuarios, validado mediante OTP simulado y JWT, con persistencia en PostgreSQL y métricas para Prometheus.

## Características

- Autenticación por JWT
- Simulación de OTP
- Consultas de saldo y transferencias
- Registro de transferencias exitosas y fallidas
- Logs estructurados y pruebas automatizadas
- Expuesto con Docker y documentado con Swagger

---

## Instalación local

1. **Clonar el repositorio:**

```bash
git clone https://github.com/usuario/ms-davipay-service.git
cd ms-davipay-service
```

2. **Instalar dependencias:**

```bash
npm install
```

3. **Crear archivo ****\`\`****:**

```env
PORT=3000
JWT_SECRET=supersecreto
JWT_EXPIRES_IN=1h
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=davipay
```

4. **Ejecutar localmente:**

```bash
npm start
```

5. **Correr pruebas:**

```bash
npm test
```

---

## Endpoints principales

| Método | Ruta              | Autenticación | Descripción                                    |
| ------ | ----------------- | ------------- | ---------------------------------------------- |
| POST   | `/login`          | No            | Registra o inicia sesión con número de celular |
| POST   | `/otp`            | No            | Simula OTP. OTP siempre es `123456`            |
| GET    | `/saldo`          | Sí (JWT)      | Consulta saldo disponible                      |
| POST   | `/transferir`     | Sí (JWT)      | Realiza transferencia a otro usuario           |
| GET    | `/transferencias` | Sí (JWT)      | Historial paginado de transferencias           |
| GET    | `/health`         | No            | Healthcheck simple                             |
| GET    | `/metrics`        | No            | Métricas para Prometheus                       |

---

## Ejemplos de peticiones

### Login

```json
POST /login
{
  "celular": "3001234567"
}
```

### Validación OTP

```json
POST /otp
{
  "celular": "3001234567",
  "otp": "123456"
}
```

### Transferencia

```json
POST /transferir
Authorization: Bearer <token>
{
  "celular_destino": "3007654321",
  "monto": 15500
}
```

---

## Docker

### Construcción de la imagen

```bash
docker build -t davipay-backend .
```

### Ejecución

```bash
docker run -p 3000:3000 --env-file .env davipay-backend
```

---

## Swagger

Disponible en: `http://localhost:3000/api-docs`

---

## Tecnologías utilizadas

- Node.js + Express
- PostgreSQL + Sequelize
- JWT
- Prometheus + express-prom-bundle
- Docker
- Jest + Supertest
- Swagger/OpenAPI

---

## Autor

Hernán Quintero

---

## Notas adicionales

- El sistema no valida OTP reales. El código es fijo `123456`.
- Todos los usuarios se crean automáticamente al hacer `/login`.
- Los errores están documentados en los responses y se loguean adecuadamente.
- El sistema responde con `401` ante tokens válidos pero vencidos o mal formados.

---

## TODO (si aplica)

- Implementar CI/CD real en GitHub Actions
- Despliegue en ECS/EKS o similar

