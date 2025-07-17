# ms-davipay-service

![coverage](https://img.shields.io/badge/coverage-84%25-brightgreen)
![node](https://img.shields.io/badge/node-18.x-blue)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

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

3. **Crear archivo `.env`:**

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
npm run test:coverage
```

---

## Descripción de Endpoints, Payloads y Errores

| Método | Ruta              | Autenticación | Descripción                             | Payload Requerido                          | Errores posibles                                                                                           |
|--------|-------------------|----------------|-----------------------------------------|--------------------------------------------|------------------------------------------------------------------------------------------------------------|
| POST   | `/login`          | No          | Inicia sesión o registra al usuario     | `{ "celular": "3001234567" }`              | `400 VALIDATION_ERROR`                                                                                    |
| POST   | `/otp`            | No          | Valida OTP fijo (`123456`)              | `{ "celular": "3001234567", "otp": "123456" }` | `400 VALIDATION_ERROR`, `401 INVALID_OTP`, `404 USER_NOT_FOUND`                                       |
| GET    | `/saldo`          | Sí (JWT)    | Consulta el saldo del usuario           | Ninguno (requiere JWT en header)           | `401 INVALID_TOKEN`, `404 USER_NOT_FOUND`                                                                 |
| POST   | `/transferir`     | Sí (JWT)    | Transfiere saldo a otro usuario         | `{ "celular_destino": "3007654321", "monto": 10000 }` | `400 VALIDATION_ERROR`, `400 SALDO_INSUFICIENTE`, `400 SELF_TRANSFER_NOT_ALLOWED`, `404 DESTINO_NO_EXISTE`, `401 INVALID_TOKEN` |
| GET    | `/transferencias` | Sí (JWT)    | Retorna historial de transferencias     | Query opcional: `?page=1&limit=10`         | `401 INVALID_TOKEN`                                                                                       |
| GET    | `/health`         | No          | Verifica si el servicio está activo     | Ninguno                                     | Ninguno                                                                                                   |
| GET    | `/metrics`        | No          | Devuelve métricas en formato Prometheus | Ninguno                                     | `500 INTERNAL_ERROR` si falla la exportación                                                              |

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
docker build -t ms-davipay-service .
```

### Ejecución

```bash
docker run -p 3000:3000 --env-file .env ms-davipay-service
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

## Licencia

Este proyecto está bajo la licencia MIT.

