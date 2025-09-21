import React from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import SalaryManagementWithFilters from '@/components/salary/SalaryManagementWithFilters';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';

const Salary = () => {
  return (
    <TopNavbar>
      <FirmRequiredWrapper>
        <SalaryManagementWithFilters />
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Salary;