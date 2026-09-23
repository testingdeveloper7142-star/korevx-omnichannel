# KorevX - Plataforma Omnicanal de Redes Sociales (Meta & TikTok)

Plataforma profesional omnicanal desarrollada para **KorevX** (`korevx.com`). Permite unificar en una sola interfaz en tiempo real mensajes directos (DMs) y comentarios en publicaciones de **Facebook**, **Instagram** y **TikTok**, con arquitectura preparada para WhatsApp Cloud API, X (Twitter) y LinkedIn.

---

## 🎨 Paleta de Diseño y Experiencia de Usuario

- **Fondo Dominante:** Negro mate sigiloso (`#030508` y `#05080F`), limpio y minimalista.
- **Acentos de Marca:** Cian eléctrico (`#00F0FF`) y Verde Menta (`#00D796` / `#10B981`).
- **Gestión Visual de Estados:**
  - **Pendientes:** Rojo vibrante (`#EF4444` / `rose-500`) con indicador de alerta pulsante.
  - **Asignados a mí:** Ámbar cálido / Dorado (`#F59E0B` / `amber-400`).
  - **Resueltos:** Verde Esmeralda (`#10B981` / `emerald-500`) con tratamiento simétrico y badges de resolución.
- **Métricas Clave:** Tiempo Medio de Respuesta en cian con monitoreo en vivo de cumplimiento SLA (-35s vs meta).
- **Flujo Progresivo:** Barra lateral persistente con filtros $\rightarrow$ Feed amplio de conversaciones $\rightarrow$ Vista enfocada de respuesta a pantalla completa con cronómetro de espera y Ficha CRM colapsable.
- **Diseño 100% Responsivo:** Adaptado nativamente a móviles y escritorio.

---

## 🛠️ Estructura del Proyecto

```
KorevxRedSociales/
├── docker-compose.yml              # PostgreSQL 16 + Redis 7
├── backend/                        # API Modular en NestJS + Prisma ORM
│   ├── prisma/
│   │   └── schema.prisma           # Esquema relacional normalizado
│   ├── src/
│   │   ├── database/               # PrismaService y DatabaseModule
│   │   ├── modules/
│   │   │   ├── channels/           # ISocialChannelAdapter (Facebook, Instagram, TikTok)
│   │   │   ├── webhooks/           # Receptor de webhooks y simulador en vivo
│   │   │   ├── conversations/      # Bandeja unificada, filtros y respuestas
│   │   │   └── websockets/         # Socket.io Gateway para eventos en vivo
│   │   ├── app.module.ts
│   │   └── main.ts                 # Bootstrap con Swagger en /api/docs
│   ├── .env.example
│   └── package.json
└── frontend/                       # Aplicación React 18 + Vite + Tailwind CSS
    ├── src/
    │   ├── components/             # Header, Sidebar, InboxFeed, ConversationView, etc.
    │   ├── services/               # API Axios y WebSockets client
    │   ├── types/                  # Tipado estricto unificado
    │   ├── App.tsx
    │   └── main.tsx
    ├── index.html
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Puesta en Marcha Rápida

### 1. Levantar Servicios de Base de Datos y Redis
```bash
docker compose up -d
```

### 2. Iniciar el Backend (NestJS)
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```
- API REST & WebSockets: `http://localhost:3000`
- Documentación interactiva Swagger: `http://localhost:3000/api/docs`

### 3. Iniciar el Frontend (React + Vite)
```bash
cd ../frontend
npm install
npm run dev
```
- Interfaz web: `http://localhost:5173`

---

## 🧪 Pruebas de Webhooks en Vivo

El sistema incluye un simulador integrado en la pestaña **Canales Conectados** del Frontend y el endpoint:
`POST /api/v1/webhooks/simulate`

Permite inyectar eventos instantáneos simulando mensajes de Instagram, Facebook o comentarios de TikTok y ver su aparición inmediata en la bandeja mediante WebSockets.
