
import { useState, useCallback } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { Task } from '@/types/studio';
import { TaskFormDialog } from './TaskFormDialog';
import { useTaskExportConfig } from '@/hooks/useExportConfigs';
import { useTasks } from './hooks/useTasks';
import { TaskManagementHeader } from './TaskManagementHeader';
import { TaskStatsCards } from './TaskStatsCards';
import { TaskContent } from './TaskContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { UniversalFilterBar } from '@/components/common/UniversalFilterBar';
import { UniversalPagination } from '@/components/common/UniversalPagination';
import { useBackendFilters } from '@/hooks/useBackendFilters';
import { FILTER_CONFIGS } from '@/config/filter-configs';
import { useDeletionValidation } from '@/hooks/useDeletionValidation';
import { EnhancedWarningDialog } from '@/components/ui/enhanced-warning-dialog';

const TaskManagementCore = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [deletionValidation, setDeletionValidation] = useState<any>(null);
  const isMobile = useIsMobile();

  const {
    events,
    staffMembers,
    freelancers,
    loading: tasksHookLoading,
    isAdmin,
    updateTaskStatus,
    deleteTask
  } = useTasks();

  const { validateTaskDeletion } = useDeletionValidation();

  const filterState = useBackendFilters(FILTER_CONFIGS.tasks, {
    enableRealtime: true,
    pageSize: 50 // Standard UI pagination
  });
  const taskExportConfig = useTaskExportConfig(staffMembers);

  const handleTaskSuccess = useCallback(() => {
    filterState.refetch();
    setIsDialogOpen(false);
    setEditingTask(null);
  }, [filterState]);

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  }, []);

  const handleNewTask = useCallback(() => {
    setEditingTask(null);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (taskId: string) => {
    try {
      const validation = await validateTaskDeletion(taskId);
      setDeletionValidation(validation);
      setTaskToDelete(taskId);
      setDeletionDialogOpen(true);
    } catch (error) {
      console.error('Error validating task deletion:', error);
    }
  }, [validateTaskDeletion]);

  const handleConfirmDelete = useCallback(async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete);
      setDeletionDialogOpen(false);
      setTaskToDelete(null);
      setDeletionValidation(null);
      filterState.refetch();
    }
  }, [taskToDelete, deleteTask, filterState]);

  if (filterState.loading && !filterState.data.length) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <TaskManagementHeader
        isAdmin={isAdmin}
        hasData={filterState.data.length > 0}
        exportConfig={taskExportConfig}
        tasks={filterState.data}
        onCreateTask={handleNewTask}
      />

      <TaskStatsCards />

      {/* Universal Filter Bar */}
      <UniversalFilterBar
        searchValue={filterState.searchTerm}
        onSearchChange={filterState.setSearchTerm}
        onSearchApply={filterState.handleSearchApply}
        onSearchClear={filterState.handleSearchClear}
        isSearchActive={filterState.isSearchActive}
        searchPlaceholder="Search tasks..."
        
        sortBy={filterState.sortBy}
        sortOptions={FILTER_CONFIGS.tasks.sortOptions}
        onSortChange={filterState.setSortBy}
        sortOrder={filterState.sortOrder}
        onSortReverse={filterState.toggleSortOrder}
        
        activeFilters={filterState.activeFilters}
        filterOptions={FILTER_CONFIGS.tasks.filterOptions}
        onFiltersChange={filterState.setActiveFilters}
        
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        loading={filterState.loading}
      />

      <TaskContent
        tasks={filterState.data}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onStatusChange={filterState.refetch}
        onUpdateTaskStatus={updateTaskStatus}
        onCreateTask={handleNewTask}
        onDelete={handleDelete}
      />

      {/* Pagination Controls */}
      <UniversalPagination
        currentPage={filterState.currentPage}
        totalCount={filterState.totalCount}
        filteredCount={filterState.filteredCount}
        pageSize={filterState.pageSize}
        allDataLoaded={filterState.allDataLoaded}
        loading={filterState.loading}
        onLoadMore={filterState.loadMore}
        onPageSizeChange={filterState.setPageSize}
        showLoadMore={true}
      />

      {isAdmin && (
        <TaskFormDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTask(null);
            }
          }}
          onSuccess={handleTaskSuccess}
          editingTask={editingTask}
          events={events}
          staffMembers={staffMembers}
        />
      )}

      {/* Task Deletion Dialog */}
      <EnhancedWarningDialog
        open={deletionDialogOpen}
        onOpenChange={setDeletionDialogOpen}
        onConfirm={deletionValidation?.canDelete ? handleConfirmDelete : undefined}
        title={deletionValidation?.title || "Delete Task"}
        description={deletionValidation?.description || "Are you sure you want to delete this task?"}
        confirmText={deletionValidation?.canDelete ? "Delete Task" : "Cannot Delete"}
        cancelText="Cancel"
        variant={deletionValidation?.canDelete ? "error" : "warning"}
      />
    </div>
  );
};

export default TaskManagementCore;
