import React from 'react';
import { useAdmin } from '../AdminContext';
import { Icon } from '../components/Icon';

export function AuctionsTab() {
    const admin = useAdmin();
    const { auctionFilters, localSettings, auctionCards = [] } = admin;

    const filtered = admin.filteredAuctionCards ? admin.filteredAuctionCards() : [];

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div className="admin-tab-header">
                <div>
                    <h2>Auction Management</h2>
                    <p>Edit schedule, monitor bids, and control auction lifecycle.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => admin.loadAuctions && admin.loadAuctions(true)} className="order-filter-btn">Reload</button>
                    <button onClick={() => admin.openAuctionCreate && admin.openAuctionCreate()} className="order-filter-btn primary">Create Auction</button>
                </div>
            </div>

            <div className="order-panel">
                <input
                    value={auctionFilters.search || ''}
                    onChange={(e) => { admin.auctionFilters.search = e.target.value; }}
                    type="text"
                    placeholder="Search title, slug, winner..."
                    className="admin-search-input"
                />
                <select
                    value={auctionFilters.status || ''}
                    onChange={(e) => { admin.auctionFilters.status = e.target.value; }}
                    className="order-filter-select"
                    style={{ flex: '0 1 auto' }}
                >
                    <option value="">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="ended">Ended</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="order-selection-meta">
                        Showing <span className="mono">{admin.number ? admin.number(filtered.length) : 0}</span>
                        {' / '}
                        <span className="mono">{admin.number ? admin.number(auctionCards.length) : 0}</span>
                    </div>
                    <div className="admin-soft-segment">
                        <button
                            onClick={() => admin.setAuctionView && admin.setAuctionView('grid')}
                            className={`admin-soft-segment-btn${localSettings.auctionView === 'grid' ? ' is-active' : ''}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => admin.setAuctionView && admin.setAuctionView('column')}
                            className={`admin-soft-segment-btn${localSettings.auctionView === 'column' ? ' is-active' : ''}`}
                        >
                            Column
                        </button>
                    </div>
                </div>
            </div>

            {localSettings.auctionView !== 'column' && (
                <div className="auction-grid-list">
                    {filtered.map((auction) => (
                        <div key={auction.id || auction.productId} className="admin-card no-pad auction-grid-card">
                            <div className="auction-grid-card__rail"></div>
                            <div className="auction-grid-card__head">
                                <div className="auction-grid-card__identity">
                                    <div className="admin-soft-thumb auction-grid-card__thumb">
                                        {admin.mediaUrl && admin.mediaUrl(auction.productImage) && (
                                            <img src={admin.mediaUrl(auction.productImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        )}
                                    </div>
                                    <div className="auction-grid-card__copy">
                                        <h3 className="auction-grid-card__title">{auction.title}</h3>
                                        <p className="mono auction-grid-card__slug">{auction.productSlug || auction.productId}</p>
                                    </div>
                                </div>
                                <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(auction.status) : auction.status}`}>{auction.status}</span>
                            </div>

                            <div className="auction-grid-card__stats">
                                <div className="auction-grid-card__stat">
                                    <p className="auction-grid-card__stat-label">Current</p>
                                    <p className="mono auction-grid-card__stat-value">{admin.currency ? admin.currency(auction.currentPrice) : ''}</p>
                                </div>
                                <div className="auction-grid-card__stat">
                                    <p className="auction-grid-card__stat-label">Starting</p>
                                    <p className="mono auction-grid-card__stat-value">{admin.currency ? admin.currency(auction.startingPrice) : ''}</p>
                                </div>
                                <div className="auction-grid-card__stat">
                                    <p className="auction-grid-card__stat-label">Reserve</p>
                                    <p className="mono auction-grid-card__stat-value">{auction.reservePrice !== null ? (admin.currency ? admin.currency(auction.reservePrice) : '') : '-'}</p>
                                </div>
                                <div className="auction-grid-card__stat">
                                    <p className="auction-grid-card__stat-label">Min Increment</p>
                                    <p className="mono auction-grid-card__stat-value">{admin.currency ? admin.currency(auction.minIncrement) : ''}</p>
                                </div>
                            </div>

                            <div className="auction-grid-card__meta">
                                <div className="auction-grid-card__meta-row">
                                    <span>Bids</span>
                                    <span className="mono">{admin.number ? admin.number(auction.totalBids) : ''}</span>
                                </div>
                                <div className="auction-grid-card__meta-row">
                                    <span>Highest Bidder</span>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%', textAlign: 'right' }} title={admin.auctionBidderLabel ? admin.auctionBidderLabel(auction.highestBid) : ''}>
                                        {admin.auctionBidderLabel ? admin.auctionBidderLabel(auction.highestBid) : ''}
                                    </span>
                                </div>
                                <div className="auction-grid-card__meta-row">
                                    <span>Winner</span>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%', textAlign: 'right' }} title={admin.auctionBidderLabel ? admin.auctionBidderLabel(auction.winner) : ''}>
                                        {admin.auctionBidderLabel ? admin.auctionBidderLabel(auction.winner) : ''}
                                    </span>
                                </div>
                                <div className="auction-grid-card__meta-row">
                                    <span>Start</span>
                                    <span className="mono">{admin.dateTime ? admin.dateTime(auction.startAt) : ''}</span>
                                </div>
                                <div className="auction-grid-card__meta-row">
                                    <span>End</span>
                                    <span className="mono">{admin.dateTime ? admin.dateTime(auction.endAt) : ''}</span>
                                </div>
                                <div className="auction-grid-card__meta-row is-alert">
                                    <span>Time Left</span>
                                    <span className="mono">{auction.timeLeftText}</span>
                                </div>
                            </div>

                            <div className="auction-grid-card__actions">
                                <button onClick={() => admin.openAuctionDetails && admin.openAuctionDetails(auction)} className="order-filter-btn">Details</button>
                                <button onClick={() => admin.openAuctionDetails && admin.openAuctionDetails(auction)} className="order-filter-btn primary">Edit</button>
                                {auction.status !== 'ended' && auction.status !== 'cancelled' && (
                                    <button onClick={() => admin.updateAuctionStatusQuick && admin.updateAuctionStatusQuick(auction, 'ended')} className="order-filter-btn danger">End Now</button>
                                )}
                                {(auction.status === 'scheduled' || auction.status === 'live') && (
                                    <button onClick={() => admin.updateAuctionStatusQuick && admin.updateAuctionStatusQuick(auction, 'cancelled')} className="order-filter-btn danger">Cancel</button>
                                )}
                                <button onClick={() => admin.deleteAuction && admin.deleteAuction(auction)} className="order-filter-btn danger">Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {localSettings.auctionView === 'column' && (
                <div className="auction-column-list">
                    {filtered.map((auction) => {
                        const highestBidder = admin.auctionBidderLabel ? admin.auctionBidderLabel(auction.highestBid) : '-';
                        const winnerLabel = admin.auctionBidderLabel ? admin.auctionBidderLabel(auction.winner) : '-';
                        const canMutate = auction.status !== 'ended' && auction.status !== 'cancelled';

                        return (
                            <div key={'column-' + (auction.id || auction.productId)} className="admin-card no-pad auction-column-row">
                                <div className="auction-column-identity">
                                    <div className="auction-column-thumb">
                                        {admin.mediaUrl && admin.mediaUrl(auction.productImage) ? (
                                            <img src={admin.mediaUrl(auction.productImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Icon name="image" className="auction-icon" />
                                        )}
                                    </div>

                                    <div className="auction-column-copy">
                                        <div className="auction-column-titlebar">
                                            <h3 className="auction-column-title">{auction.title}</h3>
                                            <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(auction.status) : auction.status}`}>{auction.status}</span>
                                        </div>

                                        <p className="auction-column-slug mono">{auction.productSlug || auction.productId}</p>

                                        <div className="auction-column-meta">
                                            <span className="auction-column-meta-item">
                                                <Icon name="gavel" className="auction-icon-sm" />
                                                <strong className="mono">{admin.number ? admin.number(auction.totalBids) : 0}</strong>
                                                <span>Bids</span>
                                            </span>
                                            <span className="auction-column-meta-item" title={highestBidder}>
                                                <Icon name="user" className="auction-icon-sm" />
                                                <span>{highestBidder}</span>
                                            </span>
                                            <span className="auction-column-meta-item" title={winnerLabel}>
                                                <Icon name="trophy" className="auction-icon-sm" />
                                                <span>{winnerLabel}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="auction-column-stats">
                                    <div className="auction-stat-chip">
                                        <span className="auction-stat-chip-head">
                                            <Icon name="dollar-sign" className="auction-icon-sm" />
                                            Current
                                        </span>
                                        <strong className="auction-stat-chip-value mono">{admin.currency ? admin.currency(auction.currentPrice) : ''}</strong>
                                    </div>
                                    <div className="auction-stat-chip">
                                        <span className="auction-stat-chip-head">
                                            <Icon name="tag" className="auction-icon-sm" />
                                            Start
                                        </span>
                                        <strong className="auction-stat-chip-value mono">{admin.currency ? admin.currency(auction.startingPrice) : ''}</strong>
                                    </div>
                                    <div className="auction-stat-chip">
                                        <span className="auction-stat-chip-head">
                                            <Icon name="shield" className="auction-icon-sm" />
                                            Reserve
                                        </span>
                                        <strong className="auction-stat-chip-value mono">{auction.reservePrice !== null ? (admin.currency ? admin.currency(auction.reservePrice) : '') : '-'}</strong>
                                    </div>
                                    <div className="auction-stat-chip">
                                        <span className="auction-stat-chip-head">
                                            <Icon name="trending-up" className="auction-icon-sm" />
                                            Increment
                                        </span>
                                        <strong className="auction-stat-chip-value mono">{admin.currency ? admin.currency(auction.minIncrement) : ''}</strong>
                                    </div>
                                    <div className="auction-stat-chip">
                                        <span className="auction-stat-chip-head">
                                            <Icon name="clock-3" className="auction-icon-sm" />
                                            Time Left
                                        </span>
                                        <strong className="auction-stat-chip-value mono auction-stat-chip-time">{auction.timeLeftText}</strong>
                                    </div>
                                </div>

                                <div className="auction-column-actions">
                                    <button
                                        onClick={() => admin.openAuctionDetails && admin.openAuctionDetails(auction)}
                                        className="order-icon-btn"
                                        title="Details"
                                        aria-label="Auction details"
                                    >
                                        <Icon name="eye" className="auction-icon" />
                                    </button>
                                    <button
                                        onClick={() => admin.openAuctionDetails && admin.openAuctionDetails(auction)}
                                        className="order-icon-btn primary"
                                        title="Edit auction"
                                        aria-label="Edit auction"
                                    >
                                        <Icon name="square-pen" className="auction-icon" />
                                    </button>
                                    {canMutate && (
                                        <button
                                            onClick={() => admin.updateAuctionStatusQuick && admin.updateAuctionStatusQuick(auction, 'ended')}
                                            className="order-icon-btn"
                                            title="End now"
                                            aria-label="End auction now"
                                        >
                                            <Icon name="flag" className="auction-icon" />
                                        </button>
                                    )}
                                    {(auction.status === 'scheduled' || auction.status === 'live') && (
                                        <button
                                            onClick={() => admin.updateAuctionStatusQuick && admin.updateAuctionStatusQuick(auction, 'cancelled')}
                                            className="order-icon-btn danger"
                                            title="Cancel auction"
                                            aria-label="Cancel auction"
                                        >
                                            <Icon name="ban" className="auction-icon" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => admin.deleteAuction && admin.deleteAuction(auction)}
                                        className="order-icon-btn danger"
                                        title="Delete auction"
                                        aria-label="Delete auction"
                                    >
                                        <Icon name="trash-2" className="auction-icon" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {auctionCards.length > 0 && filtered.length === 0 && <div style={{ color: '#8fa0be', fontSize: '14px' }}>No auctions match current filters.</div>}
            {auctionCards.length === 0 && <div style={{ color: '#8fa0be', fontSize: '14px' }}>No auction data found.</div>}
        </div>
    );
}
