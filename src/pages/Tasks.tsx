
import { useAuth } from '@/components/auth/AuthProvider';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';
import TopNavbar from '@/components/layout/TopNavbar';
import TaskManagementCore from '@/components/tasks/TaskManagementCore';

const Tasks = () => {
  const { profile } = useAuth();

  return (
    <TopNavbar>
      <FirmRequiredWrapper>
        <TaskManagementCore />
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Tasks;
