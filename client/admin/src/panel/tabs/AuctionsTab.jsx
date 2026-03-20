import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { Icon } from '../components/Icon';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';

function participantLabel(admin, participant) {
    if (!participant) return 'No participant';
    return admin.auctionBidderLabel ? admin.auctionBidderLabel(participant) : 'No participant';
}

function scheduleLabel(admin, value) {
    if (!value) return 'Not set';
    return admin.dateTime ? admin.dateTime(value) : value;
}

function amountLabel(admin, value) {
    return admin.currency ? admin.currency(value) : value;
}

function isPastAuction(auction) {
    const status = String(auction?.status || '').toLowerCase();
    return status === 'ended' || status === 'cancelled';
}

function renderActionButtons(admin, auction, onOpenDetails, compact = false) {
    const canEnd = auction.status !== 'ended' && auction.status !== 'cancelled';
    const canCancel = auction.status === 'scheduled' || auction.status === 'live';
    const className = compact ? 'auction-manage-actions auction-manage-actions--compact' : 'auction-manage-actions';

    return (
        <div className={className}>
            <button
                onClick={() => onOpenDetails(auction)}
                className="auction-manage-btn"
                title="Open auction details"
            >
                <Icon name="eye" className="auction-icon-sm" />
                <span>Details</span>
            </button>
            <button
                onClick={() => onOpenDetails(auction)}
                className="auction-manage-btn is-primary"
                title="Edit auction"
            >
                <Icon name="square-pen" className="auction-icon-sm" />
                <span>Edit</span>
            </button>
            {canEnd && (
                <button
                    onClick={() => admin.updateAuctionStatusQuick && admin.updateAuctionStatusQuick(auction, 'ended')}
                    className="auction-manage-btn"
                    title="End auction now"
                >
                    <Icon name="flag" className="auction-icon-sm" />
                    <span>End Now</span>
                </button>
            )}
            {canCancel && (
                <button
                    onClick={() => admin.updateAuctionStatusQuick && admin.updateAuctionStatusQuick(auction, 'cancelled')}
                    className="auction-manage-btn is-danger"
                    title="Cancel auction"
                >
                    <Icon name="ban" className="auction-icon-sm" />
                    <span>Cancel</span>
                </button>
            )}
            <button
                onClick={() => admin.deleteAuction && admin.deleteAuction(auction)}
                className="auction-manage-btn is-danger is-ghost"
                title="Delete auction"
            >
                <Icon name="trash-2" className="auction-icon-sm" />
                <span>Delete</span>
            </button>
        </div>
    );
}

