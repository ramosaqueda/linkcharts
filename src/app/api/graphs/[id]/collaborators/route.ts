import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, verifyGraphAccess } from '@/lib/auth-helpers';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = await verifyGraphAccess(id, user.id);
    if (!access) return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
    if (!access.isOwner && !access.isCollaborator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const collaborators = await prisma.graphCollaborator.findMany({
      where: { graphId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(collaborators);
  } catch (error) {
    console.error('GET /api/graphs/[id]/collaborators error:', error);
    return NextResponse.json({ error: 'Failed to fetch collaborators' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const access = await verifyGraphAccess(id, user.id);
    if (!access) return NextResponse.json({ error: 'Graph not found' }, { status: 404 });
    if (!access.isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const email = body.email?.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    if (targetUser.id === user.id) {
      return NextResponse.json({ error: 'No puedes agregarte a ti mismo' }, { status: 400 });
    }

    const existing = await prisma.graphCollaborator.findUnique({
      where: { graphId_userId: { graphId: id, userId: targetUser.id } },
    });
    if (existing) {
      return NextResponse.json({ error: 'El usuario ya es colaborador' }, { status: 400 });
    }

    const collaborator = await prisma.graphCollaborator.create({
      data: { graphId: id, userId: targetUser.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(collaborator, { status: 201 });
  } catch (error) {
    console.error('POST /api/graphs/[id]/collaborators error:', error);
    return NextResponse.json({ error: 'Failed to add collaborator' }, { status: 500 });
  }
}
