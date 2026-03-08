import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdmin } from '../../AdminContext';
import { ProductBuyersSurface } from './ProductBuyersSurface';

export function ProductBuyersPage() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const { productId = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState(null);

  const loadBuyerHistory = async () => {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const response = await admin.apiRequest(`/admin/products/${productId}/buyers`);
      setPayload(response);
    } catch (loadError) {
      setError(admin.errorMessage ? admin.errorMessage(loadError) : 'Failed to load buyer history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin.activeTab !== 'inventory' && admin.setActiveTab) {
      admin.setActiveTab('inventory');
    }
    void loadBuyerHistory();
  }, [productId]);

  const handleBack = () => {
    navigate('/tufayel/panel?tab=inventory');
  };

  return (
    <div className="product-buyers-page-wrap">
      <ProductBuyersSurface
        loading={loading}
        error={error}
        payload={payload}
        onRefresh={loadBuyerHistory}
        onClose={handleBack}
      />
    </div>
  );
}
