import { useState, useMemo } from 'react';
import { Event, Client, Task } from '@/types/studio';

// Generic search and filter hook that can be used for any data type
export const useSearchAndFilters = <T>(
  data: T[],
  searchFields: (keyof T)[],
  filterFunctions: Record<string, (item: T) => boolean> = {}
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchTerm.toLowerCase());
          }
          if (typeof value === 'number') {
            return value.toString().includes(searchTerm);
          }
          return false;
        })
      );
    }

    // Apply active filters
    activeFilters.forEach(filterKey => {
      const filterFunction = filterFunctions[filterKey];
      if (filterFunction) {
        filtered = filtered.filter(filterFunction);
      }
    });

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (aValue === bValue) return 0;
        
        const result = aValue > bValue ? 1 : -1;
        return sortOrder === 'desc' ? -result : result;
      });
    }

    return filtered;
  }, [data, searchTerm, activeFilters, sortBy, sortOrder, searchFields, filterFunctions]);

  return {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setActiveFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    filteredData: filteredAndSortedData,
    totalCount: data.length,
    filteredCount: filteredAndSortedData.length
  };
};

// Specific hooks for different data types with pre-configured search fields and filters
export const useEventFilters = (events: Event[]) => {
  const filterFunctions = {
    confirmed: (event: Event) => event.total_amount && event.total_amount > 0,
    completed: (event: Event) => new Date(event.event_date) <= new Date(),
    pending: (event: Event) => new Date(event.event_date) > new Date(),
    thisMonth: (event: Event) => {
      const eventDate = new Date(event.event_date);
      const now = new Date();
      return eventDate.getMonth() === now.getMonth() && 
             eventDate.getFullYear() === now.getFullYear();
    }
  };

  return useSearchAndFilters(
    events,
    ['title', 'client_id', 'venue', 'event_type'],
    filterFunctions
  );
};

export const useClientFilters = (clients: Client[]) => {
  const filterFunctions = {
    withEmail: (client: Client) => Boolean(client.email && client.email.trim()),
    withoutEmail: (client: Client) => !client.email || !client.email.trim(),
    withAddress: (client: Client) => Boolean(client.address && client.address.trim()),
    recent: (client: Client) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(client.created_at) > weekAgo;
    }
  };

  return useSearchAndFilters(
    clients,
    ['name', 'phone', 'email', 'address'],
    filterFunctions
  );
};

export const useTaskFilters = (tasks: Task[]) => {
  const filterFunctions = {
    completed: (task: Task) => task.status === 'Completed',
    pending: (task: Task) => task.status !== 'Completed',
    highPriority: (task: Task) => task.priority === 'High' || task.priority === 'Urgent',
    assigned: (task: Task) => Boolean(task.assigned_to || task.freelancer_id),
    unassigned: (task: Task) => !task.assigned_to && !task.freelancer_id
  };

  return useSearchAndFilters(
    tasks,
    ['title', 'description', 'task_type'],
    filterFunctions
  );
};