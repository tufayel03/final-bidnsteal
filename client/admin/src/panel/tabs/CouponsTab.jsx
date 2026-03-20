import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, Check, CheckCheck, ChevronDown, Gavel, Package, PencilLine, Plus, RefreshCw, Repeat2, Save, Search, SlidersHorizontal, Store, TicketPercent, Trash2, X } from 'lucide-react';
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

const COUPON_CUSTOMER_USAGE_OPTIONS = [
    { value: 'multiple', label: 'Repeat Allowed' },
    { value: 'once', label: 'One Time / User' }
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

function formatCouponCustomerUsage(mode) {
    return mode === 'once' ? '1x / user' : 'Repeat';
}

function ScopeIcon({ appliesTo, size = 13 }) {
    if (appliesTo === 'store') return <Store size={size} />;
    if (appliesTo === 'auction') return <Gavel size={size} />;
    return <TicketPercent size={size} />;
}

function normalizeCouponProductIds(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
        .map((value) => {
            if (value && typeof value === 'object') {
                return String(value.id || value._id || '').trim();
            }
            return String(value || '').trim();
        })
        .filter((value) => {
            if (!value || seen.has(value)) return false;
            seen.add(value);
            return true;
        });
}

function formatCouponProductTarget(coupon) {
    const selectedIds = normalizeCouponProductIds(coupon?.productIds);
    if (!selectedIds.length) return 'All products';
    if (selectedIds.length === 1 && coupon?.targetProducts?.[0]?.title) {
        return coupon.targetProducts[0].title;
    }
    return `${selectedIds.length} selected products`;
}

function formatCouponExpiryCompact(coupon, admin) {
    if (!coupon?.expiresAt) return 'No expiry';
    return admin.date ? admin.date(coupon.expiresAt) : coupon.expiresAt;
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

function CouponSectionHeader({ icon: Icon, title, meta = null }) {
    return (
        <div className="coupon-section-head">
            <div className="coupon-section-head__title">
                <span className="coupon-section-head__icon">
                    <Icon size={15} />
                </span>
                <h3>{title}</h3>
            </div>
            {meta}
        </div>
    );
}

function CouponMetaPill({ icon, label }) {
    return (
        <span className="coupon-meta-pill">
            {icon}
            <span>{label}</span>
        </span>
    );
}

function CouponProductSelector({ products, selectedIds, onChange, inputId }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const normalizedSelectedIds = useMemo(() => normalizeCouponProductIds(selectedIds), [selectedIds]);
    const selectedSet = useMemo(() => new Set(normalizedSelectedIds), [normalizedSelectedIds]);

    const filteredProducts = useMemo(() => {
        const query = String(search || '').trim().toLowerCase();
        const base = Array.isArray(products) ? products : [];
        if (!query) return base;
        return base.filter((product) => {
            const haystack = `${product.title || ''} ${product.slug || ''} ${product.saleMode || ''}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [products, search]);

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    useEffect(() => {
        if (!open && search) {
            setSearch('');
        }
    }, [open, search]);

    const toggleProduct = (productId) => {
        const next = new Set(normalizedSelectedIds);
        if (next.has(productId)) {
            next.delete(productId);
        } else {
            next.add(productId);
        }
        onChange(Array.from(next));
    };

    const summaryLabel = normalizedSelectedIds.length
        ? `${normalizedSelectedIds.length} product${normalizedSelectedIds.length === 1 ? '' : 's'}`
        : 'All products';

    return (
        <div className="coupon-product-target" ref={rootRef}>
            <span className="coupon-field-label">Eligible</span>
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={`order-filter-btn coupon-product-target__trigger${open ? ' is-open' : ''}`}
                aria-expanded={open}
                aria-controls={`${inputId}-panel`}
            >
                <span className="coupon-product-target__trigger-copy">
                    <Package size={14} />
                    <span>{summaryLabel}</span>
                </span>
                <ChevronDown size={14} />
            </button>

            {open && (
                <div id={`${inputId}-panel`} className="coupon-product-target__panel">
                    <div className="coupon-product-target__search-row">
                        <div className="coupon-product-target__search">
                            <Search size={14} />
                            <input
                                id={inputId}
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search product"
                                className="admin-search-input"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => onChange([])}
                            className="order-filter-btn coupon-icon-btn"
                            disabled={!normalizedSelectedIds.length}
                            title="Use all products"
                            aria-label="Use all products"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className={`coupon-product-target__item coupon-product-target__item--all${!normalizedSelectedIds.length ? ' is-selected' : ''}`}
                    >
                        <span className="coupon-product-target__item-check" aria-hidden="true">
                            {!normalizedSelectedIds.length ? <Check size={13} /> : null}
                        </span>
                        <span className="coupon-product-target__item-copy">
                            <strong>All products</strong>
                            <span>Default coverage</span>
                        </span>
                    </button>

                    <div className="coupon-product-target__list custom-scrollbar">
                        {filteredProducts.map((product) => {
                            const checked = selectedSet.has(product.id);
                            const modeLabel = product.saleMode === 'hybrid' ? 'Auction + Buy Now' : product.saleMode === 'auction' ? 'Auction' : 'Fixed';

                            return (
                                <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => toggleProduct(product.id)}
                                    className={`coupon-product-target__item${checked ? ' is-selected' : ''}`}
                                >
                                    <span className="coupon-product-target__item-check" aria-hidden="true">
                                        {checked ? <Check size={13} /> : null}
                                    </span>
                                    <div className="coupon-product-target__item-copy">
                                        <strong>{product.title}</strong>
                                        <span>{product.slug || product.id}</span>
                                    </div>
                                    <span className="coupon-product-target__item-mode">{modeLabel}</span>
                                </button>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <div className="coupon-product-target__empty">
                                No products matched this search.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function CouponsTab() {
    const admin = useAdmin();
    const { coupons = [], couponFilters = {}, couponDraft = {}, couponProducts = [] } = admin;
    const [expandedCouponId, setExpandedCouponId] = useState(null);

    useEffect(() => {
        if (!couponProducts.length && admin.loadCouponProducts) {
            void admin.loadCouponProducts();
        }
    }, [admin, couponProducts.length]);

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
                    <h2>Coupons</h2>
                    <p>Discount codes.</p>
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
                    <CouponSectionHeader
                        icon={TicketPercent}
                        title="New Coupon"
                        meta={<span className="coupon-mini-pill">{normalizeCouponProductIds(couponDraft.productIds).length ? 'Targeted' : 'All products'}</span>}
                    />

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
                            <span className="coupon-field-label">Type</span>
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
                            <span className="coupon-field-label">Value</span>
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
                            <span className="coupon-field-label">Limit</span>
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
                            <span className="coupon-field-label">Min Order</span>
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
                        <label className="coupon-field">
                            <span className="coupon-field-label">Reuse</span>
                            <select
                                value={couponDraft.customerUsageMode || 'multiple'}
                                onChange={(e) => { admin.couponDraft.customerUsageMode = e.target.value; }}
                                className="order-filter-select"
                            >
                                {COUPON_CUSTOMER_USAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="coupon-field coupon-field--wide">
                            <span className="coupon-field-label">Expires</span>
                            <input
                                value={couponDraft.expiresAt || ''}
                                onChange={(e) => { admin.couponDraft.expiresAt = e.target.value; }}
                                type="datetime-local"
                                className="admin-search-input"
                            />
                        </label>
                        <div className="coupon-field coupon-field--full">
                            <CouponProductSelector
                                products={couponProducts}
                                selectedIds={couponDraft.productIds}
                                onChange={(nextIds) => { admin.couponDraft.productIds = nextIds; }}
                                inputId="coupon-draft-product-search"
                            />
                        </div>
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
                                <strong>Active</strong>
                            </div>
                        </label>
                        <button onClick={() => admin.createCoupon && admin.createCoupon()} className="order-filter-btn primary">
                            <Plus size={14} />
                            <span>Create</span>
                        </button>
                    </div>
                </section>

                <section className="coupon-library-column">
                    <div className="order-panel coupon-filter-panel">
                        <CouponSectionHeader icon={SlidersHorizontal} title="Filter" />
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
                        <CouponSectionHeader icon={TicketPercent} title="Library" />

                        <div className="coupon-library-list">
                            {coupons.map((coupon, index) => {
                                const status = getCouponStatus(coupon);
                                const usagePercent = getUsagePercent(coupon);
                                const couponKey = coupon.id || coupon.code || `coupon-${index}`;
                                const isExpanded = expandedCouponId === couponKey;
                                const minOrderLabel = Number(coupon.minOrderAmount || 0) > 0
                                    ? `Min ${admin.currency ? admin.currency(coupon.minOrderAmount) : `BDT ${coupon.minOrderAmount}`}`
                                    : 'No minimum order';
                                const productTargetLabel = formatCouponProductTarget(coupon);

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
                                                        <CouponMetaPill
                                                            icon={<TicketPercent size={12} />}
                                                            label={coupon.type === 'fixed' ? 'Fixed' : 'Percent'}
                                                        />
                                                        <CouponMetaPill
                                                            icon={<ScopeIcon appliesTo={coupon.appliesTo} size={12} />}
                                                            label={formatScope(coupon.appliesTo)}
                                                        />
                                                        <CouponMetaPill
                                                            icon={<Repeat2 size={12} />}
                                                            label={formatCouponCustomerUsage(coupon.customerUsageMode)}
                                                        />
                                                        <CouponMetaPill
                                                            icon={<Package size={12} />}
                                                            label={productTargetLabel}
                                                        />
                                                        <CouponMetaPill
                                                            icon={<CalendarClock size={12} />}
                                                            label={formatCouponExpiryCompact(coupon, admin)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="coupon-list-usage">
                                                <span className="coupon-field-label"><CheckCheck size={12} /> Usage</span>
                                                <strong>{formatUsageSummary(coupon)}</strong>
                                                <div className="coupon-usage-meter">
                                                    <span className="coupon-usage-meter-bar" style={{ width: `${usagePercent}%` }} />
                                                </div>
                                                <span className="coupon-usage-caption">
                                                    {Number(coupon.maxUses || 0) > 0 ? `${Math.round(usagePercent)}% redeemed` : 'Unlimited usage'}
                                                </span>
                                            </div>

                                            <div className="coupon-row-actions">
                                                <button
                                                    onClick={() => setExpandedCouponId(isExpanded ? null : couponKey)}
                                                    className="order-filter-btn coupon-icon-btn"
                                                    title={isExpanded ? 'Close editor' : 'Edit'}
                                                    aria-label={isExpanded ? 'Close editor' : 'Edit'}
                                                >
                                                    <PencilLine size={14} />
                                                </button>
                                                <button
                                                    onClick={() => admin.updateCoupon && admin.updateCoupon(coupon)}
                                                    className="order-filter-btn coupon-icon-btn"
                                                    title="Save"
                                                    aria-label="Save"
                                                >
                                                    <Save size={14} />
                                                </button>
                                                <button
                                                    onClick={() => admin.deleteCoupon && admin.deleteCoupon(coupon)}
                                                    className="order-filter-btn danger coupon-icon-btn"
                                                    title="Delete"
                                                    aria-label="Delete"
                                                >
                                                    <Trash2 size={14} />
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
                                                        <span className="coupon-field-label">Limit</span>
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
                                                        <span className="coupon-field-label">Reuse</span>
                                                        <select
                                                            value={coupon.customerUsageMode || 'multiple'}
                                                            onChange={(e) => { admin.coupons[index].customerUsageMode = e.target.value; }}
                                                            className="order-filter-select"
                                                        >
                                                            {COUPON_CUSTOMER_USAGE_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>{option.label}</option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <label className="coupon-field">
                                                        <span className="coupon-field-label">Expires</span>
                                                        <input
                                                            value={toDateTimeInputValue(coupon.expiresAt)}
                                                            onChange={(e) => { admin.coupons[index].expiresAt = e.target.value; }}
                                                            type="datetime-local"
                                                            className="admin-search-input"
                                                        />
                                                    </label>
                                                    <div className="coupon-field coupon-field--full">
                                                        <CouponProductSelector
                                                            products={couponProducts}
                                                            selectedIds={coupon.productIds}
                                                            onChange={(nextIds) => { admin.coupons[index].productIds = nextIds; }}
                                                            inputId={`coupon-row-product-search-${couponKey}`}
                                                        />
                                                    </div>
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
                                                            <strong>Active</strong>
                                                            <span>{minOrderLabel}</span>
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
