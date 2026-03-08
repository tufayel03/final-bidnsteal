import React from 'react';
import { useMatch } from 'react-router-dom';
import { useAdmin } from '../../AdminContext';
import { UserDetailsSurface } from '../users/UserDetailsSurface';
import { AdminModalPortal } from './AdminModalPortal';

export function UserModal() {
  const admin = useAdmin();
  const isUserDetailsRoute = Boolean(useMatch('/tufayel/panel/users/:userId'));
  const shouldShow = Boolean(admin.selectedUserDetails || admin.userDetailsLoading);

  if (!shouldShow || isUserDetailsRoute) {
    return null;
  }

  return (
    <AdminModalPortal>
      <div
        className="admin-modal-overlay user-details-overlay"
        style={{ justifyContent: 'flex-end', padding: 0, zIndex: 1050 }}
        onClick={(event) => event.target === event.currentTarget && admin.closeUserDetails && admin.closeUserDetails()}
      >
        <UserDetailsSurface variant="modal" onClose={() => admin.closeUserDetails && admin.closeUserDetails()} />
      </div>
    </AdminModalPortal>
  );
}
