import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdmin } from '../../AdminContext';
import { OrderDetailsSurface } from './OrderDetailsSurface';

export function OrderDetailsPage() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const { orderId = '' } = useParams();

  useEffect(() => {
    if (admin.activeTab !== 'orders' && admin.setActiveTab) {
      admin.setActiveTab('orders');
    }
    if (orderId && admin.openOrderDetails) {
      void admin.openOrderDetails({ id: orderId });
    }

    return () => {
      if (admin.closeOrderDetails) {
        admin.closeOrderDetails();
      }
    };
  }, [admin, orderId]);

  const handleBack = () => {
    if (admin.closeOrderDetails) {
      admin.closeOrderDetails();
    }
    navigate('/tufayel/panel?tab=orders');
  };

  return (
    <div className="order-details-page-wrap">
      <OrderDetailsSurface variant="page" onClose={handleBack} />
    </div>
  );
}
