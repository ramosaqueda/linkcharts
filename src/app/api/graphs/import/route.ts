import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-helpers';

const VALID_EDGE_TYPES = [
  'CONTACT', 'TRANSACTION', 'KINSHIP', 'ASSOCIATE', 'OWNERSHIP',
  'LOCATION', 'EMPLOYMENT', 'COMMUNICATION', 'TEMPORAL', 'CUSTOM',
] as const;

interface ImportNode {
  tempId: string;
  type: string;
  label: string;
  metadata?: Record<string, unknown>;
}

interface ImportEdge {
  sourceTemp: string;
  targetTemp: string;
  type: string;
  label?: string;
}

interface ImportBody {
  name: string;
  caseNumber?: string;
  description?: string;
  nodes: ImportNode[];
  edges: ImportEdge[];
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body: ImportBody = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre del grafo es obligatorio' }, { status: 400 });
    }
    if (!Array.isArray(body.nodes) || body.nodes.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un nodo' }, { status: 400 });
    }

    // Fetch valid node types from DB
    const nodeTypeConfigs = await prisma.nodeTypeConfig.findMany({ select: { name: true } });
    const validNodeTypes = new Set(nodeTypeConfigs.map((t) => t.name));

    // Validate nodes
    const tempIds = new Set<string>();
    const errors: string[] = [];

    for (let i = 0; i < body.nodes.length; i++) {
      const node = body.nodes[i];
      if (!node.tempId) errors.push(`Nodo #${i + 1}: falta id_temp`);
      if (!node.type) errors.push(`Nodo #${i + 1}: falta tipo`);
      else if (!validNodeTypes.has(node.type)) errors.push(`Nodo #${i + 1}: tipo "${node.type}" no existe`);
      if (!node.label) errors.push(`Nodo #${i + 1}: falta etiqueta`);
      if (node.tempId) {
        if (tempIds.has(node.tempId)) errors.push(`Nodo #${i + 1}: id_temp "${node.tempId}" duplicado`);
        tempIds.add(node.tempId);
      }
    }

    // Validate edges
    if (Array.isArray(body.edges)) {
      for (let i = 0; i < body.edges.length; i++) {
        const edge = body.edges[i];
        if (!edge.sourceTemp) errors.push(`Conexión #${i + 1}: falta origen`);
        else if (!tempIds.has(edge.sourceTemp)) errors.push(`Conexión #${i + 1}: origen "${edge.sourceTemp}" no existe en nodos`);
        if (!edge.targetTemp) errors.push(`Conexión #${i + 1}: falta destino`);
        else if (!tempIds.has(edge.targetTemp)) errors.push(`Conexión #${i + 1}: destino "${edge.targetTemp}" no existe en nodos`);
        if (!edge.type) errors.push(`Conexión #${i + 1}: falta tipo`);
        else if (!VALID_EDGE_TYPES.includes(edge.type as typeof VALID_EDGE_TYPES[number])) {
          errors.push(`Conexión #${i + 1}: tipo "${edge.type}" no válido`);
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Errores de validación', details: errors }, { status: 400 });
    }

    // Create graph
    const graph = await prisma.graph.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        caseNumber: body.caseNumber?.trim() || null,
        userId: user.id,
      },
    });

    // Calculate grid positions (5 columns, 250x200 spacing)
    const COLS = 5;
    const X_SPACING = 250;
    const Y_SPACING = 200;
    const X_OFFSET = 100;
    const Y_OFFSET = 100;

    // Create nodes individually to get their IDs for mapping
    const tempToRealId = new Map<string, string>();

    for (let i = 0; i < body.nodes.length; i++) {
      const node = body.nodes[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);

      const created = await prisma.node.create({
        data: {
          graphId: graph.id,
          type: node.type,
          label: node.label,
          positionX: X_OFFSET + col * X_SPACING,
          positionY: Y_OFFSET + row * Y_SPACING,
          metadata: node.metadata ? (node.metadata as object) : undefined,
        },
      });

      tempToRealId.set(node.tempId, created.id);
    }

    // Create edges in bulk
    const edges = body.edges ?? [];
    if (edges.length > 0) {
      await prisma.edge.createMany({
        data: edges.map((edge) => ({
          graphId: graph.id,
          sourceId: tempToRealId.get(edge.sourceTemp)!,
          targetId: tempToRealId.get(edge.targetTemp)!,
          type: edge.type as typeof VALID_EDGE_TYPES[number],
          label: edge.label || null,
        })),
      });
    }

    return NextResponse.json({
      graph,
      nodeCount: body.nodes.length,
      edgeCount: edges.length,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/graphs/import error:', error);
    return NextResponse.json({ error: 'Error al importar grafo' }, { status: 500 });
  }
}
