import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const role = (session.user as Record<string, unknown>).role as string | undefined;
  return { id: session.user.id, name: session.user.name, email: session.user.email, role: role ?? 'ANALYST' };
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function verifyGraphOwnership(graphId: string, userId: string) {
  const graph = await prisma.graph.findUnique({
    where: { id: graphId },
    select: { userId: true, isPublic: true },
  });
  if (!graph) return null;
  return { isOwner: graph.userId === userId, isPublic: graph.isPublic };
}

export async function verifyGraphAccess(graphId: string, userId: string) {
  const graph = await prisma.graph.findUnique({
    where: { id: graphId },
    select: {
      userId: true,
      isPublic: true,
      collaborators: { where: { userId }, select: { id: true } },
    },
  });
  if (!graph) return null;
  const isOwner = graph.userId === userId;
  const isCollaborator = graph.collaborators.length > 0;
  return { isOwner, isCollaborator, canEdit: isOwner || isCollaborator, isPublic: graph.isPublic };
}

export async function verifyNodeAccess(nodeId: string, userId: string) {
  const node = await prisma.node.findUnique({
    where: { id: nodeId },
    select: {
      graph: {
        select: {
          userId: true,
          isPublic: true,
          collaborators: { where: { userId }, select: { id: true } },
        },
      },
    },
  });
  if (!node) return null;
  const isOwner = node.graph.userId === userId;
  const isCollaborator = node.graph.collaborators.length > 0;
  return { isOwner, isCollaborator, canEdit: isOwner || isCollaborator, isPublic: node.graph.isPublic };
}

export async function verifyEdgeAccess(edgeId: string, userId: string) {
  const edge = await prisma.edge.findUnique({
    where: { id: edgeId },
    select: {
      graph: {
        select: {
          userId: true,
          isPublic: true,
          collaborators: { where: { userId }, select: { id: true } },
        },
      },
    },
  });
  if (!edge) return null;
  const isOwner = edge.graph.userId === userId;
  const isCollaborator = edge.graph.collaborators.length > 0;
  return { isOwner, isCollaborator, canEdit: isOwner || isCollaborator, isPublic: edge.graph.isPublic };
}
