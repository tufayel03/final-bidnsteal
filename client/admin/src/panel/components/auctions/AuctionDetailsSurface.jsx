import React from 'react';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';

function money(admin, value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return admin.currency ? admin.currency(value) : value;
}

function stamp(admin, value, fallback = 'Not set') {
  if (!value) return fallback;
  return admin.dateTime ? admin.dateTime(value) : value;
}

function bidder(admin, participant, fallback = '-') {
  if (!participant) return fallback;
  return admin.auctionBidderLabel ? admin.auctionBidderLabel(participant) : fallback;
}

function metric(icon, label, value, tone = '') {
  return { icon, label, value, tone };
}

export function AuctionDetailsSurface({ variant = 'modal', onClose }) {
  const admin = useAdmin();
  const { auctionDetailsModal = {} } = admin;
  const detail = auctionDetailsModal.detail;
  const draft = auctionDetailsModal.draft || {};
  const bids = Array.isArray(detail?.bids) ? detail.bids : [];
  const isPage = variant === 'page';
  const canEnd = detail?.status !== 'ended' && detail?.status !== 'cancelled';
  const canCancel = detail?.status === 'scheduled' || detail?.status === 'live';
  const canManageBids = detail?.status !== 'ended';
  const reserveMet = detail?.reservePrice !== null && detail?.reservePrice !== undefined && detail?.reservePriceReached;
  const reserveLabel = detail?.reservePrice !== null && detail?.reservePrice !== undefined
    ? reserveMet ? 'Reserve met' : 'Reserve open'
    : 'No reserve';

  const metrics = detail ? [
    metric('badge-dollar-sign', 'Current Bid', money(admin, detail.currentPrice), 'olive'),
    metric('banknote', 'Opening Bid', money(admin, detail.startingPrice), 'stone'),
    metric('shield-check', 'Reserve Price', detail.reservePrice !== null && detail.reservePrice !== undefined ? money(admin, detail.reservePrice) : 'No reserve', reserveMet ? 'sage' : 'sand'),
    metric('move-up-right', 'Bid Increment', money(admin, detail.minIncrement), 'ink'),
    metric('gavel', 'Total Bids', admin.number ? admin.number(detail.totalBids || 0) : String(detail.totalBids || 0), 'clay'),
    metric('clock-3', 'Time Left', admin.msToClock ? admin.msToClock(detail.timeLeftMs || 0) : '-', 'sand')
  ] : [];

  const handleDelete = async () => {
    if (!detail || !admin.deleteAuction) return;
    await admin.deleteAuction(detail);
    if (!admin.auctionDetailsModal?.detail && onClose) {
      onClose();
    }
  };

  return (
    <div
      className={isPage ? 'auction-details-page auction-details-surface' : 'admin-modal auction-details-surface'}
      style={isPage ? undefined : { maxWidth: '1360px' }}
    >
      <div className="admin-modal-head auction-details-head">
        <div className="auction-details-heading">
          <span className="auction-details-eyebrow">Auction Control</span>
          <h3 className="auction-details-title">Auction Details</h3>
          <p className="auction-details-subtitle">Inspect bid history, update pricing rules, and manage this auction lifecycle from one page.</p>
        </div>

        {isPage ? (
          <button onClick={onClose} className="secondary-btn auction-details-back-btn">
            <Icon name="arrow-left" className="w-4 h-4" />
            <span>Back to Auctions</span>
          </button>
        ) : (
          <button onClick={onClose} className="icon-btn">
            <Icon name="x" className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className={`admin-modal-body ${isPage ? 'auction-details-page-body' : 'custom-scrollbar'} auction-details-body`}>
        {auctionDetailsModal.loading ? (
          <div className="auction-details-empty">
            <Icon name="loader-circle" className="auction-details-empty-icon is-spinning" />
            <p>Loading auction details...</p>
          </div>
        ) : !detail ? (
          <div className="auction-details-empty">
            <Icon name="circle-alert" className="auction-details-empty-icon" />
            <p>Auction data is not available.</p>
          </div>
        ) : (
          <div className="auction-details-layout">
            <section className="auction-details-main">
              <div className="auction-details-summary">
                <div className="auction-details-summary__identity">
                  <div className="auction-details-summary__thumb">
                    {admin.mediaUrl && admin.mediaUrl(detail.product?.image || detail.productImage) ? (
                      <img src={admin.mediaUrl(detail.product?.image || detail.productImage)} alt="" />
                    ) : (
                      <Icon name="image" className="auction-details-summary__thumb-icon" />
                    )}
                  </div>

                  <div className="auction-details-summary__copy">
                    <div className="auction-details-summary__titlebar">
                      <h4>{detail.product?.title || detail.title || 'Untitled auction'}</h4>
                      <div className="auction-details-summary__badges">
                        <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(detail.status) : detail.status}`}>
                          {detail.status}
                        </span>
                        <span className={`auction-details-pill ${reserveMet ? 'is-success' : ''}`}>{reserveLabel}</span>
                      </div>
                    </div>
                    <p className="auction-details-summary__slug mono">{detail.product?.slug || detail.productSlug || detail.productId || detail.id}</p>
                    <div className="auction-details-summary__meta">
                      <span>
                        <Icon name="user-round" className="auction-details-inline-icon" />
                        Highest Bidder: <strong title={bidder(admin, detail.highestBid)}>{bidder(admin, detail.highestBid)}</strong>
                      </span>
                      <span>
                        <Icon name="trophy" className="auction-details-inline-icon" />
                        Winner: <strong title={bidder(admin, detail.winner)}>{bidder(admin, detail.winner)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="auction-details-summary__actions">
                  <button
                    onClick={() => admin.refreshAuctionDetails && admin.refreshAuctionDetails()}
                    disabled={auctionDetailsModal.loading}
                    className="secondary-btn"
                  >
                    <Icon name="refresh-cw" className="w-4 h-4" />
                    <span>{auctionDetailsModal.loading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                </div>
              </div>

              <div className="auction-details-metric-grid">
                {metrics.map((item) => (
                  <article key={item.label} className={`auction-details-metric-card ${item.tone ? `is-${item.tone}` : ''}`}>
                    <div className="auction-details-metric-card__icon">
                      <Icon name={item.icon} className="w-4 h-4" />
                    </div>
                    <div className="auction-details-metric-card__copy">
                      <span>{item.label}</span>
                      <strong className="mono">{item.value}</strong>
                    </div>
                  </article>
                ))}
              </div>

              <div className="auction-details-panel">
                <div className="auction-details-panel__head">
                  <div>
                    <h4>Schedule + Participation</h4>
                    <p>Keep the live window, bidder state, and lot reference in one place.</p>
                  </div>
                </div>

                <div className="auction-details-info-grid">
                  <div className="auction-details-info-card">
                    <span>Start At</span>
                    <strong>{stamp(admin, detail.startAt)}</strong>
                  </div>
                  <div className="auction-details-info-card">
                    <span>End At</span>
                    <strong>{stamp(admin, detail.endAt)}</strong>
                  </div>
                  <div className="auction-details-info-card">
                    <span>Last Bid</span>
                    <strong>{stamp(admin, detail.lastBidAt)}</strong>
                  </div>
                  <div className="auction-details-info-card">
                    <span>Product Slug</span>
                    <strong className="mono">{detail.product?.slug || detail.productSlug || '-'}</strong>
                  </div>
                  <div className="auction-details-info-card">
                    <span>Product ID</span>
                    <strong className="mono">{detail.productId || detail.product?._id || '-'}</strong>
                  </div>
                  <div className="auction-details-info-card">
                    <span>Status</span>
                    <strong>{detail.status || '-'}</strong>
                  </div>
                </div>
              </div>

              <div className="auction-details-panel auction-details-panel--timeline">
                <div className="auction-details-panel__head">
                  <div>
                    <h4>Bid Timeline</h4>
                    <p>{admin.number ? admin.number(bids.length) : bids.length} bid(s) recorded for this lot.</p>
                  </div>
                </div>

                {bids.length ? (
                  <div className="auction-details-table-wrap custom-scrollbar">
                    <table className="auction-details-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Bidder</th>
                          <th>Amount</th>
                          <th>Placed At</th>
                          <th className="auction-details-table__actions-head">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bids.map((bidItem, index) => (
                          <tr key={bidItem.id || bidItem._id || `${bidItem.createdAt}-${index}`}>
                            <td className="mono">{index + 1}</td>
                            <td title={bidder(admin, bidItem)}>{bidder(admin, bidItem)}</td>
                            <td className="mono">{money(admin, bidItem.amount)}</td>
                            <td className="mono">{stamp(admin, bidItem.createdAt)}</td>
                            <td className="auction-details-table__actions-cell">
                              {canManageBids ? (
                                <button
                                  type="button"
                                  onClick={() => admin.removeAuctionBid && admin.removeAuctionBid(bidItem)}
                                  disabled={
                                    auctionDetailsModal.loading ||
                                    auctionDetailsModal.saving ||
                                    Boolean(auctionDetailsModal.removingBidId) ||
                                    !String(bidItem.id || bidItem._id || '').trim()
                                  }
                                  className="auction-details-bid-action"
                                >
                                  <Icon name="trash-2" className="auction-icon-sm" />
                                  <span>{auctionDetailsModal.removingBidId === String(bidItem.id || bidItem._id || '') ? 'Removing...' : 'Remove'}</span>
                                </button>
                              ) : (
                                <span className="auction-details-bid-action-note">Locked</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="auction-details-empty auction-details-empty--inline">
                    <Icon name="gavel" className="auction-details-empty-icon" />
                    <p>No bids yet for this auction.</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="auction-details-side">
              <div className="auction-details-panel auction-details-panel--editor">
                <div className="auction-details-panel__head">
                  <div>
                    <h4>Edit Auction</h4>
                    <p>Update schedule, pricing, and status. Some fields may be limited once bidding has started.</p>
                  </div>
                </div>

                <div className="auction-details-form-grid">
                  <label className="auction-details-field">
                    <span>Status</span>
                    <select
                      value={draft.status || 'scheduled'}
                      onChange={(event) => { if (admin.auctionDetailsModal?.draft) admin.auctionDetailsModal.draft.status = event.target.value; }}
                      className="auction-soft-input"
                    >
                      <option value="scheduled">scheduled</option>
                      <option value="live">live</option>
                      <option value="ended">ended</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </label>

                  <label className="auction-details-field">
                    <span>Min Increment</span>
                    <input
                      type="number"
                      min="1"
                      value={draft.minIncrement ?? ''}
                      onChange={(event) => { if (admin.auctionDetailsModal?.draft) admin.auctionDetailsModal.draft.minIncrement = event.target.value; }}
                      className="auction-soft-input"
                    />
                  </label>

                  <label className="auction-details-field">
                    <span>Start At</span>
                    <input
                      type="datetime-local"
                      value={draft.startAt ?? ''}
                      onChange={(event) => { if (admin.auctionDetailsModal?.draft) admin.auctionDetailsModal.draft.startAt = event.target.value; }}
                      className="auction-soft-input"
                    />
                  </label>

                  <label className="auction-details-field">
                    <span>End At</span>
                    <input
                      type="datetime-local"
                      value={draft.endAt ?? ''}
                      onChange={(event) => { if (admin.auctionDetailsModal?.draft) admin.auctionDetailsModal.draft.endAt = event.target.value; }}
                      className="auction-soft-input"
                    />
                  </label>

                  <label className="auction-details-field">
                    <span>Starting Price</span>
                    <input
                      type="number"
                      min="0"
                      value={draft.startingPrice ?? ''}
                      onChange={(event) => { if (admin.auctionDetailsModal?.draft) admin.auctionDetailsModal.draft.startingPrice = event.target.value; }}
                      className="auction-soft-input"
                    />
                  </label>

                  <label className="auction-details-field">
                    <span>Reserve Price</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Leave empty to remove"
                      value={draft.reservePrice ?? ''}
                      onChange={(event) => { if (admin.auctionDetailsModal?.draft) admin.auctionDetailsModal.draft.reservePrice = event.target.value; }}
                      className="auction-soft-input"
                    />
                  </label>
                </div>
              </div>

              <div className="auction-details-panel auction-details-panel--actions">
                <div className="auction-details-panel__head">
                  <div>
                    <h4>Quick Actions</h4>
                    <p>Use these for lifecycle changes without leaving the lot.</p>
                  </div>
                </div>

                <div className="auction-details-action-stack">
                  {canEnd ? (
                    <button
                      onClick={() => admin.updateAuctionStatusQuick && admin.updateAuctionStatusQuick(detail, 'ended')}
                      className="auction-manage-btn"
                    >
                      <Icon name="flag" className="auction-icon-sm" />
                      <span>End Auction Now</span>
                    </button>
                  ) : null}

                  {canCancel ? (
                    <button
                      onClick={() => admin.updateAuctionStatusQuick && admin.updateAuctionStatusQuick(detail, 'cancelled')}
                      className="auction-manage-btn is-danger"
                    >
                      <Icon name="ban" className="auction-icon-sm" />
                      <span>Cancel Auction</span>
                    </button>
                  ) : null}

                  <button
                    onClick={handleDelete}
                    disabled={auctionDetailsModal.saving || auctionDetailsModal.loading}
                    className="auction-manage-btn is-danger is-ghost"
                  >
                    <Icon name="trash-2" className="auction-icon-sm" />
                    <span>Delete Auction</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      <div className="admin-modal-foot auction-details-foot">
        <button onClick={onClose} className="secondary-btn">
          {isPage ? 'Back to Auctions' : 'Close'}
        </button>
        <button
          onClick={() => admin.saveAuctionDetails && admin.saveAuctionDetails()}
          disabled={auctionDetailsModal.loading || auctionDetailsModal.saving}
          className="primary-btn"
        >
          {auctionDetailsModal.saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
