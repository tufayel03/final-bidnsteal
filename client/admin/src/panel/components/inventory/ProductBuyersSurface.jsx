import React from 'react';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';

const mono = { fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif', fontVariantNumeric: 'tabular-nums' };

function MetricCard({ label, value, note }) {
  return (
    <div className="product-buyers-metric-card">
      <span className="product-buyers-metric-label">{label}</span>
      <strong className="product-buyers-metric-value">{value}</strong>
      {note ? <span className="product-buyers-metric-note">{note}</span> : null}
    </div>
  );
}

export function ProductBuyersSurface({ loading, error, payload, onRefresh, onClose }) {
  const admin = useAdmin();
  const product = payload?.product || null;
  const summary = payload?.summary || {};
  const buyers = Array.isArray(payload?.buyers) ? payload.buyers : [];
  const orders = Array.isArray(payload?.orders) ? payload.orders : [];

  return (
    <div className="product-buyers-page">
      <div className="product-buyers-head">
        <div className="product-buyers-head-copy">
          <span className="product-buyers-eyebrow">Inventory Buyer Ledger</span>
          <h2>Product Buyers</h2>
          <p>Track who bought this product, how many units they purchased, and which orders consumed inventory.</p>
        </div>
        <div className="product-buyers-head-actions">
          <button onClick={onClose} className="user-details-btn user-details-btn--secondary">
            <Icon name="arrow-left" className="w-4 h-4" />
            <span>Back to Inventory</span>
          </button>
          <button onClick={onRefresh} className="user-details-btn user-details-btn--primary" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-inset-card">
          <p style={{ margin: 0, color: 'var(--muted)' }}>Loading buyer history...</p>
        </div>
      ) : error ? (
        <div className="admin-inset-card">
          <p style={{ margin: 0, color: '#bb6d5a' }}>{error}</p>
        </div>
      ) : product ? (
        <div className="product-buyers-stack">
          <div className="product-buyers-product-card">
            <div className="product-buyers-product-media">
              {product.image ? <img src={admin.mediaUrl ? admin.mediaUrl(product.image) : product.image} alt={product.title} /> : <span>No image</span>}
            </div>
            <div className="product-buyers-product-copy">
              <div className="product-buyers-product-title-row">
                <h3>{product.title}</h3>
                <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(product.saleMode) : product.saleMode}`}>{product.saleMode || 'fixed'}</span>
              </div>
              <div className="product-buyers-product-meta">
                <span style={mono}>{product.sku || product.slug}</span>
                <span>{product.category || 'Uncategorized'}</span>
                <span>{admin.currency ? admin.currency(product.price) : product.price}</span>
              </div>
            </div>
          </div>

          <div className="product-buyers-metric-grid">
            <MetricCard
              label="Current Stock"
              value={admin.number ? admin.number(product.stock) : product.stock}
              note="Units currently available in inventory"
            />
            <MetricCard
              label="Sold Units"
              value={admin.number ? admin.number(summary.soldUnits || 0) : summary.soldUnits || 0}
              note="Non-cancelled units consumed by orders"
            />
            <MetricCard
              label="Unique Buyers"
              value={admin.number ? admin.number(summary.uniqueBuyers || 0) : summary.uniqueBuyers || 0}
              note="Distinct customers tied to this product"
            />
            <MetricCard
              label="Product Revenue"
              value={admin.currency ? admin.currency(summary.grossRevenue || 0) : summary.grossRevenue || 0}
              note={`${admin.number ? admin.number(summary.orderCount || 0) : summary.orderCount || 0} active order record(s)`}
            />
          </div>

          <div className="product-buyers-content-grid">
            <div className="admin-inset-card product-buyers-panel">
              <div className="product-buyers-panel-head">
                <div>
                  <h4>Buyer List</h4>
                  <p>Grouped customer history for this product.</p>
                </div>
                <span className="coupon-filter-meta-pill">{buyers.length} buyers</span>
              </div>

              <div className="product-buyers-table-wrap">
                <table className="admin-table product-buyers-table">
                  <thead>
                    <tr>
                      <th>Buyer</th>
                      <th>Contact</th>
                      <th>Units</th>
                      <th>Orders</th>
                      <th>Spent</th>
                      <th>Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buyers.length ? buyers.map((buyer) => (
                      <tr key={buyer.key}>
                        <td>
                          <strong>{buyer.customerName || 'Customer'}</strong>
                          <p className="product-buyers-subtext">{buyer.lastOrderNumber || '-'}</p>
                        </td>
                        <td>
                          <p>{buyer.customerEmail || '-'}</p>
                          <p className="product-buyers-subtext">{buyer.phone || '-'}</p>
                        </td>
                        <td className="mono">{admin.number ? admin.number(buyer.unitsBought || 0) : buyer.unitsBought || 0}</td>
                        <td className="mono">{admin.number ? admin.number(buyer.orderCount || 0) : buyer.orderCount || 0}</td>
                        <td className="mono">{admin.currency ? admin.currency(buyer.totalSpent || 0) : buyer.totalSpent || 0}</td>
                        <td>
                          <p>{admin.date ? admin.date(buyer.lastOrderedAt) : buyer.lastOrderedAt}</p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                            <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(buyer.lastFulfillmentStatus) : buyer.lastFulfillmentStatus}`}>{buyer.lastFulfillmentStatus || 'pending'}</span>
                            <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(buyer.lastPaymentStatus) : buyer.lastPaymentStatus}`}>{buyer.lastPaymentStatus || 'unpaid'}</span>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6">
                          <p style={{ margin: 0, color: 'var(--muted)' }}>No buyer history found for this product yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-inset-card product-buyers-panel">
              <div className="product-buyers-panel-head">
                <div>
                  <h4>Order Ledger</h4>
                  <p>Every order line that touched this product.</p>
                </div>
                <span className="coupon-filter-meta-pill">{orders.length} rows</span>
              </div>

              <div className="product-buyers-table-wrap">
                <table className="admin-table product-buyers-table product-buyers-ledger-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Buyer</th>
                      <th>Quantity</th>
                      <th>Line Revenue</th>
                      <th>Contact</th>
                      <th>Ordered At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length ? orders.map((order) => (
                      <tr key={`${order.id}-${order.orderNumber}`}>
                        <td>
                          <strong style={mono}>{order.orderNumber}</strong>
                        </td>
                        <td>
                          <p>{order.customerName || 'Customer'}</p>
                        </td>
                        <td className="mono">{admin.number ? admin.number(order.qty || 0) : order.qty || 0}</td>
                        <td className="mono">{admin.currency ? admin.currency(order.revenue || 0) : order.revenue || 0}</td>
                        <td>
                          <p>{order.customerEmail || '-'}</p>
                          <p className="product-buyers-subtext" style={mono}>{order.phone || '-'}</p>
                        </td>
                        <td>
                          <p>{admin.dateTime ? admin.dateTime(order.createdAt) : order.createdAt}</p>
                        </td>
                        <td>
                          <div className="product-buyers-status-stack">
                            <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(order.paymentStatus) : order.paymentStatus}`}>{order.paymentStatus || 'unpaid'}</span>
                            <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(order.fulfillmentStatus) : order.fulfillmentStatus}`}>{order.fulfillmentStatus || 'pending'}</span>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7">
                          <p style={{ margin: 0, color: 'var(--muted)' }}>No order ledger entries found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="admin-inset-card">
          <p style={{ margin: 0, color: 'var(--muted)' }}>Product buyer history is not available.</p>
        </div>
      )}
    </div>
  );
}
