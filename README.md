# LabTech Minero — Backend

API REST + WebSocket que sirve como backend único para el **ecosistema LabTech Minero**:

- **PWA de clientes** (`labtech-cliente-movil`)
- **Dashboard Ejecutivo** (staff del laboratorio)

Node.js + Express + TypeScript + PostgreSQL (Prisma) + Socket.io, con arquitectura en capas (routes → controllers → services → Prisma) agrupada por módulo de dominio (DDD ligero).

---

## 1. Estructura de carpetas

```
labtech-backend/
├── prisma/
│   ├── schema.prisma          # Modelos: User, Sample, Payment, Result, Invoice, RefreshToken...
│   └── seed.ts                 # Datos demo: admin, operador, laboratorista, cliente + 1 muestra
├── src/
│   ├── config/
│   │   ├── env.ts               # Carga y valida variables de entorno con Zod
│   │   ├── database.ts           # Cliente Prisma singleton
│   │   ├── swagger.ts             # Configuración OpenAPI
│   │   └── socket.ts               # Socket.io: salas `dashboard` y `cliente:<id>`
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # Verifica JWT de acceso
│   │   ├── role.middleware.ts       # RBAC (CLIENTE / OPERADOR / LABORATORISTA / ADMIN)
│   │   ├── validate.middleware.ts    # Valida body/params/query con Zod
│   │   ├── error.middleware.ts        # Manejo centralizado de errores
│   │   └── rateLimit.middleware.ts     # Rate limiting global y de auth
│   ├── modules/
│   │   ├── auth/                # Registro, login, refresh rotation, logout, /me
│   │   ├── users/                # CRUD de usuarios (staff)
│   │   ├── samples/               # Alta de muestras + máquina de estados (8 pasos)
│   │   ├── payments/               # Culqi / Yape Business / Transferencia BCP + comprobantes
│   │   │   └── providers/           # culqi.provider.ts, yape.provider.ts, bcp.provider.ts
│   │   ├── results/                # Registro de resultados + PDF + entrega
│   │   ├── invoices/                # Generación de boletas electrónicas (PDF)
│   │   ├── reports/                  # Generación de informes de análisis (PDF)
│   │   └── uploads/                   # Storage abstraction (local / S3) + Multer
│   ├── routes/index.ts           # Agrupa todos los módulos bajo /api/v1
│   ├── shared/
│   │   ├── errors/AppError.ts     # Error de aplicación tipado
│   │   ├── utils/                  # jwt.ts, asyncHandler.ts, logger.ts
│   │   └── constants/estados.ts     # Flujo de estados y cálculo de precios
│   ├── app.ts                     # Configuración de Express (middlewares, Swagger, estáticos)
│   └── server.ts                   # Bootstrap: HTTP server + Socket.io + Prisma
├── uploads/                    # Comprobantes, boletas y reportes (modo storage local)
├── static/                     # QR de Yape y otros assets estáticos servidos por Express
├── docker-compose.yml           # PostgreSQL local en un comando
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 2. Modelos principales (Prisma)

| Modelo | Propósito |
|---|---|
| `User` | Clientes y staff (`role`: CLIENTE, OPERADOR, LABORATORISTA, ADMIN) |
| `RefreshToken` | Refresh tokens con **rotación** y detección de reuso (revoca la sesión completa si un token ya usado vuelve a presentarse) |
| `Sample` | Muestra mineral: código único, tipo/mineral, precio, estado |
| `SampleStatusHistory` | Auditoría de cada cambio de estado (quién, cuándo, nota) |
| `Payment` | Pago 1:1 con la muestra: método, estado, referencia del proveedor, comprobante |
| `Result` | Resultado del análisis 1:1 con la muestra: ley, método, laboratorista, PDF |
| `Invoice` | Boleta/factura 1:1 con la muestra: subtotal, IGV, total, PDF |

**Flujo de estados de una muestra** (8 pasos, validado por una máquina de estados que solo permite avanzar un paso a la vez):

```
PENDIENTE_PAGO → PAGADO → EN_COLA → EN_LABORATORIO → EN_ANALISIS → CONTROL_CALIDAD → TERMINADO → ENTREGADO
```

---

## 3. Instalación y ejecución

### Requisitos
- Node.js ≥ 20
- PostgreSQL ≥ 14 (o Docker)

### Pasos

```bash
cd labtech-backend
npm install

# 1) Levantar PostgreSQL local (o usa tu propia instancia)
docker compose up -d

# 2) Configurar variables de entorno
cp .env.example .env
# edita .env: como mínimo cambia JWT_ACCESS_SECRET y JWT_REFRESH_SECRET

# 3) Generar el cliente de Prisma y crear las tablas
npx prisma generate
npx prisma migrate dev --name init

# 4) (opcional) Sembrar datos demo
npm run prisma:seed

