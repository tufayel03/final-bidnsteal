import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../AdminContext';
import { OrderDetailsSurface } from './OrderDetailsSurface';

export function OrderCreatePage() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const createdOrderId = String(admin.orderDetailsModal?.order?.id || '').trim();
  const isCreateMode = admin.orderDetailsModal?.mode === 'create';

  useEffect(() => {
    if (admin.activeTab !== 'orders' && admin.setActiveTab) {
      admin.setActiveTab('orders');
    }
    if (admin.openOrderCreate) {
      void admin.openOrderCreate();
    }

    return () => {
      if (admin.closeOrderDetails) {
        admin.closeOrderDetails();
      }
    };
  }, [admin]);

  useEffect(() => {
    if (isCreateMode || !createdOrderId) return;
    navigate(`/tufayel/panel/orders/${createdOrderId}`, { replace: true });
  }, [createdOrderId, isCreateMode, navigate]);

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
