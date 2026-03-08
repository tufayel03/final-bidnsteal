import React, { useState } from 'react';
import { PencilLine, Plus, RefreshCw, Save, TicketPercent, Trash2 } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';

const COUPON_TYPE_OPTIONS = [
    { value: 'percent', label: 'Percent Off' },
    { value: 'fixed', label: 'Fixed Amount' }
];

const COUPON_SCOPE_OPTIONS = [
    { value: 'both', label: 'Store + Auctions' },
    { value: 'store', label: 'Store Only' },
    { value: 'auction', label: 'Auction Only' }
];

function toDateTimeInputValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
}

function isCouponExpired(coupon) {
    if (!coupon?.expiresAt) return false;
    const expiresAt = new Date(coupon.expiresAt);
    return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now();
}

function isCouponExhausted(coupon) {
    const maxUses = Number(coupon?.maxUses || 0);
    if (maxUses <= 0) return false;
    return Number(coupon?.usedCount || 0) >= maxUses;
}

function getCouponStatus(coupon) {
    if (isCouponExpired(coupon)) {
        return { label: 'Expired', className: 'status-cancelled' };
    }
    if (isCouponExhausted(coupon)) {
        return { label: 'Used Up', className: 'status-low' };
    }
    if (coupon?.isActive) {
        return { label: 'Active', className: 'status-live' };
    }
    return { label: 'Inactive', className: 'status-processing' };
}

function formatScope(appliesTo) {
    if (appliesTo === 'store') return 'Store only';
    if (appliesTo === 'auction') return 'Auction only';
    return 'Store + auction';
}

function formatCouponValue(coupon, admin) {
    if (String(coupon?.type || '').toLowerCase() === 'fixed') {
        return `${admin.currency ? admin.currency(coupon?.value || 0) : `BDT ${coupon?.value || 0}`} off`;
    }
    return `${Number(coupon?.value || 0)}% off`;
}

function formatUsageSummary(coupon) {
    const usedCount = Number(coupon?.usedCount || 0);
    const maxUses = Number(coupon?.maxUses || 0);
    if (maxUses <= 0) {
        return `${usedCount} used`;
    }
    return `${usedCount} / ${maxUses} used`;
}

function getUsagePercent(coupon) {
    const usedCount = Number(coupon?.usedCount || 0);
    const maxUses = Number(coupon?.maxUses || 0);
    if (maxUses <= 0) return 0;
    return Math.max(0, Math.min(100, (usedCount / maxUses) * 100));
}

