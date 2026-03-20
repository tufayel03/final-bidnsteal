import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarClock,
    CreditCard,
    Download,
    Eye,
    MessageSquareText,
    Package,
    Plus,
    RefreshCw,
    Save,
    Send,
    Truck,
    Trash2
} from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';
import { ADMIN_ORDER_CREATE_PATH } from '../../app/router/adminPaths';

export function OrdersTab() {
    const admin = useAdmin();
    const navigate = useNavigate();
    const { orderFilters, orders = [], ordersDeleting, ordersBulkSending, ordersBulkUpdating, orderBulkDraft, orderDrafts, ordersMeta } = admin;
    const selectedCount = admin.selectedOrderCount ? admin.selectedOrderCount() : 0;
    const allVisibleSelected = orders.length > 0 && selectedCount === orders.length;
    const visibleRevenue = orders.reduce((total, order) => total + Number(order.total || 0), 0);
    const awaitingDispatchCount = orders.filter((order) => ['pending', 'processing'].includes((order.fulfillmentStatus || '').toLowerCase())).length;
    const courierSentCount = orders.filter((order) => order.courier?.trackingCode || order.courier?.consignmentId).length;

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div className="admin-tab-header">
                <div>
                    <h2>Order Management</h2>
                    <p>Track, update, dispatch, and clean orders from one control surface.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => navigate(ADMIN_ORDER_CREATE_PATH)} className="order-filter-btn primary">
                        <Plus size={14} />
                        <span>Create Order</span>
                    </button>
                    <button onClick={() => admin.exportOrdersCsv && admin.exportOrdersCsv()} className="order-filter-btn">
                        <Download size={14} />
                        <span>Export Orders</span>
                    </button>
                    <button onClick={() => admin.loadOrders && admin.loadOrders(true)} className="order-filter-btn">
                        <RefreshCw size={14} />
                        <span>Reload</span>
                    </button>
                </div>
            </div>
            <div className="dashboard-stat-grid dashboard-stat-grid--primary">
                <DashboardStatCard
                    icon="receipt-text"
                    label="Visible Orders"
                    value={admin.number ? admin.number(orders.length) : orders.length}
                    meta="Live queue"
                    tone="stone"
                    featured
                />
                <DashboardStatCard
                    icon="clock-3"
                    label="Awaiting Dispatch"
                    value={admin.number ? admin.number(awaitingDispatchCount) : awaitingDispatchCount}
                    meta="Pending + processing"
                    tone="sand"
                    compact
                />
                <DashboardStatCard
                    icon="truck"
                    label="Sent To Courier"
                    value={admin.number ? admin.number(courierSentCount) : courierSentCount}
                    meta="Tracked shipments"
                    tone="sage"
                    compact
                />
                <DashboardStatCard
                    icon="credit-card"
                    label="Visible GMV"
                    value={admin.currency ? admin.currency(visibleRevenue) : visibleRevenue}
                    meta="Loaded order value"
                    tone="olive"
                    compact
                />
            </div>
            <div className="order-panel">
                <select
                    value={orderFilters.status || ''}
                    onChange={(e) => { admin.orderFilters.status = e.target.value; }}
                    className="order-filter-select" style={{ flex: '0 1 auto' }}
                >
                    <option value="">All Fulfillment</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="on_hold">On Hold</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <select
                    value={orderFilters.paymentStatus || ''}
                    onChange={(e) => { admin.orderFilters.paymentStatus = e.target.value; }}
                    className="order-filter-select" style={{ flex: '0 1 auto' }}
                >
                    <option value="">All Payment</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                </select>
                <button onClick={() => admin.loadOrders && admin.loadOrders(true)} className="order-filter-btn primary">Apply</button>
                <button onClick={() => admin.resetOrderFilters && admin.resetOrderFilters()} className="order-filter-btn">Reset</button>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="order-selection-meta">
                        Selected: <span className="mono">{admin.number ? admin.number(selectedCount) : 0}</span>
                        {' / '}
                        <span className="mono">{admin.number ? admin.number(orders.length) : 0}</span>
                    </div>
                    <button onClick={() => admin.selectAllVisibleOrders && admin.selectAllVisibleOrders()} className="order-filter-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Select Visible</button>
                    <button onClick={() => admin.clearOrderSelection && admin.clearOrderSelection()} className="order-filter-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>Clear</button>
                    <button
                        onClick={() => admin.deleteSelectedOrders && admin.deleteSelectedOrders()}
                        disabled={!selectedCount || ordersDeleting}
                        className="order-filter-btn danger" style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                        {ordersDeleting ? 'Deleting...' : 'Delete Selected'}
                    </button>
                </div>
                <div className="order-bulk-bar">
                    <div className="order-bulk-pill">
                        <span className="order-bulk-pill-label">Bulk Actions</span>
                        <strong className="mono">{admin.number ? admin.number(selectedCount) : 0}</strong>
                    </div>
                    <div className="order-inline-select-wrap order-bulk-select-wrap">
                        <span className="order-inline-icon">
                            <CreditCard size={14} />
                        </span>
                        <select
                            className="order-filter-select order-inline-select"
                            value={orderBulkDraft?.paymentStatus || ''}
                            onChange={(e) => { admin.orderBulkDraft.paymentStatus = e.target.value; }}
                        >
                            <option value="">Payment Status</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                    <div className="order-inline-select-wrap order-bulk-select-wrap">
                        <span className="order-inline-icon">
                            <Package size={14} />
                        </span>
                        <select
                            className="order-filter-select order-inline-select"
                            value={orderBulkDraft?.fulfillmentStatus || ''}
                            onChange={(e) => { admin.orderBulkDraft.fulfillmentStatus = e.target.value; }}
                        >
                            <option value="">Fulfillment Status</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="on_hold">On Hold</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button
                        onClick={() => admin.applyBulkOrderStatus && admin.applyBulkOrderStatus()}
                        disabled={!selectedCount || ordersBulkUpdating}
                        className="order-filter-btn"
                    >
                        <Save size={14} />
                        <span>{ordersBulkUpdating ? 'Applying...' : 'Apply Selected'}</span>
                    </button>
                    <button
                        onClick={() => admin.sendSelectedOrdersToCourier && admin.sendSelectedOrdersToCourier()}
                        disabled={!selectedCount || ordersBulkSending}
                        className="order-filter-btn primary"
                    >
                        <Send size={14} />
                        <span>{ordersBulkSending ? 'Sending...' : 'Send Selected'}</span>
                    </button>
                    <button
                        onClick={() => admin.resetBulkOrderDraft && admin.resetBulkOrderDraft()}
                        className="order-filter-btn"
                    >
                        Reset Bulk
                    </button>
                </div>
            </div>
            <div className="admin-table-wrap">
                <table className="admin-table orders-compact-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={(e) => e.target.checked ? admin.selectAllVisibleOrders() : admin.clearOrderSelection()}
                                    className="order-check"
                                />
                            </th>
                            <th style={{ width: '40px' }}>#</th>
                            <th style={{ minWidth: '170px' }}>Order #</th>
                            <th style={{ minWidth: '90px' }}>Total</th>
                            <th style={{ minWidth: '152px' }}>Payment</th>
                            <th style={{ minWidth: '166px' }}>Fulfillment</th>
                            <th style={{ minWidth: '170px' }}>Customer Note</th>
                            <th style={{ minWidth: '176px' }}>Courier</th>
                            <th style={{ minWidth: '126px' }}>Date</th>
                            <th style={{ minWidth: '178px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, index) => (
                            <tr key={order.id}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={admin.isOrderSelected ? admin.isOrderSelected(order) : false}
                                        onChange={() => admin.toggleOrderSelection && admin.toggleOrderSelection(order)}
                                        className="order-check"
                                    />
                                </td>
                                <td className="mono order-row-index">{admin.orderSerial ? admin.orderSerial(index) : index + 1}</td>
                                <td>
                                    <div className="order-primary-meta">
                                        <span className="order-primary-number">{order.orderNumber}</span>
                                        <span className="order-primary-caption">Live order record</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="order-total-compact">
                                        <span className="order-total-label">BDT</span>
                                        <strong>{admin.currency ? admin.currency(order.total).replace(/^BDT\s?/, '') : order.total}</strong>
                                    </div>
                                </td>
                                <td>
                                    <div className="order-inline-select-wrap">
                                        <span className="order-inline-icon">
                                            <CreditCard size={14} />
                                        </span>
                                        <select
                                            className="order-filter-select order-inline-select"
                                            value={orderDrafts[order.id]?.paymentStatus || 'unpaid'}
                                            onChange={(e) => { if (admin.orderDrafts[order.id]) admin.orderDrafts[order.id].paymentStatus = e.target.value; }}
                                        >
                                            <option value="unpaid">Unpaid</option>
                                            <option value="paid">Paid</option>
                                            <option value="refunded">Refunded</option>
                                        </select>
                                    </div>
                                </td>
                                <td>
                                    <div className="order-inline-select-wrap">
                                        <span className="order-inline-icon">
                                            <Package size={14} />
                                        </span>
                                        <select
                                            className="order-filter-select order-inline-select"
                                            value={orderDrafts[order.id]?.fulfillmentStatus || 'pending'}
                                            onChange={(e) => { if (admin.orderDrafts[order.id]) admin.orderDrafts[order.id].fulfillmentStatus = e.target.value; }}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="processing">Processing</option>
                                            <option value="on_hold">On Hold</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </td>
                                <td>
                                    <div className="order-note-compact" title={order.customerNote || 'No customer note'}>
                                        <MessageSquareText size={14} />
                                        <span>{order.customerNote || 'No note'}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="order-courier-compact">
                                        <div className="order-courier-head">
                                            <Truck size={14} />
                                            {order.courier?.deliveryStatus ? (
                                                <span className={`status-badge ${admin.courierStatusClass ? admin.courierStatusClass(order.courier?.deliveryStatus) : ''}`}>
                                                    {admin.courierStatusLabel ? admin.courierStatusLabel(order.courier?.deliveryStatus) : ''}
                                                </span>
                                            ) : (
                                                <span className="order-courier-empty">Not sent</span>
                                            )}
                                        </div>
                                        {order.courier?.trackingCode && (
                                            <p className="order-courier-meta mono">
                                                <span>TRK</span>
                                                <strong>{order.courier.trackingCode}</strong>
                                            </p>
                                        )}
                                        {order.courier?.consignmentId && (
                                            <p className="order-courier-meta mono">
                                                <span>CID</span>
                                                <strong>{order.courier.consignmentId}</strong>
                                            </p>
                                        )}
                                        {order.courier?.deliveryStatus && (
                                            <p className="order-courier-meta mono">
                                                <span>CODE</span>
                                                <strong>{order.courier.statusCode || 'unknown'}</strong>
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <div className="order-date-compact">
                                        <CalendarClock size={14} />
                                        <div>
                                            <p>{admin.date ? admin.date(order.createdAt) : ''}</p>
                                            <span className="mono">{admin.time ? admin.time(order.createdAt) : ''}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="order-actions-compact">
                                        <button
                                            onClick={() => navigate(`/tufayel/panel/orders/${order.id}`)}
                                            className="order-icon-btn"
                                            title="Open order details"
                                            aria-label="Open order details"
                                        >
                                            <Eye size={15} />
                                        </button>
                                        <button
                                            onClick={() => admin.saveOrder && admin.saveOrder(order)}
                                            className="order-icon-btn primary"
                                            title="Save status changes"
                                            aria-label="Save status changes"
                                        >
                                            <Save size={15} />
                                        </button>
                                        <button
                                            onClick={() => admin.sendOrderToCourier && admin.sendOrderToCourier(order)}
                                            className="order-icon-btn"
                                            title="Send to courier"
                                            aria-label="Send to courier"
                                        >
                                            <Send size={15} />
                                        </button>
                                        <button
                                            onClick={() => admin.syncOrderCourierStatus && admin.syncOrderCourierStatus(order)}
                                            className="order-icon-btn"
                                            title="Sync courier status"
                                            aria-label="Sync courier status"
                                        >
                                            <RefreshCw size={15} />
                                        </button>
                                        <button
                                            onClick={() => admin.deleteOrder && admin.deleteOrder(order)}
                                            className="order-icon-btn danger"
                                            title="Delete order"
                                            aria-label="Delete order"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan="10" className="orders-empty-state">No orders found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="orders-pagination-bar">
                <span>Page {ordersMeta.page} of {ordersMeta.totalPages}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => admin.changeOrdersPage && admin.changeOrdersPage(ordersMeta.page - 1)} disabled={ordersMeta.page <= 1} className="order-filter-btn" style={{ padding: '6px 16px' }}>Prev</button>
                    <button onClick={() => admin.changeOrdersPage && admin.changeOrdersPage(ordersMeta.page + 1)} disabled={ordersMeta.page >= ordersMeta.totalPages} className="order-filter-btn" style={{ padding: '6px 16px' }}>Next</button>
                </div>
            </div>
        </div>
    );
}
