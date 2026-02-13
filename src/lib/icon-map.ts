import {
  UserRound, Building2, Car, Smartphone, MapPin,
  Landmark, Globe, FileText, Calendar, Circle,
  Shield, Star, Heart, Flag, Briefcase,
  Key, Package, Wifi, CreditCard, MapPinned,
} from 'lucide-react';

export const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  UserRound, Building2, Car, Smartphone, MapPin,
  Landmark, Globe, FileText, Calendar, Circle,
  Shield, Star, Heart, Flag, Briefcase,
  Key, Package, Wifi, CreditCard, MapPinned,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export function getIconComponent(name: string) {
  return ICON_MAP[name] || Circle;
}
