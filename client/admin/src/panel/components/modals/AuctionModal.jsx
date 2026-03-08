import React from 'react';
import { useMatch } from 'react-router-dom';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';
import { AuctionDetailsSurface } from '../auctions/AuctionDetailsSurface';
import { AdminModalPortal } from './AdminModalPortal';

export function AuctionModal() {
    const admin = useAdmin();
    const isAuctionDetailsRoute = Boolean(useMatch('/tufayel/panel/auctions/:auctionId'));
    const { auctionModal = {}, auctionDetailsModal = {}, inventory = [] } = admin;

    return (
        <>
            {/* Create Auction Modal */}
            {auctionModal.open && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay auction-soft-overlay" onClick={(e) => { if (e.target === e.currentTarget && admin.closeAuctionModal) admin.closeAuctionModal(); }}>
                        <div className="admin-modal auction-soft-modal" style={{ maxWidth: '600px' }}>
                            <div className="admin-modal-head">
                                <h3 className="auction-soft-title">
                                    <Icon name="gavel" className="w-5 h-5" />
                                    Create Auction
                                </h3>
                                <button onClick={() => admin.closeAuctionModal && admin.closeAuctionModal()} className="icon-btn">
                                    <Icon name="x" className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="admin-modal-body auction-soft-body space-y-4">
                            <select
                                value={auctionModal.form?.productId || ''}
                                onChange={(e) => { if (admin.auctionModal && admin.auctionModal.form) admin.auctionModal.form.productId = e.target.value; }}
                                className="auction-soft-input w-full"
                            >
                                <option value="">Select product</option>
                                {inventory.filter(p => p.mode !== 'Fixed').map(item => (
                                    <option key={item.sku || item.id} value={item.id}>{item.title}</option>
                                ))}
                            </select>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="datetime-local"
                                    value={auctionModal.form?.startAt || ''}
                                    onChange={(e) => { if (admin.auctionModal && admin.auctionModal.form) admin.auctionModal.form.startAt = e.target.value; }}
                                    className="auction-soft-input"
                                />
                                <input
                                    type="datetime-local"
                                    value={auctionModal.form?.endAt || ''}
                                    onChange={(e) => { if (admin.auctionModal && admin.auctionModal.form) admin.auctionModal.form.endAt = e.target.value; }}
                                    className="auction-soft-input"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <input
                                    type="number" min="0" placeholder="Starting"
                                    value={auctionModal.form?.startingPrice || ''}
                                    onChange={(e) => { if (admin.auctionModal && admin.auctionModal.form) admin.auctionModal.form.startingPrice = e.target.value; }}
                                    className="auction-soft-input"
                                />
                                <input
                                    type="number" min="0" placeholder="Reserve Price"
                                    value={auctionModal.form?.reservePrice || ''}
                                    onChange={(e) => { if (admin.auctionModal && admin.auctionModal.form) admin.auctionModal.form.reservePrice = e.target.value; }}
                                    className="auction-soft-input"
                                />
                                <input
                                    type="number" min="1" placeholder="Min Increment"
                                    value={auctionModal.form?.minIncrement || ''}
                                    onChange={(e) => { if (admin.auctionModal && admin.auctionModal.form) admin.auctionModal.form.minIncrement = e.target.value; }}
                                    className="auction-soft-input"
                                />
                            </div>
                            </div>

                            <div className="admin-modal-foot auction-soft-foot">
                                <button onClick={() => admin.closeAuctionModal && admin.closeAuctionModal()} className="auction-soft-btn auction-soft-btn--secondary">Cancel</button>
                                <button onClick={() => admin.saveAuctionModal && admin.saveAuctionModal()} className="auction-soft-btn auction-soft-btn--primary">
                                    {auctionModal.saving ? 'INITIATING OP...' : 'CREATE AUCTION'}
                                </button>
                            </div>
                        </div>
                    </div>
                </AdminModalPortal>
            )}

            {/* Auction Details Modal */}
            {auctionDetailsModal.open && !isAuctionDetailsRoute && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay auction-soft-overlay" onClick={(e) => { if (e.target === e.currentTarget && admin.closeAuctionDetails) admin.closeAuctionDetails(); }}>
                        <AuctionDetailsSurface variant="modal" onClose={() => admin.closeAuctionDetails && admin.closeAuctionDetails()} />
                    </div>
                </AdminModalPortal>
            )}
        </>
    );
}
