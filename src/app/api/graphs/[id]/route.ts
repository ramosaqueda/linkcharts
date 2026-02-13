import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, verifyGraphOwnership, verifyGraphAccess } from '@/lib/auth-helpers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const graph = await prisma.graph.findUnique({
      where: { id },
      include: {
        nodes: { include: { edgesFrom: true, edgesTo: true } },
        edges: true,
        user: { select: { id: true, name: true } },
        collaborators: { select: { userId: true } },
      },
    });
    if (!graph) {
      return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
    }

    // Allow access if owner, public, or collaborator
    const isCollaborator = graph.collaborators.some(c => c.userId === user.id);
    if (graph.userId !== user.id && !graph.isPublic && !isCollaborator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(graph);
  } catch (error) {
    console.error('GET /api/graphs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = await verifyGraphAccess(id, user.id);
    if (!access) return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
    if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();

    // Only owner can toggle isPublic
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.caseNumber !== undefined) data.caseNumber = body.caseNumber;
    if (body.isPublic !== undefined && (access.isOwner || user.role === 'ADMIN')) data.isPublic = body.isPublic;

    const graph = await prisma.graph.update({
      where: { id },
      data,
    });
    return NextResponse.json(graph);
  } catch (error) {
    console.error('PUT /api/graphs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update graph' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = await verifyGraphOwnership(id, user.id);
    if (!access) return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
    if (!access.isOwner && user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.graph.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/graphs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete graph' }, { status: 500 });
  }
}
