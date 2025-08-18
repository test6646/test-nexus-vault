// Professional Status Color System
// Provides consistent colors across all components

export const getStatusColors = (status: string, type: 'text' | 'background' | 'border' = 'text') => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-');
  
  const statusMap: Record<string, { text: string; background: string; border: string }> = {
    // Task & General Status
    'completed': {
      text: 'text-status-completed',
      background: 'bg-status-completed-bg',
      border: 'border-status-completed-border'
    },
    'in-progress': {
      text: 'text-status-in-progress',
      background: 'bg-status-in-progress-bg',
      border: 'border-status-in-progress-border'
    },
    'active': {
      text: 'text-status-active',
      background: 'bg-status-active-bg',
      border: 'border-status-active-border'
    },
    'pending': {
      text: 'text-status-pending',
      background: 'bg-status-pending-bg',
      border: 'border-status-pending-border'
    },
    'waiting-for-response': {
      text: 'text-status-pending',
      background: 'bg-status-pending-bg',
      border: 'border-status-pending-border'
    },
    'cancelled': {
      text: 'text-status-cancelled',
      background: 'bg-status-cancelled-bg',
      border: 'border-status-cancelled-border'
    },
    'draft': {
      text: 'text-status-draft',
      background: 'bg-status-draft-bg',
      border: 'border-status-draft-border'
    },
    'expired': {
      text: 'text-status-expired',
      background: 'bg-status-expired-bg',
      border: 'border-status-expired-border'
    },
    'confirmed': {
      text: 'text-status-confirmed',
      background: 'bg-status-confirmed-bg',
      border: 'border-status-confirmed-border'
    },
    'upcoming': {
      text: 'text-status-pending',
      background: 'bg-status-pending-bg',
      border: 'border-status-pending-border'
    }
  };

  return statusMap[normalizedStatus]?.[type] || 'text-muted-foreground';
};

export const getCategoryColors = (category: string, type: 'text' | 'background' = 'text') => {
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '-');
  
  const categoryMap: Record<string, { text: string; background: string }> = {
    'equipment': {
      text: 'text-category-equipment',
      background: 'bg-category-equipment-bg'
    },
    'travel': {
      text: 'text-category-travel',
      background: 'bg-category-travel-bg'
    },
    'accommodation': {
      text: 'text-category-accommodation',
      background: 'bg-category-accommodation-bg'
    },
    'food': {
      text: 'text-category-food',
      background: 'bg-category-food-bg'
    },
    'marketing': {
      text: 'text-category-marketing',
      background: 'bg-category-marketing-bg'
    },
    'software': {
      text: 'text-category-software',
      background: 'bg-category-software-bg'
    },
    'maintenance': {
      text: 'text-category-maintenance',
      background: 'bg-category-maintenance-bg'
    },
    'salary': {
      text: 'text-category-salary',
      background: 'bg-category-salary-bg'
    },
    'other': {
      text: 'text-category-other',
      background: 'bg-category-other-bg'
    }
  };

  return categoryMap[normalizedCategory]?.[type] || 'text-category-other';
};

export const getEventTypeColors = (eventType: string, type: 'text' | 'background' = 'text') => {
  const normalizedType = eventType.toLowerCase().replace(/\s+/g, '-');
  
  const eventTypeMap: Record<string, { text: string; background: string }> = {
    'wedding': {
      text: 'text-wedding-color',
      background: 'bg-wedding-bg'
    },
    'pre-wedding': {
      text: 'text-pre-wedding-color',
      background: 'bg-pre-wedding-bg'
    },
    'ring-ceremony': {
      text: 'text-ring-ceremony-color',
      background: 'bg-ring-ceremony-bg'
    },
    'maternity': {
      text: 'text-maternity-color',
      background: 'bg-maternity-bg'
    },
    'maternity-photography': {
      text: 'text-maternity-color',
      background: 'bg-maternity-bg'
    },
    'others': {
      text: 'text-others-color',
      background: 'bg-others-bg'
    }
  };

  return eventTypeMap[normalizedType]?.[type] || (type === 'text' ? 'text-primary' : 'bg-muted');
};

export const getFreelancerRoleColors = (role: string) => {
  const normalizedRole = role.toLowerCase().replace(/\s+/g, '-');
  const roleMap: Record<string, string> = {
    'photographer': 'text-blue-600',
    'videographer': 'text-purple-600',
    'cinematographer': 'text-purple-600',
    'editor': 'text-cyan-400',
    'assistant': 'text-gray-600',
    'drone-operator': 'text-teal-600',
    'drone-pilot': 'text-teal-600',
    'other': 'text-orange-600',
    'others': 'text-orange-600'
  };

  return roleMap[normalizedRole] || 'text-orange-600';
};

export const getFreelancerRoleBgColors = (role: string) => {
  const roleMap: Record<string, string> = {
    'photographer': 'bg-role-photographer-bg',
    'videographer': 'bg-role-videographer-bg',
    'editor': 'bg-role-editor-bg',
    'assistant': 'bg-role-assistant-bg',
    'drone-operator': 'bg-role-drone-operator-bg',
    'other': 'bg-role-other-bg'
  };

  return roleMap[role.toLowerCase().replace(/\s+/g, '-')] || 'bg-muted';
};