export function CouponsTab() {
    const admin = useAdmin();
    const { coupons = [], couponFilters = {}, couponDraft = {} } = admin;
    const [expandedCouponId, setExpandedCouponId] = useState(null);

    const activeCoupons = coupons.filter((coupon) => getCouponStatus(coupon).label === 'Active').length;
    const expiringSoonCount = coupons.filter((coupon) => {
        if (!coupon?.expiresAt || isCouponExpired(coupon)) return false;
        const expiresAt = new Date(coupon.expiresAt);
        return expiresAt.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const redemptionCount = coupons.reduce((total, coupon) => total + Number(coupon.usedCount || 0), 0);

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div className="admin-tab-header">
                <div>
                    <h2>Coupon Management</h2>
                    <p>Build reusable discount codes, control redemption windows, and keep offer rules organized.</p>
                </div>
                <button onClick={() => admin.loadCoupons && admin.loadCoupons(true)} className="order-filter-btn">
                    <RefreshCw size={14} />
                    <span>Reload</span>
                </button>
            </div>

            <div className="dashboard-stat-grid dashboard-stat-grid--primary">
                <DashboardStatCard
                    icon="ticket-percent"
                    label="Coupon Library"
                    value={admin.number ? admin.number(coupons.length) : coupons.length}
                    meta="Saved discount codes"
                    tone="stone"
                    featured
                />
                <DashboardStatCard
                    icon="badge-check"
                    label="Live Discounts"
                    value={admin.number ? admin.number(activeCoupons) : activeCoupons}
                    meta="Ready at checkout"
                    tone="olive"
                    compact
                />
                <DashboardStatCard
                    icon="calendar-clock"
                    label="Expiring Soon"
                    value={admin.number ? admin.number(expiringSoonCount) : expiringSoonCount}
                    meta="Next 7 days"
                    tone="sand"
                    compact
                />
                <DashboardStatCard
                    icon="sparkles"
                    label="Total Redemptions"
                    value={admin.number ? admin.number(redemptionCount) : redemptionCount}
                    meta="Successful uses"
                    tone="sage"
                    compact
                />
            </div>

            <div className="coupon-management-layout">
                <section className="admin-card coupon-draft-card">
                    <div className="coupon-panel-head">
                        <div>
                            <p className="coupon-panel-kicker">Offer Builder</p>
                            <h3>Create Coupon</h3>
                            <p className="coupon-panel-copy">Prepare a new code with discount type, usage limit, expiry, and checkout scope.</p>
                        </div>
                        <div className="coupon-head-icon">
                            <TicketPercent size={18} />
                        </div>
                    </div>

                    <div className="coupon-form-grid">
                        <label className="coupon-field coupon-field--wide">
                            <span className="coupon-field-label">Code</span>
                            <input
                                value={couponDraft.code || ''}
                                onChange={(e) => { admin.couponDraft.code = e.target.value; }}
                                placeholder="SPRING10"
                                className="admin-search-input mono"
                                style={{ textTransform: 'uppercase' }}
                            />
                        </label>
                        <label className="coupon-field">
                            <span className="coupon-field-label">Discount Type</span>
                            <select
                                value={couponDraft.type || 'percent'}
                                onChange={(e) => { admin.couponDraft.type = e.target.value; }}
                                className="order-filter-select"
                            >
                                {COUPON_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="coupon-field">
                            <span className="coupon-field-label">Discount Value</span>
                            <input
                                value={couponDraft.value || ''}
                                onChange={(e) => { admin.couponDraft.value = e.target.value; }}
                                type="number"
                                min="0"
                                placeholder="10"
                                className="admin-search-input mono"
                            />
                        </label>
                        <label className="coupon-field">
                            <span className="coupon-field-label">Maximum Uses</span>
                            <input
                                value={couponDraft.maxUses || ''}
                                onChange={(e) => { admin.couponDraft.maxUses = e.target.value; }}
                                type="number"
                                min="1"
                                placeholder="50"
                                className="admin-search-input mono"
                            />
                        </label>
                        <label className="coupon-field">
                            <span className="coupon-field-label">Minimum Order</span>
                            <input
                                value={couponDraft.minOrderAmount || ''}
                                onChange={(e) => { admin.couponDraft.minOrderAmount = e.target.value; }}
                                type="number"
                                min="0"
                                placeholder="0"
                                className="admin-search-input mono"
                            />
                        </label>
                        <label className="coupon-field">
                            <span className="coupon-field-label">Scope</span>
                            <select
                                value={couponDraft.appliesTo || 'both'}
                                onChange={(e) => { admin.couponDraft.appliesTo = e.target.value; }}
                                className="order-filter-select"
                            >
                                {COUPON_SCOPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="coupon-field coupon-field--wide">
                            <span className="coupon-field-label">Expires At</span>
                            <input
                                value={couponDraft.expiresAt || ''}
                                onChange={(e) => { admin.couponDraft.expiresAt = e.target.value; }}
                                type="datetime-local"
                                className="admin-search-input"
                            />
                        </label>
                    </div>

                    <div className="coupon-draft-footer">
                        <label className="coupon-active-toggle">
                            <input
                                type="checkbox"
                                checked={!!couponDraft.isActive}
                                onChange={(e) => { admin.couponDraft.isActive = e.target.checked; }}
                                className="order-check"
                            />
                            <div>
                                <strong>Activate on creation</strong>
                                <span>New coupon is immediately available in checkout.</span>
                            </div>
                        </label>
                        <button onClick={() => admin.createCoupon && admin.createCoupon()} className="order-filter-btn primary">
                            <Plus size={14} />
                            <span>Create Coupon</span>
                        </button>
                    </div>
                </section>

                <section className="coupon-library-column">
                    <div className="order-panel coupon-filter-panel">
                        <div className="coupon-filter-copy">
                            <p className="coupon-panel-kicker">Library Controls</p>
                            <h3>Filter Coupon Library</h3>
                        </div>
                        <select
                            value={couponFilters.isActive || ''}
                            onChange={(e) => { admin.couponFilters.isActive = e.target.value; }}
                            className="order-filter-select"
                            style={{ flex: '0 1 210px' }}
                        >
                            <option value="">All Status</option>
                            <option value="true">Active Only</option>
                            <option value="false">Inactive Only</option>
                        </select>
                        <button onClick={() => admin.applyCouponFilters && admin.applyCouponFilters()} className="order-filter-btn primary">Apply</button>
                        <button
                            onClick={() => {
                                admin.couponFilters.isActive = '';
                                admin.applyCouponFilters && admin.applyCouponFilters();
                            }}
                            className="order-filter-btn"
                        >
                            Reset
                        </button>
                        <div className="coupon-filter-meta">
                            <span className="coupon-filter-meta-pill">{coupons.length} loaded</span>
                            <span className="coupon-filter-meta-pill">{activeCoupons} live</span>
                        </div>
                    </div>

                    <div className="admin-card coupon-library-card">
                        <div className="coupon-panel-head coupon-panel-head--library">
                            <div>
                                <p className="coupon-panel-kicker">Library</p>
                                <h3>Existing Coupons</h3>
                                <p className="coupon-panel-copy">Update offer rules, usage caps, expiry windows, and checkout scope from one place.</p>
                            </div>
                        </div>

                        <div className="coupon-library-list-head">
                            <span>Coupon</span>
                            <span>Usage</span>
                            <span>Coverage</span>
                            <span>Expiry</span>
                            <span>Actions</span>
                        </div>

                        <div className="coupon-library-list">
                            {coupons.map((coupon, index) => {
                                const status = getCouponStatus(coupon);
                                const usagePercent = getUsagePercent(coupon);
                                const couponKey = coupon.id || coupon.code || `coupon-${index}`;
                                const isExpanded = expandedCouponId === couponKey;
                                const minOrderLabel = Number(coupon.minOrderAmount || 0) > 0
                                    ? `Min ${admin.currency ? admin.currency(coupon.minOrderAmount) : `BDT ${coupon.minOrderAmount}`}`
                                    : 'No minimum order';
                                const expiryLabel = coupon.expiresAt
                                    ? (admin.dateTime ? admin.dateTime(coupon.expiresAt) : coupon.expiresAt)
                                    : 'No expiry set';

                                return (
                                    <article key={couponKey} className={`coupon-list-item${isExpanded ? ' is-expanded' : ''}`}>
                                        <div className="coupon-list-row">
                                            <div className="coupon-list-main">
                                                <div className="coupon-code-badge mono">{coupon.code}</div>
                                                <div className="coupon-list-main-copy">
                                                    <div className="coupon-summary-title-row">
                                                        <strong>{formatCouponValue(coupon, admin)}</strong>
                                                        <span className={`status-badge ${status.className}`}>{status.label}</span>
                                                    </div>
                                                    <div className="coupon-summary-meta">
                                                        <span>{coupon.type === 'fixed' ? 'Fixed amount' : 'Percent off'}</span>
                                                        <span>{coupon.isActive ? 'Visible at checkout' : 'Hidden from checkout'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="coupon-list-usage">
                                                <span className="coupon-field-label">Usage</span>
                                                <strong>{formatUsageSummary(coupon)}</strong>
                                                <div className="coupon-usage-meter">
                                                    <span className="coupon-usage-meter-bar" style={{ width: `${usagePercent}%` }} />
                                                </div>
                                                <span className="coupon-usage-caption">
                                                    {Number(coupon.maxUses || 0) > 0 ? `${Math.round(usagePercent)}% redeemed` : 'Unlimited usage'}
                                                </span>
                                            </div>

                                            <div className="coupon-list-coverage">
                                                <span className="coupon-field-label">Coverage</span>
                                                <strong>{formatScope(coupon.appliesTo)}</strong>
                                                <span>{minOrderLabel}</span>
                                            </div>

                                            <div className="coupon-list-expiry">
                                                <span className="coupon-field-label">Expiry</span>
                                                <strong>{expiryLabel}</strong>
                                                <span>{isCouponExpired(coupon) ? 'Expired' : 'Active window'}</span>
                                            </div>

                                            <div className="coupon-row-actions">
                                                <button onClick={() => setExpandedCouponId(isExpanded ? null : couponKey)} className="order-filter-btn">
                                                    <PencilLine size={14} />
                                                    <span>{isExpanded ? 'Close' : 'Edit'}</span>
                                                </button>
                                                <button onClick={() => admin.updateCoupon && admin.updateCoupon(coupon)} className="order-filter-btn">
                                                    <Save size={14} />
                                                    <span>Save</span>
                                                </button>
                                                <button onClick={() => admin.deleteCoupon && admin.deleteCoupon(coupon)} className="order-filter-btn danger">
                                                    <Trash2 size={14} />
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="coupon-row-editor">
                                                <div className="coupon-row-grid">
                                                    <label className="coupon-field">
                                                        <span className="coupon-field-label">Type</span>
                                                        <select
                                                            value={coupon.type || 'percent'}
                                                            onChange={(e) => { admin.coupons[index].type = e.target.value; }}
                                                            className="order-filter-select"
                                                        >
                                                            {COUPON_TYPE_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <label className="coupon-field">
                                                        <span className="coupon-field-label">Value</span>
                                                        <input
                                                            value={coupon.value || 0}
                                                            onChange={(e) => { admin.coupons[index].value = Number(e.target.value); }}
                                                            type="number"
                                                            min="0"
                                                            className="admin-search-input mono"
                                                        />
                                                    </label>
                                                    <label className="coupon-field">
                                                        <span className="coupon-field-label">Max Uses</span>
                                                        <input
                                                            value={coupon.maxUses || 0}
                                                            onChange={(e) => { admin.coupons[index].maxUses = Number(e.target.value); }}
                                                            type="number"
                                                            min="1"
                                                            className="admin-search-input mono"
                                                        />
                                                    </label>
                                                    <label className="coupon-field">
                                                        <span className="coupon-field-label">Min Order</span>
                                                        <input
                                                            value={coupon.minOrderAmount || 0}
                                                            onChange={(e) => { admin.coupons[index].minOrderAmount = Number(e.target.value); }}
                                                            type="number"
                                                            min="0"
                                                            className="admin-search-input mono"
                                                        />
                                                    </label>
                                                    <label className="coupon-field">
                                                        <span className="coupon-field-label">Scope</span>
                                                        <select
                                                            value={coupon.appliesTo || 'both'}
                                                            onChange={(e) => { admin.coupons[index].appliesTo = e.target.value; }}
                                                            className="order-filter-select"
                                                        >
                                                            {COUPON_SCOPE_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <label className="coupon-field">
                                                        <span className="coupon-field-label">Expires At</span>
                                                        <input
                                                            value={toDateTimeInputValue(coupon.expiresAt)}
                                                            onChange={(e) => { admin.coupons[index].expiresAt = e.target.value; }}
                                                            type="datetime-local"
                                                            className="admin-search-input"
                                                        />
                                                    </label>
                                                </div>

                                                <div className="coupon-row-footer">
                                                    <label className="coupon-active-toggle">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!coupon.isActive}
                                                            onChange={(e) => { admin.coupons[index].isActive = e.target.checked; }}
                                                            className="order-check"
                                                        />
                                                        <div>
                                                            <strong>Coupon is active</strong>
                                                            <span>Visible and redeemable during checkout validation.</span>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}

                            {coupons.length === 0 && (
                                <div className="coupon-empty-state">
                                    <TicketPercent size={28} />
                                    <strong>No coupons found</strong>
                                    <p>Create your first discount code or adjust the library filter to see inactive offers.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
