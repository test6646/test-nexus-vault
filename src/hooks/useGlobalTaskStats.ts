import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskFromDB, convertDbTaskToTask } from '@/types/studio';

export const useGlobalTaskStats = () => {
  const { currentFirmId, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'Admin';
  const staffProfileId = profile?.id;

  useEffect(() => {
    if (!currentFirmId && !staffProfileId) return;

    fetchGlobalTasks();

    // Set up real-time listener for task stats
    const channelFilter = isAdmin && currentFirmId
      ? `firm_id=eq.${currentFirmId}`
      : staffProfileId
        ? `assigned_to=eq.${staffProfileId}`
        : undefined;

    const tasksChannel = channelFilter
      ? supabase
          .channel('global-tasks-stats')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'tasks',
            filter: channelFilter,
          }, () => {
            fetchGlobalTasks();
          })
          .subscribe()
      : null;

    return () => {
      if (tasksChannel) supabase.removeChannel(tasksChannel);
    };
  }, [currentFirmId, staffProfileId, isAdmin]);

  const fetchGlobalTasks = async () => {
    // Admin: all firm tasks; Staff: only their assigned tasks
    try {
      setLoading(true);

      let query = supabase.from('tasks').select('*');

      if (isAdmin && currentFirmId) {
        query = query.eq('firm_id', currentFirmId);
      } else if (staffProfileId) {
        query = query.eq('assigned_to', staffProfileId);
      } else {
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const convertedTasks = (data || []).map((task: TaskFromDB) => convertDbTaskToTask(task));
      setTasks(convertedTasks);
    } catch (error) {
      console.error('Error fetching global task stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { tasks, loading };
};