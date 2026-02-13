import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const types = await prisma.nodeTypeConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(types);
  } catch (error) {
    console.error('GET /api/node-types error:', error);
    return NextResponse.json({ error: 'Failed to fetch node types' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, label, color, icon, sortOrder } = body;

    if (!name || !label || !color || !icon) {
      return NextResponse.json({ error: 'Missing required fields: name, label, color, icon' }, { status: 400 });
    }

    const nodeType = await prisma.nodeTypeConfig.create({
      data: { name, label, color, icon, sortOrder: sortOrder ?? 0 },
    });
    return NextResponse.json(nodeType, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Node type name already exists' }, { status: 409 });
    }
    console.error('POST /api/node-types error:', error);
    return NextResponse.json({ error: 'Failed to create node type' }, { status: 500 });
  }
}
