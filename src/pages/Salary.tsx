import React from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import SalaryManagement from '@/components/salary/SalaryManagement';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';

const Salary = () => {
  return (
    <TopNavbar>
      <FirmRequiredWrapper>
        <SalaryManagement />
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Salary;