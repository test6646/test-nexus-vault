import { UserRole } from '@/types/studio';

// Valid roles from database enum  
export const VALID_ROLES: UserRole[] = [
  'Admin',
  'Photographer', 
  'Cinematographer',
  'Editor',
  'Drone Pilot',
  'Other'
];

// Role display mapping for consistent UI
export const ROLE_DISPLAY_MAP: Record<string, UserRole> = {
  'admin': 'Admin',
  'photographer': 'Photographer',
  'cinematographer': 'Cinematographer',
  'videographer': 'Cinematographer', // Map videographer to cinematographer
  'video editor': 'Editor',
  'photo editor': 'Editor',
  'editor': 'Editor',
  'drone pilot': 'Drone Pilot',
  'drone operator': 'Drone Pilot',
  'assistant': 'Other',
  'other': 'Other'
};

export const displayRole = (role?: string | null): UserRole => {
  if (!role) return 'Other';
  const normalized = role.toLowerCase().trim();
  return ROLE_DISPLAY_MAP[normalized] || (VALID_ROLES.includes(role as UserRole) ? role as UserRole : 'Other');
};

// Get role options for dropdowns
export const getRoleOptions = (includeAdmin: boolean = false) => {
  const roles = includeAdmin ? VALID_ROLES : VALID_ROLES.filter(role => role !== 'Admin');
  return roles.map(role => ({ value: role, label: role }));
};
