import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser, verifyGraphAccess } from '@/lib/auth-helpers';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, collaboratorId } = await params;
    const access = await verifyGraphAccess(id, user.id);
    if (!access) return NextResponse.json({ error: 'Graph not found' }, { status: 404 });

    const collaborator = await prisma.graphCollaborator.findUnique({
      where: { id: collaboratorId },
      select: { userId: true, graphId: true },
    });
    if (!collaborator || collaborator.graphId !== id) {
      return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    // Owner can remove anyone; collaborator can only remove themselves
    const isSelfRemoval = collaborator.userId === user.id;
    if (!access.isOwner && !isSelfRemoval) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.graphCollaborator.delete({ where: { id: collaboratorId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/graphs/[id]/collaborators/[collaboratorId] error:', error);
    return NextResponse.json({ error: 'Failed to remove collaborator' }, { status: 500 });
  }
}
