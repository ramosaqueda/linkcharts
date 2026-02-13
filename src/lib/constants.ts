import type { EdgeType } from '@/lib/types';

// Default fallbacks (used when nodeTypes haven't loaded yet or type not found)
export const DEFAULT_NODE_COLOR = '#a855f7';
export const DEFAULT_NODE_ICON = 'Circle';
export const DEFAULT_NODE_LABEL = 'Sin tipo';

export const EDGE_COLORS: Record<EdgeType, string> = {
  CONTACT: '#3b82f6',
  TRANSACTION: '#10b981',
  KINSHIP: '#f59e0b',
  ASSOCIATE: '#8b5cf6',
  OWNERSHIP: '#06b6d4',
  LOCATION: '#ef4444',
  EMPLOYMENT: '#64748b',
  COMMUNICATION: '#ec4899',
  TEMPORAL: '#f97316',
  CUSTOM: '#a855f7',
};

export const EDGE_LABELS: Record<EdgeType, string> = {
  CONTACT: 'Contacto',
  TRANSACTION: 'Transacción',
  KINSHIP: 'Parentesco',
  ASSOCIATE: 'Asociación',
  OWNERSHIP: 'Propiedad',
  LOCATION: 'Ubicación',
  EMPLOYMENT: 'Empleo',
  COMMUNICATION: 'Comunicación',
  TEMPORAL: 'Temporal',
  CUSTOM: 'Personalizado',
};

export const DASHED_EDGE_TYPES: EdgeType[] = ['ASSOCIATE', 'COMMUNICATION', 'TEMPORAL'];
