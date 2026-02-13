import type { Graph, Node, Edge, EdgeType, User } from '@/generated/prisma/client';

export type { Graph, Node, Edge, EdgeType, User };

export type NodeType = string;

export interface NodeTypeConfig {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export type GraphWithRelations = Graph & {
  nodes: Node[];
  edges: Edge[];
  user?: { id: string; name: string };
  collaborators?: { userId: string }[];
};

export type NodeWithEdges = Node & {
  edgesFrom: Edge[];
  edgesTo: Edge[];
};

export type GraphSummary = Graph & {
  _count: {
    nodes: number;
    edges: number;
  };
  user: { id: string; name: string };
  collaborators?: { userId: string }[];
};
