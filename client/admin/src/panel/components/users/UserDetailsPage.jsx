import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdmin } from '../../AdminContext';
import { UserDetailsSurface } from './UserDetailsSurface';

export function UserDetailsPage() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const { userId = '' } = useParams();

  useEffect(() => {
    if (admin.activeTab !== 'users' && admin.setActiveTab) {
      admin.setActiveTab('users');
    }
    if (userId && admin.viewUserDetails) {
      void admin.viewUserDetails({ id: userId });
    }

    return () => {
      if (admin.closeUserDetails) {
        admin.closeUserDetails();
      }
    };
  }, [admin, userId]);

  const handleBack = () => {
    if (admin.closeUserDetails) {
      admin.closeUserDetails();
    }
    navigate('/tufayel/panel?tab=users');
  };

  return (
    <div className="user-details-page-wrap">
      <UserDetailsSurface variant="page" onClose={handleBack} />
    </div>
  );
}
