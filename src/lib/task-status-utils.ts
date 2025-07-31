
import { TaskStatus, TaskPriority, TaskType } from '@/types/studio';

export const TASK_STATUSES: TaskStatus[] = [
  'Pending',
  'In Progress', 
  'Completed',
  'On Hold',
  'Waiting for Response',
  'Accepted',
  'Declined'
];

export const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const TASK_TYPES: TaskType[] = ['Photo Editing', 'Video Editing', 'Other'];

export const getStatusColor = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
    'Completed': 'bg-green-100 text-green-800 border-green-200',
    'On Hold': 'bg-gray-100 text-gray-800 border-gray-200',
    'Waiting for Response': 'bg-orange-100 text-orange-800 border-orange-200',
    'Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Declined': 'bg-red-100 text-red-800 border-red-200'
  };
  
  return colorMap[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getPriorityColor = (priority: TaskPriority): string => {
  const colorMap: Record<TaskPriority, string> = {
    'Low': 'bg-green-100 text-green-800 border-green-200',
    'Medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'High': 'bg-orange-100 text-orange-800 border-orange-200',
    'Urgent': 'bg-red-100 text-red-800 border-red-200'
  };
  
  return colorMap[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getTaskTypeColor = (type: TaskType): string => {
  const colorMap: Record<TaskType, string> = {
    'Photo Editing': 'bg-purple-100 text-purple-800 border-purple-200',
    'Video Editing': 'bg-blue-100 text-blue-800 border-blue-200',
    'Other': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  
  return colorMap[type] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const getDefaultTaskStatus = (): TaskStatus => 'Pending';

export const isValidTaskStatus = (status: string): status is TaskStatus => {
  return TASK_STATUSES.includes(status as TaskStatus);
};

export const isValidTaskPriority = (priority: string): priority is TaskPriority => {
  return TASK_PRIORITIES.includes(priority as TaskPriority);
};

export const isValidTaskType = (type: string): type is TaskType => {
  return TASK_TYPES.includes(type as TaskType);
};

export const normalizeTaskStatus = (status: string): TaskStatus => {
  if (isValidTaskStatus(status)) {
    return status;
  }
  return getDefaultTaskStatus();
};

export const getNextValidStatus = (currentStatus: TaskStatus): TaskStatus[] => {
  const statusFlow: Record<TaskStatus, TaskStatus[]> = {
    'Pending': ['In Progress', 'Accepted', 'Declined', 'On Hold'],
    'In Progress': ['Completed', 'On Hold', 'Waiting for Response'],
    'Completed': ['In Progress'], // Allow reopening
    'On Hold': ['Pending', 'In Progress'],
    'Waiting for Response': ['In Progress', 'Completed', 'On Hold'],
    'Accepted': ['In Progress', 'Pending'],
    'Declined': ['Pending', 'In Progress']
  };
  
  return statusFlow[currentStatus] || [];
};
