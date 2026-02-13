# LinkCharts — Editor de Grafos Relacionales

## Descripción del Proyecto

Editor visual de grafos relacionales orientado a inteligencia criminal y análisis de redes. Permite crear, editar y visualizar grafos donde los nodos representan entidades (personas, organizaciones, vehículos, teléfonos, direcciones, cuentas bancarias, eventos, documentos) y los edges representan relaciones tipadas entre ellas (contacto, transacción, parentesco, asociación, propiedad, comunicación, temporal).

## Stack Tecnológico

- **Framework**: Next.js 16 con App Router y TypeScript
- **UI de Grafos**: @xyflow/react (React Flow v12)
- **Estado global**: Zustand 5
- **Base de datos**: PostgreSQL 15+ (localhost:5432/graph_editor)
- **ORM**: Prisma 7 (requiere `@prisma/adapter-pg` + `pg` — NO constructor sin args)
- **Estilos**: Tailwind CSS 4, temas via CSS variables (`--th-*`)
- **Componentes UI**: Radix UI (dialog, select, tooltip, context-menu)
- **Iconos**: Lucide React
- **Auth**: next-auth@beta con Credentials provider, JWT strategy
- **Importación**: xlsx (SheetJS) para CSV/XLS/XLSX
- **Fuente monospace**: JetBrains Mono (Google Fonts)

## Modelo de Datos (Prisma Schema)

> Fuente de verdad: `prisma/schema.prisma`. Cliente generado en `src/generated/prisma/`.

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum UserRole { ADMIN  ANALYST }

model User {
  id, name, email (unique), password, role (default ANALYST)
  → graphs[], collaborations[]
}

model Graph {
  id, name, description?, caseNumber?, isPublic (default false), userId
  → user, nodes[], edges[], collaborators[]
}

model GraphCollaborator {
  id, graphId, userId  @@unique([graphId, userId])
}

model NodeTypeConfig {
  id, name (unique), label, color, icon, sortOrder
  — Tipos de nodo dinámicos, administrables desde /admin/node-types
}

model Node {
  id, graphId, type (String — referencia a NodeTypeConfig.name), label
  positionX, positionY, metadata (Json?), color?, icon?
  → edgesFrom[], edgesTo[]
}

enum EdgeType {
  CONTACT, TRANSACTION, KINSHIP, ASSOCIATE, OWNERSHIP,
  LOCATION, EMPLOYMENT, COMMUNICATION, TEMPORAL, CUSTOM
}

model Edge {
  id, graphId, sourceId, targetId, type (EdgeType), label?
  weight?, directed (default true), metadata (Json?), color?
}
```

**Nota**: Node.type es String (no enum) porque los tipos son dinámicos via NodeTypeConfig.

## Arquitectura de la Aplicación

### Estructura de Archivos

```
src/
  app/
    page.tsx                    → redirect a /login
    login/page.tsx              → formulario login
    register/page.tsx           → registro de usuarios
    dashboard/page.tsx          → listado de grafos + modal crear (con importación CSV/XLS)
    editor/[graphId]/           → editor de grafos (read-only para no-owners)
    admin/node-types/           → CRUD tipos de nodo (solo ADMIN)
    api/
      auth/[...nextauth]/       → NextAuth handlers
      register/                 → registro de usuarios
      graphs/                   → GET (listar), POST (crear)
      graphs/[id]/              → GET, PUT, DELETE grafo individual
      graphs/import/            → POST bulk import (grafo + nodos + edges)
      nodes/                    → POST crear nodo
      nodes/[id]/               → PUT, DELETE nodo
      edges/                    → POST crear edge
      edges/[id]/               → PUT, DELETE edge
      node-types/               → GET listar, POST crear tipo
      node-types/[id]/          → PUT, DELETE tipo
  components/
    graph/
      GraphCanvas.tsx           → canvas principal React Flow
      CustomNode.tsx            → nodo personalizado con icono/color dinámico
      CustomEdge.tsx            → edge personalizado con colores por tipo
      EdgeMarkers.tsx           → marcadores SVG para flechas
    ui/
      Toolbar.tsx               → barra herramientas editor
      DetailPanel.tsx           → panel detalle nodo/edge
      ContextMenu.tsx           → menú contextual
      ThemeSelector.tsx         → selector de tema
  lib/
    prisma.ts                   → singleton Prisma (pg Pool + PrismaPg adapter)
    auth.ts                     → config NextAuth
    auth-helpers.ts             → getSessionUser(), verifyGraphOwnership(), verifyGraphAccess()
    store.ts                    → Zustand store (debounced position updates 300ms)
    types.ts                    → tipos TS (GraphSummary, NodeTypeConfig, etc.)
    constants.ts                → colores/labels EdgeType, DASHED_EDGE_TYPES
    import-template.ts          → downloadTemplate() genera XLSX plantilla
    import-parser.ts            → parseImportFile() parsea CSV/XLS/XLSX
  middleware.ts                 → protección rutas via JWT (getToken de next-auth/jwt)
prisma/
  schema.prisma
