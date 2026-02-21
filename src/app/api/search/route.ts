import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-helpers';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ graphs: [], nodes: [] });
    }

    const searchTerm = `%${query}%`;

    // Get graphs accessible to user (owned, collaborated, or public)
    const accessibleGraphs = await prisma.graph.findMany({
      where: {
        OR: [
          { userId: user.id },
          { collaborators: { some: { userId: user.id } } },
          { isPublic: true },
        ],
      },
      select: { id: true },
    });

    const accessibleGraphIds = accessibleGraphs.map((g) => g.id);

    // Search graphs
    const graphs = await prisma.graph.findMany({
      where: {
        AND: [
          { id: { in: accessibleGraphIds } },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { caseNumber: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        caseNumber: true,
        isPublic: true,
        userId: true,
        user: { select: { name: true } },
        _count: { select: { nodes: true, edges: true } },
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    // Search nodes in accessible graphs
    // We search in label and metadata (JSON field)
    const nodes = await prisma.node.findMany({
      where: {
        AND: [
          { graphId: { in: accessibleGraphIds } },
          {
            OR: [
              { label: { contains: query, mode: 'insensitive' } },
              // Search in metadata JSON - Prisma supports string_contains for Json
              { metadata: { string_contains: query } },
            ],
          },
        ],
      },
      select: {
        id: true,
        label: true,
        type: true,
        metadata: true,
        graphId: true,
        graph: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 20,
      orderBy: { label: 'asc' },
    });

    // Process nodes to extract matching metadata fields for display
    const processedNodes = nodes.map((node) => {
      const meta = node.metadata as Record<string, string> | null;
      let matchingField: string | null = null;

      if (meta) {
        // Find which metadata field matched
        for (const [key, value] of Object.entries(meta)) {
          if (
            typeof value === 'string' &&
            value.toLowerCase().includes(query.toLowerCase())
          ) {
            matchingField = `${key}: ${value}`;
            break;
          }
        }
      }

      return {
        id: node.id,
        label: node.label,
        type: node.type,
        graphId: node.graphId,
        graphName: node.graph.name,
        matchingField,
      };
    });

    return NextResponse.json({
      graphs: graphs.map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        caseNumber: g.caseNumber,
        isPublic: g.isPublic,
        isOwner: g.userId === user.id,
        ownerName: g.user.name,
        nodeCount: g._count.nodes,
        edgeCount: g._count.edges,
      })),
      nodes: processedNodes,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Error en búsqueda' },
      { status: 500 }
    );
  }
}
