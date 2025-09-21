import React from 'react';
import TaskManagementCore from './TaskManagementCore';

export const TaskManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Tasks
        </h1>
      </div>

      <TaskManagementCore />
    </div>
  );
};