export function AuctionsTab() {
    const admin = useAdmin();
    const navigate = useNavigate();
    const { auctionFilters, localSettings, auctionCards = [] } = admin;
    const scope = auctionFilters.scope === 'past' ? 'past' : 'active';
    const scopeLabel = scope === 'past' ? 'Past Auctions' : 'Active Auctions';
    const scopedAuctions = auctionCards.filter((auction) => (scope === 'past' ? isPastAuction(auction) : !isPastAuction(auction)));
    const filtered = admin.filteredAuctionCards ? admin.filteredAuctionCards() : [];
    const viewMode = localSettings.auctionView === 'grid' ? 'grid' : 'column';
    const statusOptions = scope === 'past'
        ? [
            { value: '', label: 'All Past' },
            { value: 'ended', label: 'Ended' },
            { value: 'cancelled', label: 'Cancelled' }
        ]
        : [
            { value: '', label: 'All Active' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'live', label: 'Live' }
        ];

    const liveCount = auctionCards.filter((auction) => auction.status === 'live').length;
    const scheduledCount = auctionCards.filter((auction) => auction.status === 'scheduled').length;
    const closingSoonCount = auctionCards.filter((auction) => auction.status === 'live' && Number(auction.timeLeftMs || 0) <= 1000 * 60 * 60 * 24).length;
    const reserveProtectedCount = auctionCards.filter((auction) => auction.reservePrice !== null).length;
    const endedCount = auctionCards.filter((auction) => auction.status === 'ended').length;
    const cancelledCount = auctionCards.filter((auction) => auction.status === 'cancelled').length;
    const archivedBidCount = scopedAuctions.reduce((total, auction) => total + Number(auction.totalBids || 0), 0);
    const scopedReserveCount = scopedAuctions.filter((auction) => auction.reservePrice !== null).length;

    const openDetailsPage = (auction) => {
        const auctionId = String(auction?.id || auction?._id || auction?.productSlug || auction?.productId || '').trim();
        if (!auctionId) {
            if (admin.notify) {
                admin.notify('Auction identifier missing.', 'error');
            }
            return;
        }

        navigate(`/tufayel/panel/auctions/${encodeURIComponent(auctionId)}`);
    };

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div className="admin-tab-header">
                <div>
                    <h2>Auction Management</h2>
                    <p>
                        {scope === 'past'
                            ? 'Browse ended and cancelled lots, inspect winners, and review historical bidding from one archive view.'
                            : 'Review live lots, scheduling, bidder activity, and lifecycle actions from one structured workspace.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => admin.loadAuctions && admin.loadAuctions(true)} className="order-filter-btn">Reload</button>
                </div>
            </div>

            <div className="admin-card auction-manage-scope-bar">
                <div className="auction-manage-scope-bar__copy">
                    <p className="auction-manage-scope-bar__eyebrow">Auction Views</p>
                    <h3>{scopeLabel}</h3>
                    <p>
                        {scope === 'past'
                            ? 'Past Auctions includes every ended and cancelled lot kept for admin review.'
                            : 'Active Auctions keeps scheduled and live lots together so you can manage the full upcoming queue.'}
                    </p>
                </div>

                <div className="admin-soft-segment">
                    <button
                        onClick={() => admin.setAuctionScope && admin.setAuctionScope('active')}
                        className={`admin-soft-segment-btn${scope === 'active' ? ' is-active' : ''}`}
                    >
                        Active Auctions
                    </button>
                    <button
                        onClick={() => admin.setAuctionScope && admin.setAuctionScope('past')}
                        className={`admin-soft-segment-btn${scope === 'past' ? ' is-active' : ''}`}
                    >
                        Past Auctions
                    </button>
                </div>
            </div>

            <div className="dashboard-stat-grid dashboard-stat-grid--primary">
                <DashboardStatCard
                    icon="gavel"
                    label={scopeLabel}
                    value={admin.number ? admin.number(scopedAuctions.length) : scopedAuctions.length}
                    meta={`${admin.number ? admin.number(filtered.length) : filtered.length} visible now`}
                    tone="stone"
                    featured
                />
                {scope === 'past' ? (
                    <>
                        <DashboardStatCard
                            icon="flag"
                            label="Ended"
                            value={admin.number ? admin.number(endedCount) : endedCount}
                            meta="Completed auctions"
                            tone="clay"
                            compact
                        />
                        <DashboardStatCard
                            icon="ban"
                            label="Cancelled"
                            value={admin.number ? admin.number(cancelledCount) : cancelledCount}
                            meta="Stopped before completion"
                            tone="sand"
                            compact
                        />
                        <DashboardStatCard
                            icon="shield-check"
                            label="Archived Bids"
                            value={admin.number ? admin.number(archivedBidCount) : archivedBidCount}
                            meta={`${admin.number ? admin.number(scopedReserveCount) : scopedReserveCount} reserve-backed lots`}
                            tone="sage"
                            compact
                        />
                    </>
                ) : (
                    <>
                        <DashboardStatCard
                            icon="flame"
                            label="Live Now"
                            value={admin.number ? admin.number(liveCount) : liveCount}
                            meta="Active bidding"
                            tone="olive"
                            compact
                        />
                        <DashboardStatCard
                            icon="calendar-range"
                            label="Scheduled"
                            value={admin.number ? admin.number(scheduledCount) : scheduledCount}
                            meta="Waiting to start"
                            tone="sand"
                            compact
                        />
                        <DashboardStatCard
                            icon="shield-check"
                            label="Reserve Protected"
                            value={admin.number ? admin.number(reserveProtectedCount) : reserveProtectedCount}
                            meta={`${admin.number ? admin.number(closingSoonCount) : closingSoonCount} closing within 24h`}
                            tone="sage"
                            compact
                        />
                    </>
                )}
            </div>

            <div className="admin-card auction-manage-toolbar">
                <div className="auction-manage-toolbar__filters">
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
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <button onClick={() => admin.loadAuctions && admin.loadAuctions(true)} className="order-filter-btn primary">Apply</button>
                </div>

                <div className="auction-manage-toolbar__aside">
                    <div className="auction-manage-toolbar__summary">
                        Showing <span className="mono">{admin.number ? admin.number(filtered.length) : 0}</span>
                        {' / '}
                        <span className="mono">{admin.number ? admin.number(scopedAuctions.length) : 0}</span>
                    </div>
                    <div className="admin-soft-segment">
                        <button
                            onClick={() => admin.setAuctionView && admin.setAuctionView('column')}
                            className={`admin-soft-segment-btn${viewMode === 'column' ? ' is-active' : ''}`}
                        >
                            Rows
                        </button>
                        <button
                            onClick={() => admin.setAuctionView && admin.setAuctionView('grid')}
                            className={`admin-soft-segment-btn${viewMode === 'grid' ? ' is-active' : ''}`}
                        >
                            Board
                        </button>
                    </div>
                </div>
            </div>

            {auctionCards.length > 0 && scopedAuctions.length === 0 && (
                <div className="admin-card auction-manage-empty">
                    {scope === 'past' ? 'No past auctions are available yet.' : 'No active auctions are available right now.'}
                </div>
            )}

            {scopedAuctions.length > 0 && filtered.length === 0 && (
                <div className="admin-card auction-manage-empty">
                    {scope === 'past' ? 'No past auctions match the current filters.' : 'No active auctions match the current filters.'}
                </div>
            )}

            {auctionCards.length === 0 && (
                <div className="admin-card auction-manage-empty">No auction data found.</div>
            )}

            {filtered.length > 0 && viewMode === 'column' && (
                <div className="auction-manage-list">
                    <div className="auction-manage-list__head">
                        <span>Lot</span>
                        <span>Schedule</span>
                        <span>Pricing</span>
                        <span>Bidders</span>
                        <span>Actions</span>
                    </div>
                    {filtered.map((auction) => {
                        const highestBidder = participantLabel(admin, auction.highestBid);
                        const winnerLabel = participantLabel(admin, auction.winner);
                        const reserveState = auction.reservePrice === null
                            ? 'No reserve'
                            : auction.reservePriceReached
                                ? 'Reserve met'
                                : 'Reserve open';

                        return (
                            <article key={`manage-${auction.id || auction.productId}`} className="admin-card auction-manage-row">
                                <div className="auction-manage-row__lot">
                                    <div className="auction-manage-card__thumb">
                                        {admin.mediaUrl && admin.mediaUrl(auction.productImage) ? (
                                            <img src={admin.mediaUrl(auction.productImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Icon name="image" className="auction-icon" />
                                        )}
                                    </div>
                                    <div className="auction-manage-row__lot-copy">
                                        <div className="auction-manage-card__titlebar">
                                            <h3 className="auction-manage-card__title">{auction.title}</h3>
                                            <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(auction.status) : auction.status}`}>{auction.status}</span>
                                        </div>
                                        <p className="auction-manage-card__slug mono">{auction.productSlug || auction.productId}</p>
                                        <div className="auction-manage-row__chips">
                                            <span className="auction-manage-chip">
                                                <Icon name="gavel" className="auction-icon-sm" />
                                                <strong className="mono">{admin.number ? admin.number(auction.totalBids) : 0}</strong>
                                                <span>Bids</span>
                                            </span>
                                            <span className={`auction-manage-chip ${auction.reservePriceReached ? 'is-positive' : ''}`}>
                                                <Icon name="shield-check" className="auction-icon-sm" />
                                                <span>{reserveState}</span>
                                            </span>
                                            <span className="auction-manage-chip">
                                                <Icon name="clock-3" className="auction-icon-sm" />
                                                <span>{auction.timeLeftText}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="auction-manage-row__section">
                                    <div className="auction-manage-info">
                                        <span>Start</span>
                                        <strong>{scheduleLabel(admin, auction.startAt)}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>End</span>
                                        <strong>{scheduleLabel(admin, auction.endAt)}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>Last Bid</span>
                                        <strong>{scheduleLabel(admin, auction.lastBidAt)}</strong>
                                    </div>
                                </div>

                                <div className="auction-manage-row__section auction-manage-row__section--pricing">
                                    <div className="auction-manage-info">
                                        <span>Current Bid</span>
                                        <strong className="mono">{amountLabel(admin, auction.currentPrice)}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>Start Price</span>
                                        <strong className="mono">{amountLabel(admin, auction.startingPrice)}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>Reserve Price</span>
                                        <strong className="mono">{auction.reservePrice !== null ? amountLabel(admin, auction.reservePrice) : '-'}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>Increment</span>
                                        <strong className="mono">{amountLabel(admin, auction.minIncrement)}</strong>
                                    </div>
                                </div>

                                <div className="auction-manage-row__section">
                                    <div className="auction-manage-info">
                                        <span>Highest Bidder</span>
                                        <strong title={highestBidder}>{highestBidder}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>Winner</span>
                                        <strong title={winnerLabel}>{winnerLabel}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>Product ID</span>
                                        <strong className="mono">{auction.productId || '-'}</strong>
                                    </div>
                                </div>

                                <div className="auction-manage-row__actions">
                                    {renderActionButtons(admin, auction, openDetailsPage)}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {filtered.length > 0 && viewMode === 'grid' && (
                <div className="auction-board-list">
                    {filtered.map((auction) => {
                        const highestBidder = participantLabel(admin, auction.highestBid);
                        const winnerLabel = participantLabel(admin, auction.winner);

                        return (
                            <article key={`board-${auction.id || auction.productId}`} className="admin-card auction-board-card">
                                <div className="auction-board-card__head">
                                    <div className="auction-board-card__identity">
                                        <div className="auction-board-card__thumb">
                                            {admin.mediaUrl && admin.mediaUrl(auction.productImage) ? (
                                                <img src={admin.mediaUrl(auction.productImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <Icon name="image" className="auction-icon" />
                                            )}
                                        </div>
                                        <div className="auction-board-card__copy">
                                            <h3 className="auction-board-card__title">{auction.title}</h3>
                                            <p className="auction-board-card__slug mono">{auction.productSlug || auction.productId}</p>
                                        </div>
                                    </div>
                                    <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(auction.status) : auction.status}`}>{auction.status}</span>
                                </div>

                                <div className="auction-board-card__metrics">
                                    <div className="auction-board-card__metric">
                                        <span>Current</span>
                                        <strong className="mono">{amountLabel(admin, auction.currentPrice)}</strong>
                                    </div>
                                    <div className="auction-board-card__metric">
                                        <span>Bids</span>
                                        <strong className="mono">{admin.number ? admin.number(auction.totalBids) : 0}</strong>
                                    </div>
                                    <div className="auction-board-card__metric">
                                        <span>Reserve</span>
                                        <strong className="mono">{auction.reservePrice !== null ? amountLabel(admin, auction.reservePrice) : '-'}</strong>
                                    </div>
                                    <div className="auction-board-card__metric">
                                        <span>Time Left</span>
                                        <strong className="mono">{auction.timeLeftText}</strong>
                                    </div>
                                </div>

                                <div className="auction-board-card__detail-grid">
                                    <div className="auction-manage-info">
                                        <span>Highest Bidder</span>
                                        <strong title={highestBidder}>{highestBidder}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>Winner</span>
                                        <strong title={winnerLabel}>{winnerLabel}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>Start</span>
                                        <strong>{scheduleLabel(admin, auction.startAt)}</strong>
                                    </div>
                                    <div className="auction-manage-info">
                                        <span>End</span>
                                        <strong>{scheduleLabel(admin, auction.endAt)}</strong>
                                    </div>
                                </div>

                                {renderActionButtons(admin, auction, openDetailsPage, true)}
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
