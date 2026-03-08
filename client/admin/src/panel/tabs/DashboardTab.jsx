import React from 'react';
import { Icon } from '../components/Icon';
import { useAdmin } from '../AdminContext';
import { DashboardShell } from '../components/dashboard/DashboardShell';
import { DashboardSection } from '../components/dashboard/DashboardSection';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';
import {
    dashboardInventoryTone,
    dashboardKpiTone,
    dashboardMiniTone,
    dashboardStatusLabel,
    dashboardStatusTone
} from '../components/dashboard/dashboardTheme';

function metricCaption(admin, revenueTelemetryMeta) {
    if (!revenueTelemetryMeta.from || !revenueTelemetryMeta.to) {
        return 'Track revenue movement across short and long sales windows.';
    }

    const from = admin.date ? admin.date(revenueTelemetryMeta.from) : revenueTelemetryMeta.from;
    const to = admin.date ? admin.date(revenueTelemetryMeta.to) : revenueTelemetryMeta.to;
    const bucket = String(revenueTelemetryMeta.bucket || 'day').toUpperCase();
    return `${from} to ${to} | ${bucket} buckets`;
}

function statusBadgeClass(status) {
    return `dashboard-status-badge is-${dashboardStatusTone(status)}`;
}

export function DashboardTab() {
    const admin = useAdmin();
    const {
        kpisRow1 = [],
        kpisRow2 = [],
        inventoryStats = {},
        recentOrders = [],
        endingAuctions = [],
        revenueWindow,
        revenueCustomRange = {},
        revenueTelemetryLoading = false,
        revenueTelemetryMeta = {}
    } = admin;

    return (
        <DashboardShell
            eyebrow="Admin Workspace"
            title="Operations Dashboard"
            description={(
                <span className="dashboard-shell__status-line">
                    <span className="dashboard-shell__status-dot" />
                    System status: Optimal
                </span>
            )}
            actions={(
                <>
                    <button
                        onClick={() => admin.loadDashboard && admin.loadDashboard(true)}
                        className="dashboard-action-btn"
                    >
                        Sync Data
                    </button>
                    <button
                        onClick={() => admin.exportFinancialMonthlyCsv && admin.exportFinancialMonthlyCsv()}
                        className="dashboard-action-btn dashboard-action-btn--primary"
                    >
                        Export CSV
                    </button>
                </>
            )}
        >
            <div className="dashboard-stat-grid dashboard-stat-grid--primary">
                {kpisRow1.map((kpi, idx) => (
                    <DashboardStatCard
                        key={`${kpi.label}-${idx}`}
                        icon={kpi.icon}
                        label={kpi.label}
                        value={kpi.value}
                        meta={kpi.trend}
                        tone={dashboardKpiTone(idx)}
                        featured={idx === 0}
                    />
                ))}
            </div>

            <div className="dashboard-content-grid">
                <div className="dashboard-main-column">
                    <DashboardSection
                        eyebrow="Balance Overview"
                        title="Revenue Overview"
                        subtitle={metricCaption(admin, revenueTelemetryMeta)}
                        className="dashboard-section--chart"
                        actions={(
                            <div className="dashboard-range-controls">
                                <div className="dashboard-range-actions">
                                    <button
                                        onClick={() => admin.setRevenueWindow && admin.setRevenueWindow('7d')}
                                        className={`dashboard-chip-btn ${revenueWindow === '7d' ? 'is-active' : ''}`}
                                        disabled={revenueTelemetryLoading}
                                    >
                                        7D
                                    </button>
                                    <button
                                        onClick={() => admin.setRevenueWindow && admin.setRevenueWindow('1m')}
                                        className={`dashboard-chip-btn ${revenueWindow === '1m' ? 'is-active' : ''}`}
                                        disabled={revenueTelemetryLoading}
                                    >
                                        1M
                                    </button>
                                    <button
                                        onClick={() => admin.setRevenueWindow && admin.setRevenueWindow('6m')}
                                        className={`dashboard-chip-btn ${revenueWindow === '6m' ? 'is-active' : ''}`}
                                        disabled={revenueTelemetryLoading}
                                    >
                                        6M
                                    </button>
                                    <button
                                        onClick={() => admin.setRevenueWindow && admin.setRevenueWindow('12m')}
                                        className={`dashboard-chip-btn ${revenueWindow === '12m' ? 'is-active' : ''}`}
                                        disabled={revenueTelemetryLoading}
                                    >
                                        12M
                                    </button>
                                    <button
                                        onClick={() => admin.setRevenueWindow && admin.setRevenueWindow('custom')}
                                        className={`dashboard-chip-btn ${revenueWindow === 'custom' ? 'is-active' : ''}`}
                                        disabled={revenueTelemetryLoading}
                                    >
                                        Custom
                                    </button>
                                </div>

                                <div className="dashboard-date-range">
                                    <input
                                        type="date"
                                        value={revenueCustomRange.from || ''}
                                        onChange={(event) => admin.setRevenueCustomRange && admin.setRevenueCustomRange('from', event.target.value)}
                                        className="dashboard-date-input"
                                        aria-label="Revenue start date"
                                    />
                                    <span className="dashboard-date-range__separator">to</span>
                                    <input
                                        type="date"
                                        value={revenueCustomRange.to || ''}
                                        onChange={(event) => admin.setRevenueCustomRange && admin.setRevenueCustomRange('to', event.target.value)}
                                        className="dashboard-date-input"
                                        aria-label="Revenue end date"
                                    />
                                    <button
                                        onClick={() => admin.applyRevenueCustomRange && admin.applyRevenueCustomRange()}
                                        className="dashboard-action-btn dashboard-action-btn--primary"
                                        disabled={revenueTelemetryLoading}
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    >
                        <div id="revenueChartWrap" className={`dashboard-chart-wrap ${revenueTelemetryLoading ? 'is-loading' : ''}`}>
                            {revenueTelemetryLoading ? (
                                <div className="dashboard-chart-loading">Loading revenue telemetry...</div>
                            ) : null}
                            <canvas id="revenueChart" className="dashboard-chart-canvas" />
                        </div>
                    </DashboardSection>

                    <DashboardSection
                        eyebrow="Transactions"
                        title="Recent Orders"
                        subtitle="Latest order flow across the store and auctions."
                        actions={(
                            <button
                                onClick={() => admin.setActiveTab && admin.setActiveTab('orders')}
                                className="dashboard-action-btn"
                            >
                                View Orders
                            </button>
                        )}
                    >
                        <div className="dashboard-table-wrap">
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>Order</th>
                                        <th>Amount</th>
                                        <th>Payment</th>
                                        <th>Fulfillment</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentOrders.length ? recentOrders.map((order, idx) => (
                                        <tr key={`${order.id || order.orderNumber || idx}`}>
                                            <td>
                                                <div className="dashboard-table__stack">
                                                    <strong>{order.orderNumber}</strong>
                                                    <span>{order.customer || 'Customer'}</span>
                                                </div>
                                            </td>
                                            <td>{admin.currency ? admin.currency(order.total) : order.total}</td>
                                            <td>
                                                <span className={statusBadgeClass(order.paymentStatus)}>
                                                    {dashboardStatusLabel(order.paymentStatus)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={statusBadgeClass(order.fulfillmentStatus)}>
                                                    {dashboardStatusLabel(order.fulfillmentStatus)}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="dashboard-table__empty">No recent orders found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </DashboardSection>
                </div>

                <div className="dashboard-side-column">
                    <div className="dashboard-side-kpi-grid">
                        {kpisRow2.map((kpi, idx) => (
                            <DashboardStatCard
                                key={`${kpi.label}-${idx}`}
                                label={kpi.label}
                                value={kpi.value}
                                tone={dashboardMiniTone(idx)}
                                compact
                            />
                        ))}
                    </div>

                    <DashboardSection
                        eyebrow="Stock Control"
                        title="Warehouse Snapshot"
                        subtitle="Current lot value, shortages, and held inventory."
                    >
                        <div className="dashboard-inventory-list">
                            <div className={`dashboard-inventory-row is-${dashboardInventoryTone('netAssetValue')}`}>
                                <span>Net Asset</span>
                                <strong>{admin.currency ? admin.currency(inventoryStats.netAssetValue) : inventoryStats.netAssetValue}</strong>
                            </div>
                            <div className={`dashboard-inventory-row is-${dashboardInventoryTone('outOfStock')}`}>
                                <span>Critical Shortage</span>
                                <strong>{admin.number ? admin.number(inventoryStats.outOfStock) : 0}</strong>
                            </div>
                            <div className={`dashboard-inventory-row is-${dashboardInventoryTone('reservedUnits')}`}>
                                <span>Held Stock</span>
                                <strong>{admin.number ? admin.number(inventoryStats.reservedUnits) : 0}</strong>
                            </div>
                            <div className={`dashboard-inventory-row is-${dashboardInventoryTone('totalUnits')}`}>
                                <span>Active Units</span>
                                <strong>{admin.number ? admin.number(inventoryStats.totalUnits) : 0}</strong>
                            </div>
                        </div>

                        <div className="dashboard-health-meter">
                            <div className="dashboard-health-meter__head">
                                <span>Stock Health</span>
                                <strong>{inventoryStats.stockHealth || 0}%</strong>
                            </div>
                            <div className="dashboard-health-meter__bar">
                                <span style={{ width: `${inventoryStats.stockHealth || 0}%` }} />
                            </div>
                            <p>Operational inventory remains ready for order flow.</p>
                        </div>
                    </DashboardSection>

                    <DashboardSection
                        eyebrow="Live Lots"
                        title="Active Bidding"
                        subtitle="Auctions closing soon and current bid pressure."
                    >
                        <div className="dashboard-auction-list">
                            {endingAuctions.length ? endingAuctions.map((auction, idx) => (
                                <article className="dashboard-auction-card" key={`${auction.id || auction.title || idx}`}>
                                    <div className="dashboard-auction-card__head">
                                        <div>
                                            <h4>{auction.title}</h4>
                                            <p>{admin.number ? admin.number(auction.totalBids) : 0} bids placed</p>
                                        </div>
                                        <span className="dashboard-status-badge is-clay">Live</span>
                                    </div>
                                    <div className="dashboard-auction-card__stats">
                                        <div>
                                            <span>Current bid</span>
                                            <strong>{admin.currency ? admin.currency(auction.currentPrice) : auction.currentPrice}</strong>
                                        </div>
                                        <div>
                                            <span>Time left</span>
                                            <strong>{auction.timeLeftText}</strong>
                                        </div>
                                    </div>
                                </article>
                            )) : (
                                <div className="dashboard-auction-empty">
                                    <Icon name="flame" />
                                    <span>No live auctions right now.</span>
                                </div>
                            )}
                        </div>
                    </DashboardSection>
                </div>
            </div>
        </DashboardShell>
    );
}
