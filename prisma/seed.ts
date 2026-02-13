import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NODE_TYPES = [
  { name: 'PERSON',       label: 'Persona',         color: '#3b82f6', icon: 'UserRound',  sortOrder: 0 },
  { name: 'ORGANIZATION', label: 'Organización',    color: '#8b5cf6', icon: 'Building2',  sortOrder: 1 },
  { name: 'VEHICLE',      label: 'Vehículo',        color: '#f59e0b', icon: 'Car',        sortOrder: 2 },
  { name: 'PHONE',        label: 'Teléfono',        color: '#10b981', icon: 'Smartphone', sortOrder: 3 },
  { name: 'ADDRESS',      label: 'Dirección',       color: '#ef4444', icon: 'MapPin',     sortOrder: 4 },
  { name: 'BANK_ACCOUNT', label: 'Cuenta Bancaria', color: '#06b6d4', icon: 'Landmark',   sortOrder: 5 },
  { name: 'SOCIAL_MEDIA', label: 'Red Social',      color: '#ec4899', icon: 'Globe',      sortOrder: 6 },
  { name: 'DOCUMENT',     label: 'Documento',       color: '#64748b', icon: 'FileText',   sortOrder: 7 },
  { name: 'EVENT',        label: 'Evento',          color: '#f97316', icon: 'Calendar',   sortOrder: 8 },
  { name: 'CUSTOM',       label: 'Personalizado',   color: '#a855f7', icon: 'Circle',     sortOrder: 9 },
];

async function main() {
  // Seed NodeTypeConfig
  for (const nt of NODE_TYPES) {
    await prisma.nodeTypeConfig.upsert({
      where: { name: nt.name },
      update: { label: nt.label, color: nt.color, icon: nt.icon, sortOrder: nt.sortOrder },
      create: nt,
    });
  }
  console.log(`Seeded ${NODE_TYPES.length} node types`);

  // Crear usuario de prueba
  const password = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@linkcharts.local' },
    update: { role: 'ADMIN' },
    create: {
      id: 'default-admin-user',
      name: 'Admin',
      email: 'admin@linkcharts.local',
      password,
      role: 'ADMIN',
    },
  });

  console.log(`Usuario: ${user.email} (password: admin123)`);

  // Crear grafo del caso
  const graph = await prisma.graph.create({
    data: {
      name: 'Operación Frontera Sur',
      description: 'Investigación por tráfico de estupefacientes y lavado de activos vinculados a organización transnacional.',
      caseNumber: 'CAU-2026-00347',
      userId: user.id,
    },
  });

  console.log(`Grafo creado: ${graph.name} (${graph.id})`);

  // 10 nodos
  const [cabecilla, lugarteniente, correo1, correo2, empresa, banco, telefono, vehiculo, bodega, evento] =
    await Promise.all([
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'PERSON',
          label: 'Carlos Méndez',
          positionX: 400,
          positionY: 50,
          metadata: { rol: 'Cabecilla', alias: 'El Patrón', rut: '12.345.678-9', antecedentes: 'Ley 20.000 Art. 3' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'PERSON',
          label: 'Ricardo Soto',
          positionX: 150,
          positionY: 200,
          metadata: { rol: 'Lugarteniente', alias: 'Richi', rut: '14.567.890-1' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'PERSON',
          label: 'Ana Torres',
          positionX: 650,
          positionY: 200,
          metadata: { rol: 'Correo', rut: '16.789.012-3' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'PERSON',
          label: 'Luis Herrera',
          positionX: 400,
          positionY: 350,
          metadata: { rol: 'Correo', rut: '17.890.123-4', nacionalidad: 'Boliviana' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'ORGANIZATION',
          label: 'Transportes del Norte SpA',
          positionX: 100,
          positionY: 450,
          metadata: { rut: '76.543.210-K', giro: 'Transporte de carga', estado: 'Activa' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'BANK_ACCOUNT',
          label: 'Cta. 0012-3456-78',
          positionX: 700,
          positionY: 450,
          metadata: { banco: 'Banco Estado', titular: 'Carlos Méndez', tipo: 'Cuenta corriente' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'PHONE',
          label: '+56 9 8765 4321',
          positionX: 250,
          positionY: 550,
          metadata: { imei: '354789102345678', compañia: 'Entel', prepago: 'Sí' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'VEHICLE',
          label: 'Camioneta BBCC-12',
          positionX: 550,
          positionY: 550,
          metadata: { marca: 'Toyota Hilux', año: '2023', color: 'Blanco', propietario: 'Transportes del Norte SpA' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'ADDRESS',
          label: 'Bodega Ruta 5 Km 1820',
          positionX: 400,
          positionY: 650,
          metadata: { comuna: 'Arica', region: 'Arica y Parinacota', tipo: 'Bodega industrial' },
        },
      }),
      prisma.node.create({
        data: {
          graphId: graph.id,
          type: 'EVENT',
          label: 'Incautación 15-Ene-2026',
          positionX: 700,
          positionY: 650,
          metadata: { fecha: '2026-01-15', lugar: 'Control Chucuyo', cantidad: '120 kg pasta base', unidad: 'OS7 Carabineros' },
        },
      }),
    ]);

  console.log('10 nodos creados');

  // 12 conexiones
  await Promise.all([
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: cabecilla.id,
        targetId: lugarteniente.id,
        type: 'ASSOCIATE',
        label: 'Subordinado directo',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: cabecilla.id,
        targetId: correo1.id,
        type: 'ASSOCIATE',
        label: 'Reclutamiento',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: lugarteniente.id,
        targetId: correo2.id,
        type: 'ASSOCIATE',
        label: 'Coordina envíos',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: cabecilla.id,
        targetId: empresa.id,
        type: 'OWNERSHIP',
        label: 'Socio mayoritario',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: cabecilla.id,
        targetId: banco.id,
        type: 'OWNERSHIP',
        label: 'Titular',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: empresa.id,
        targetId: banco.id,
        type: 'TRANSACTION',
        label: 'Depósitos sospechosos',
        metadata: { monto_total: '$45.000.000', periodo: 'Oct-Dic 2025' },
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: lugarteniente.id,
        targetId: telefono.id,
        type: 'COMMUNICATION',
        label: 'Línea operativa',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: telefono.id,
        targetId: correo2.id,
        type: 'COMMUNICATION',
        label: '47 llamadas Dic-2025',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: empresa.id,
        targetId: vehiculo.id,
        type: 'OWNERSHIP',
        label: 'Vehículo registrado',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: vehiculo.id,
        targetId: bodega.id,
        type: 'LOCATION',
        label: 'Visto en lugar',
        metadata: { fechas: '10-Ene, 12-Ene, 14-Ene 2026' },
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: correo2.id,
        targetId: bodega.id,
        type: 'LOCATION',
        label: 'Vigilancia confirma presencia',
      },
    }),
    prisma.edge.create({
      data: {
        graphId: graph.id,
        sourceId: evento.id,
        targetId: vehiculo.id,
        type: 'TEMPORAL',
        label: 'Detenido con carga',
      },
    }),
  ]);

  console.log('12 conexiones creadas');
  console.log(`\nSeed completo. Abre el editor: http://localhost:3001/editor/${graph.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