# 5) Levantar el servidor en modo desarrollo
npm run dev
```

El servidor queda disponible en `http://localhost:4000`:
- API: `http://localhost:4000/api/v1/...`
- Documentación Swagger: `http://localhost:4000/api-docs`
- Health check: `http://localhost:4000/api/v1/health`

> **Nota sobre este entorno de generación:** este proyecto fue construido y verificado por sintaxis/resolución de imports en un sandbox sin acceso a `binaries.prisma.sh` (el dominio desde donde Prisma descarga sus motores), por lo que `prisma generate` no pudo ejecutarse aquí. En tu máquina o CI, con acceso normal a internet, este paso funciona sin problema — es el flujo estándar de cualquier proyecto Prisma.

### Build para producción

```bash
npm run build      # compila src/ → dist/
npm run start       # node dist/server.js
```

### Cuentas demo (tras `npm run prisma:seed`)

| Rol | Email | Password |
|---|---|---|
| Admin | admin@labtechminero.pe | admin1234 |
| Operador (recepción) | operador@labtechminero.pe | operador1234 |
| Laboratorista | laboratorista@labtechminero.pe | laboratorista1234 |
| Cliente | demo@labtech.pe | demo1234 |

---

## 4. Rutas principales

Todas bajo el prefijo `/api/v1`. Documentación interactiva completa en `/api-docs`.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/register` | público | Crea cuenta de cliente |
| POST | `/auth/login` | público | Login, devuelve access + refresh token |
| POST | `/auth/refresh` | público | Rota el refresh token |
| POST | `/auth/logout` | público | Revoca un refresh token |
| GET | `/auth/me` | autenticado | Usuario actual |
| GET/PATCH/DELETE | `/users/:id` | staff | CRUD de usuarios |
| POST | `/samples` | cliente | Registra una muestra (calcula precio automáticamente) |
| GET | `/samples` | todos | Cliente ve las suyas; staff ve todas (Dashboard) |
| GET | `/samples/:id` | todos | Detalle + historial de estados |
| PATCH | `/samples/:id/status` | staff | Avanza el estado (valida transición) |
| POST | `/payments/:sampleId/initiate` | cliente | Inicia cobro (Culqi cobra al instante; Yape/BCP devuelven datos) |
| POST | `/payments/:sampleId/comprobante` | cliente | Sube captura del pago (multipart) |
| PATCH | `/payments/:id/validate` | staff | Aprueba/rechaza pago → genera boleta automáticamente |
| POST | `/results/:sampleId` | laboratorista | Registra resultado → genera PDF → avanza a TERMINADO |
| GET | `/results/:sampleId` | todos | Resultado + URL del PDF |
| PATCH | `/results/:sampleId/entregar` | staff | Cierra el ciclo (ENTREGADO) |

---

## 5. Sincronización en tiempo real (Socket.io)

El servidor abre un socket en el mismo puerto que la API. Se autentica igual que la API (JWT de acceso) y separa a los clientes en salas:

- `cliente:<userId>` — cada cliente de la PWA solo recibe eventos de **sus propias** muestras.
- `dashboard` — todo el staff (OPERADOR, LABORATORISTA, ADMIN) recibe **todos** los eventos, para alimentar el War Room del Dashboard Ejecutivo.

**Eventos emitidos:**

| Evento | Cuándo | Sala(s) |
|---|---|---|
| `sample:created` | Cliente registra una muestra | `dashboard` |
| `sample:status-updated` | Cualquier cambio de estado | `dashboard` + `cliente:<id>` |
| `payment:comprobante-uploaded` | Cliente sube comprobante | `dashboard` |
| `payment:approved` | Staff aprueba un pago (o Culqi cobra al instante) | `dashboard` + `cliente:<id>` |
| `payment:rejected` | Staff rechaza un pago | `dashboard` |
| `result:created` | Se registra un resultado | `dashboard` |
| `result:ready` | Resultado disponible para el cliente | `cliente:<id>` |

Ejemplo de conexión desde el frontend (idéntico para PWA y Dashboard, cambia solo qué eventos escuchas):

```js
import { io } from 'socket.io-client'; // o <script src=".../socket.io.js">

const socket = io('http://localhost:4000', {
  auth: { token: accessToken }, // el mismo access token JWT del login
});

