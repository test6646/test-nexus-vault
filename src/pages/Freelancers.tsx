import React from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import FreelancerManagement from '@/components/freelancers/FreelancerManagement';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';

const Freelancers = () => {
  return (
    <TopNavbar>
      <FirmRequiredWrapper>
        <FreelancerManagement />
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Freelancers;