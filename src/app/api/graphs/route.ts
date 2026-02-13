import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const graphs = await prisma.graph.findMany({
      where: {
        OR: [
          { userId: user.id },
          { isPublic: true },
          { collaborators: { some: { userId: user.id } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { nodes: true, edges: true } },
        user: { select: { id: true, name: true } },
        collaborators: { select: { userId: true } },
      },
    });
    return NextResponse.json(graphs);
  } catch (error) {
    console.error('GET /api/graphs error:', error);
    return NextResponse.json({ error: 'Failed to fetch graphs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const graph = await prisma.graph.create({
      data: {
        name: body.name,
        description: body.description,
        caseNumber: body.caseNumber,
        userId: user.id,
      },
    });
    return NextResponse.json(graph, { status: 201 });
  } catch (error) {
    console.error('POST /api/graphs error:', error);
    return NextResponse.json({ error: 'Failed to create graph' }, { status: 500 });
  }
}
