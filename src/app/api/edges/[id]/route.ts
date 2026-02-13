import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, verifyEdgeAccess } from '@/lib/auth-helpers';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = await verifyEdgeAccess(id, user.id);
    if (!access) return NextResponse.json({ error: 'Edge not found' }, { status: 404 });
    if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const edge = await prisma.edge.update({
      where: { id },
      data: {
        type: body.type,
        label: body.label,
        weight: body.weight,
        directed: body.directed,
        metadata: body.metadata,
        color: body.color,
      },
    });
    return NextResponse.json(edge);
  } catch (error) {
    console.error('PUT /api/edges/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update edge' }, { status: 500 });
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
    const access = await verifyEdgeAccess(id, user.id);
    if (!access) return NextResponse.json({ error: 'Edge not found' }, { status: 404 });
    if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.edge.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/edges/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete edge' }, { status: 500 });
  }
}
