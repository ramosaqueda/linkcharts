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

    const edge = await prisma.edge.create({
      data: {
        ...(body.id && { id: body.id }),
        graphId: body.graphId,
        sourceId: body.sourceId,
        targetId: body.targetId,
        type: body.type,
        label: body.label,
        weight: body.weight,
        directed: body.directed,
        metadata: body.metadata,
        color: body.color,
      },
    });
    return NextResponse.json(edge, { status: 201 });
  } catch (error) {
    console.error('POST /api/edges error:', error);
    return NextResponse.json({ error: 'Failed to create edge' }, { status: 500 });
  }
}
