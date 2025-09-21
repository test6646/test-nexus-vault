import React from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';
import FirmManagement from '@/components/profile/FirmManagement';
import ProfileEditor from '@/components/profile/ProfileEditor';

const Profile = () => {
  return (
    <TopNavbar>
      <FirmRequiredWrapper>
        <div className="space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile Settings</h1>
          
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Profile Editor */}
            <div className="lg:col-span-1">
              <ProfileEditor />
            </div>
            
            {/* Firm Management */}
            <div className="lg:col-span-1">
              <FirmManagement />
            </div>
          </div>
        </div>
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Profile;