import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { name, label, color, icon, sortOrder } = body;

    const nodeType = await prisma.nodeTypeConfig.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(label !== undefined && { label }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    return NextResponse.json(nodeType);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Node type not found' }, { status: 404 });
    }
    console.error('PUT /api/node-types/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update node type' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    // Check if any nodes use this type
    const config = await prisma.nodeTypeConfig.findUnique({ where: { id } });
    if (!config) return NextResponse.json({ error: 'Node type not found' }, { status: 404 });

    const usageCount = await prisma.node.count({ where: { type: config.name } });
    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${usageCount} node(s) are using this type` },
        { status: 409 },
      );
    }

    await prisma.nodeTypeConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/node-types/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete node type' }, { status: 500 });
  }
}
