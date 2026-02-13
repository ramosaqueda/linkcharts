import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, verifyNodeAccess } from '@/lib/auth-helpers';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = await verifyNodeAccess(id, user.id);
    if (!access) return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const node = await prisma.node.update({
      where: { id },
      data: {
        label: body.label,
        type: body.type,
        positionX: body.positionX,
        positionY: body.positionY,
        metadata: body.metadata,
        color: body.color,
        icon: body.icon,
      },
    });
    return NextResponse.json(node);
  } catch (error) {
    console.error('PUT /api/nodes/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update node' }, { status: 500 });
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
    const access = await verifyNodeAccess(id, user.id);
    if (!access) return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await prisma.node.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/nodes/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete node' }, { status: 500 });
  }
}