```

### API Routes

Todas las rutas manejan errores con try/catch y retornan NextResponse.json con status codes apropiados.

- `GET/POST /api/graphs` — Listar grafos (filtrados por auth) / Crear grafo vacío
- `GET/PUT/DELETE /api/graphs/[id]` — CRUD grafo individual
- `POST /api/graphs/import` — Crear grafo con nodos+edges en bulk (importación)
- `POST /api/nodes` — Crear nodo (body: graphId, type, label, positionX, positionY, metadata)
- `PUT/DELETE /api/nodes/[id]` — Actualizar/eliminar nodo
- `POST /api/edges` — Crear edge (body: graphId, sourceId, targetId, type, label)
- `PUT/DELETE /api/edges/[id]` — Actualizar/eliminar edge
- `GET/POST /api/node-types` — Listar/crear tipos de nodo (POST requiere ADMIN)
- `PUT/DELETE /api/node-types/[id]` — Actualizar/eliminar tipo (requiere ADMIN)
- `POST /api/register` — Registro de usuarios

### Autenticación

- **Middleware** (`src/middleware.ts`): usa `getToken` de `next-auth/jwt` — NO `export { auth as middleware }` porque Edge runtime no carga Prisma
- **Auth helpers** (`src/lib/auth-helpers.ts`): `getSessionUser()`, `requireAdmin()`, `verifyGraphOwnership()`, `verifyGraphAccess()`, `verifyNodeAccess()`, `verifyEdgeAccess()`
- Rutas protegidas: todo excepto `/login`, `/register`, `/api/auth`

### Prisma Client Singleton

`src/lib/prisma.ts` — usa `pg` Pool + `@prisma/adapter-pg` (PrismaPg). NO se puede usar `new PrismaClient()` sin adapter en Prisma 7.

### Zustand Store (`src/lib/store.ts`)

- `nodes`, `edges` — estado local del grafo activo
- `selectedNodeId`, `selectedEdgeId` — selección
- `mode: 'select' | 'connect'` — modo de interacción
- Acciones: addNode, updateNode, deleteNode, addEdge, updateEdge, deleteEdge, setSelected, setMode
- Cada mutación persiste via API y actualiza estado local
- Debounce de 300ms para posiciones (onNodeDragStop)

### Componentes React Flow

**GraphCanvas.tsx**: ReactFlowProvider, custom nodes/edges, MiniMap, Background dots, Controls zoom, fitView al cargar.

**CustomNode.tsx**: Icono y color dinámicos según NodeTypeConfig (cargados desde `/api/node-types`). Handles de conexión, badge con tipo, label debajo. Ring animado para selección.

**CustomEdge.tsx**: Bezier curves, colores por EdgeType (ver `constants.ts`). Dash pattern para ASSOCIATE, COMMUNICATION, TEMPORAL. Label flotante, arrow marker.

### UI Components

**DetailPanel.tsx**: Panel lateral 320px. Editar label, tipo, metadata (key-value dinámico). Lista de conexiones para nodos. Botón eliminar.

**Toolbar.tsx**: Modo select/connect, botones agregar nodo por tipo, búsqueda, exportar JSON, indicador caso activo.

**ContextMenu.tsx**: Click derecho → agregar nodo (submenu), editar, duplicar, copiar, conectar, eliminar.

## Diseño Visual

- **Temas**: Múltiples temas via CSS variables `--th-*` (NO hardcoded dark mode)
- **Fuente UI**: JetBrains Mono
- **Grid canvas**: dots pattern opacidad 0.12
- **Nodos**: Círculos con borde color del tipo, icono centrado, label debajo
- **Edges**: Bezier, colores por tipo, labels con fondo semi-transparente
- **Animaciones**: slideIn panel, ring animado selección, transitions suaves

## Funcionalidades Implementadas

1. Drag & drop de nodos con persistencia de posición (debounce)
2. Crear conexiones arrastrando entre handles
3. Zoom + pan en canvas
4. Búsqueda de nodos por label
5. Exportar grafo como JSON
6. Menú contextual con click derecho
7. Metadata dinámica por nodo
8. Autoguardado (cada mutación se persiste)
9. FitView automático al cargar
10. Atajos: Delete, Escape, Ctrl+F
11. Autenticación y autorización (owner, colaborador, público, admin)
12. Tipos de nodo dinámicos (admin configurable)
13. Colaboradores por grafo
14. **Importación CSV/XLS/XLSX** al crear grafo (con plantilla descargable)

## Importación CSV/XLS (Fase reciente)

- `POST /api/graphs/import` — recibe `{ name, nodes[], edges[] }`, valida tipos contra NodeTypeConfig y EdgeType, crea todo en bulk con layout en grilla automática (5 cols, 250x200px)
- `src/lib/import-parser.ts` — `parseImportFile(file, validNodeTypes)` lee archivo con SheetJS, busca hojas "Nodos"/"Conexiones", valida y retorna `{ nodes, edges, errors }`
- `src/lib/import-template.ts` — `downloadTemplate()` genera XLSX con hojas de ejemplo
- Dashboard: modal crear grafo tiene dropzone, preview, validación inline, botón "Crear e importar"

## Desarrollo

- **Puerto**: Usar 3001+ (`npx next dev -p 3001`) — puerto 3000 ocupado por otra app
- **Usuario test**: `admin@linkcharts.local` / `admin123`
- **Verificar tipos**: `npx tsc --noEmit`
- **DB**: PostgreSQL en `localhost:5432/graph_editor`, credenciales en `.env`

## Notas Técnicas

- Usa `'use client'` en componentes con React Flow y Zustand
- React Flow necesita contenedor con height explícito
- Next.js 16 async `params` en API routes: `const { id } = await params`
- Las posiciones se sincronizan: React Flow visual → onNodeDragStop persiste a DB
- Metadata Json de Prisma se tipea como `Record<string, string>` en formularios
- Node.type es String (dinámico via NodeTypeConfig), EdgeType es enum Prisma
