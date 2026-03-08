import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAdmin } from '../../AdminContext';
import { AuctionDetailsSurface } from './AuctionDetailsSurface';

export function AuctionDetailsPage() {
  const admin = useAdmin();
  const navigate = useNavigate();
  const { auctionId = '' } = useParams();

  useEffect(() => {
    if (admin.activeTab !== 'auctions' && admin.setActiveTab) {
      admin.setActiveTab('auctions');
    }
    if (auctionId && admin.openAuctionDetails) {
      void admin.openAuctionDetails({ id: auctionId });
    }

    return () => {
      if (admin.closeAuctionDetails) {
        admin.closeAuctionDetails();
      }
    };
  }, [admin, auctionId]);

  const handleBack = () => {
    if (admin.closeAuctionDetails) {
      admin.closeAuctionDetails();
    }
    navigate('/tufayel/panel?tab=auctions');
  };

  return (
    <div className="auction-details-page-wrap">
      <AuctionDetailsSurface variant="page" onClose={handleBack} />
    </div>
  );
}