socket.on('sample:status-updated', (sample) => {
  // refresca la fila/tarjeta de esa muestra en la UI sin recargar
});
```

---

## 6. Cómo conectar la PWA de clientes

La PWA actual (`labtech-cliente-movil`) usa `js/data.js` como capa de datos sobre `localStorage`. Para conectarla:

1. **Reemplaza `DataStore` por un cliente HTTP** (`js/api.js`) que llame a este backend:

```js
// js/api.js
const API_URL = 'http://localhost:4000/api/v1';
let accessToken = localStorage.getItem('accessToken');

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Error de red');
  return json.data ?? json;
}
```

2. **Mapeo de funciones** (mismo nombre, nueva implementación por fetch):
   - `Auth.login/register` → `POST /auth/login` / `POST /auth/register`, guarda `accessToken` + `refreshToken`.
   - `DataStore.createSample` → `POST /samples`.
   - `DataStore.getSamplesByUser` → `GET /samples` (el backend ya filtra por el usuario del token).
   - `DataStore.marcarPagado` → `POST /payments/:sampleId/initiate` + `POST /payments/:sampleId/comprobante` (multipart con el `<input type="file">` que ya existe en el sheet de pago).
3. **Conecta el socket** al hacer login, para que `sample:status-updated` y `result:ready` actualicen la UI sin polling.
4. **Refresh automático**: intercepta respuestas 401, llama a `POST /auth/refresh` con el `refreshToken` guardado y reintenta la petición original.
5. Actualiza `CORS_ORIGINS` en `.env` del backend para incluir el dominio donde sirvas la PWA.

---

## 7. Cómo conectar el Dashboard Ejecutivo

El Dashboard es HTML/JS con paneles (BSC, War Room, agentes IA, MS Project). Para conectarlo:

1. Autentica al staff contra `POST /auth/login` (usa el rol OPERADOR/LABORATORISTA/ADMIN).
2. Sustituye las fuentes de datos simuladas del dashboard por:
   - `GET /samples` (sin filtrar por cliente → devuelve todas las muestras, con `include` de cliente, pago y resultado) para poblar tablas y el War Room.
   - `PATCH /samples/:id/status` para los botones de "mover a la siguiente etapa".
   - `PATCH /payments/:id/validate` para el panel de validación de comprobantes de Yape/transferencia.
   - `POST /results/:sampleId` para el formulario de carga de resultados del laboratorista.
3. Conecta al mismo socket uniéndote implícitamente a la sala `dashboard` (ocurre automático según el `role` del JWT) y escucha **todos** los eventos de la tabla de la sección 5 para refrescar el BSC/War Room en tiempo real conforme la PWA genera actividad.
4. Los PDFs (boletas y reportes) están disponibles en `invoice.pdfUrl` y `result.reportePdfUrl` dentro de la respuesta de `GET /samples/:id` — enlázalos directamente para previsualizar/descargar desde el dashboard.

---

## 8. Pagos: qué está listo y qué falta conectar

| Método | Estado en este backend |
|---|---|
| **Culqi** (tarjeta) | Integración real vía API REST de Culqi (`src/modules/payments/providers/culqi.provider.ts`). Solo falta cargar `CULQI_SECRET_KEY` real y generar el `tokenId` en el frontend con Culqi.js (el número de tarjeta nunca toca este backend). |
| **Yape Business** | Expone el QR/número comercial (`yape.provider.ts`); el flujo actual es subida de comprobante + validación manual del staff. Hay un punto de extensión (`handleWebhook`) listo para cuando actives confirmación automática vía webhook de Yape Business. |
| **Transferencia BCP** | Expone cuenta y CCI desde `.env` (`bcp.provider.ts`); mismo flujo de comprobante + validación manual. |

Cuando un pago se **aprueba** (automático en Culqi, o manual en Yape/BCP), el backend automáticamente: avanza la muestra a `PAGADO`, genera la boleta en PDF, y emite el evento en tiempo real a la PWA y al Dashboard.

---

## 9. Seguridad implementada

- Contraseñas con **bcrypt** (`BCRYPT_SALT_ROUNDS` configurable).
- **JWT de acceso** de corta duración (15 min por defecto) + **refresh token** de larga duración con **rotación y detección de reuso** (si un refresh token ya usado se vuelve a presentar, se revoca toda la sesión — indicio de robo de token).
- Validación de **todo** input con **Zod** antes de tocar la base de datos.
- **RBAC** por rol en cada ruta sensible (`requireRole`).
- **Rate limiting** global y reforzado en `/auth/*`.
- **Helmet** + CORS restringido a `CORS_ORIGINS`.
- Manejo centralizado de errores que nunca filtra detalles internos en producción.

## 10. Próximos pasos sugeridos para producción

- Migrar de Culqi test keys a llaves live + verificación de firma de webhooks.
- Mover `STORAGE_DRIVER` a `s3` y servir `uploads/` desde un bucket + CDN en vez de Express estático.
- Agregar `helmet` con CSP estricta una vez definidos los dominios finales del Dashboard y la PWA.
- Integrar el proveedor de facturación electrónica homologado por SUNAT (actualmente se genera un PDF de boleta interno, no un CDR válido ante SUNAT).
- Añadir tests (Vitest ya está configurado en `package.json`) para los servicios críticos: `sample.state-machine.ts` y `payment.service.ts`.
