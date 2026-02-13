import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, verifyGraphAccess } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const access = await verifyGraphAccess(body.graphId, user.id);
    if (!access) return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
    if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const node = await prisma.node.create({
      data: {
        ...(body.id && { id: body.id }),
        graphId: body.graphId,
        type: body.type,
        label: body.label,
        positionX: body.positionX ?? 0,
        positionY: body.positionY ?? 0,
        metadata: body.metadata,
        color: body.color,
        icon: body.icon,
      },
    });
    return NextResponse.json(node, { status: 201 });
  } catch (error) {
    console.error('POST /api/nodes error:', error);
    return NextResponse.json({ error: 'Failed to create node' }, { status: 500 });
  }
}
