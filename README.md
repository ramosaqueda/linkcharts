# LinkCharts

Editor visual de grafos relacionales orientado a inteligencia criminal y analisis de redes.

Permite crear, editar y visualizar grafos donde los **nodos** representan entidades (personas, organizaciones, vehiculos, telefonos, direcciones, cuentas bancarias, documentos, eventos) y las **conexiones** representan relaciones tipadas entre ellas (contacto, transaccion, parentesco, asociacion, propiedad, comunicacion, temporal).

## Caracteristicas

### Editor de Grafos
- Canvas interactivo con drag & drop, zoom y paneo
- Nodos personalizados con iconos y colores por tipo de entidad
- Conexiones con curvas bezier, colores por tipo y flechas direccionales
- Creacion de conexiones arrastrando entre nodos
- Minimapa de navegacion
- Ajuste automatico de vista al cargar un grafo

### Tipos de Entidad (Nodos)
Tipos configurables desde el panel de administracion. Cada tipo tiene icono, color y etiqueta personalizables. Ejemplos predeterminados:

| Tipo | Descripcion |
|------|-------------|
| PERSON | Personas naturales |
| ORGANIZATION | Empresas, instituciones |
| VEHICLE | Vehiculos |
| PHONE | Numeros telefonicos |
| ADDRESS | Direcciones fisicas |
| BANK_ACCOUNT | Cuentas bancarias |
| SOCIAL_MEDIA | Perfiles en redes sociales |
| DOCUMENT | Documentos (RUT, escrituras, etc.) |
| EVENT | Eventos o hechos |

### Tipos de Conexion (Edges)

| Tipo | Descripcion |
|------|-------------|
| CONTACT | Contacto entre entidades |
| TRANSACTION | Transacciones financieras |
| KINSHIP | Parentesco familiar |
| ASSOCIATE | Asociacion |
| OWNERSHIP | Propiedad |
| LOCATION | Vinculo con ubicacion |
| EMPLOYMENT | Relacion laboral |
| COMMUNICATION | Comunicacion |
| TEMPORAL | Relacion temporal |
| CUSTOM | Personalizado |

### Interaccion
- Menu contextual (click derecho) para agregar, editar, duplicar y eliminar
- Panel lateral de detalle con edicion de etiqueta, tipo y metadata
- Metadata dinamica por nodo (pares clave-valor)
- Busqueda de nodos por etiqueta con foco automatico en el canvas
- Atajos de teclado: `Delete` eliminar, `Escape` deseleccionar, `Ctrl+F` buscar

### Gestion de Grafos
- Dashboard con listado de grafos propios, compartidos y publicos
- Crear grafos vacios o con importacion de datos
- Numero de causa/RUC asociado a cada grafo
- Visibilidad publica/privada por grafo
- Colaboradores por grafo (acceso compartido)
- Eliminacion con confirmacion

### Importacion de Datos
- Importar nodos y conexiones desde archivos **CSV, XLS o XLSX**
- Plantilla descargable con formato esperado (2 hojas: Nodos y Conexiones)
- Validacion en tiempo real con preview antes de importar
- Layout automatico en grilla al importar

### Exportacion
- Exportar grafo completo como JSON

### Autenticacion y Autorizacion
- Registro e inicio de sesion con credenciales
- Roles: **Admin** (gestion completa) y **Analyst** (uso estandar)
- Proteccion de rutas via middleware JWT
- Grafos privados solo visibles por owner y colaboradores
- Editor en modo solo lectura para usuarios sin permisos de edicion

### Temas Visuales
- Multiples temas de color seleccionables
- Fuente monoespaciada JetBrains Mono
- Interfaz limpia orientada a analisis

## Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| UI Grafos | @xyflow/react v12 |
| Estado | Zustand 5 |
| Base de datos | PostgreSQL 15+ |
| ORM | Prisma 7 |
| Estilos | Tailwind CSS 4 |
| Componentes | Radix UI |
| Iconos | Lucide React |
| Auth | NextAuth v5 (beta) |
| Importacion | SheetJS (xlsx) |

## Requisitos

- Node.js 18+
- PostgreSQL 15+

## Instalacion

1. Clonar el repositorio:

```bash
git clone <url-del-repo>
cd linkcharts
```

2. Instalar dependencias:

```bash
npm install
```

3. Configurar variables de entorno:

```bash
cp .env.example .env
```

Editar `.env` con los datos de conexion a PostgreSQL:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/graph_editor"
AUTH_SECRET="tu-secreto-aqui"
```

4. Ejecutar migraciones y seed:

```bash
npx prisma migrate deploy
npx prisma db seed
```

5. Iniciar en modo desarrollo:

```bash
npx next dev -p 3001
```

La aplicacion estara disponible en `http://localhost:3001`.

## Estructura del Proyecto

```
src/
  app/
    dashboard/          Dashboard principal con listado de grafos
    editor/[graphId]/   Editor visual de grafos
    admin/node-types/   Administracion de tipos de nodo
    login/              Inicio de sesion
    register/           Registro de usuarios
    api/                API REST (graphs, nodes, edges, node-types, auth)
  components/
    graph/              Componentes del editor (canvas, nodos, edges)
    ui/                 Componentes de interfaz (toolbar, panel, menu)
  lib/                  Utilidades (prisma, auth, store, tipos, importacion)
  middleware.ts         Proteccion de rutas
prisma/
  schema.prisma         Esquema de base de datos
```

## Licencia

Uso interno.
