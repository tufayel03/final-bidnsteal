import React from 'react';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';

const mono = { fontFamily: '"Share Tech Mono", monospace' };
const label = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)'
};
const card = {
  display: 'grid',
  gap: '6px',
  padding: '12px',
  border: '1px solid var(--border)',
  background: 'rgba(15, 15, 25, 0.72)'
};
const grid = (min) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: '12px'
});

export function OrderDetailsSurface({ variant = 'modal', onClose }) {
  const admin = useAdmin();
  const { courierSuccessModal = {}, orderDetailsModal = {} } = admin;
  const order = orderDetailsModal.order;
  const items = Array.isArray(order?.items) ? order.items : [];
  const isPage = variant === 'page';
  const courierLoading = Boolean(courierSuccessModal.loading);
  const courierError = String(courierSuccessModal.error || '').trim();
  const courierHasSnapshot =
    Boolean(String(courierSuccessModal.phoneNumber || '').trim()) ||
    Number(courierSuccessModal.totalOrders || 0) > 0 ||
    Number(courierSuccessModal.totalDelivered || 0) > 0 ||
    Number(courierSuccessModal.totalCancelled || 0) > 0 ||
    Number(courierSuccessModal.successRatio || 0) > 0;
  const courierSuccessRatio = Number(courierSuccessModal.successRatio || 0);
  const courierFraudCount = Number(courierSuccessModal.fraudCount || 0);
  const courierHasFraudHistory = Boolean(courierSuccessModal.hasFraudHistory);
  const courierWarning = String(courierSuccessModal.warning || '').trim();
  const courierUsingCachedSnapshot = Boolean(courierSuccessModal.cached);

  return (
    <div
      className={isPage ? 'order-details-page order-details-modal' : 'admin-modal order-details-modal'}
      style={isPage ? undefined : { maxWidth: '1280px' }}
    >
      <div className="admin-modal-head order-details-head">
        <div>
          <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>Order Details</h3>
          <div className="order-details-meta">
            <span className="order-details-number">{order?.orderNumber || '-'}</span>
            {order ? (
              <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(order.paymentStatus) : order.paymentStatus}`}>
                {order.paymentStatus}
              </span>
            ) : null}
            {order ? (
              <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(order.fulfillmentStatus) : order.fulfillmentStatus}`}>
                {order.fulfillmentStatus}
              </span>
            ) : null}
          </div>
        </div>

        {isPage ? (
          <div className="order-details-page-actions">
            <button onClick={onClose} className="secondary-btn order-details-page-back-btn">
              <Icon name="arrow-left" className="w-4 h-4" />
              <span>Back to Orders</span>
            </button>
            <button
              onClick={() => admin.saveOrderDetails && admin.saveOrderDetails()}
              disabled={orderDetailsModal.saving || orderDetailsModal.loading}
              className="primary-btn order-details-page-save-btn"
            >
              {orderDetailsModal.saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <button onClick={onClose} className="icon-btn">
            <Icon name="x" className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className={`admin-modal-body ${isPage ? 'order-details-page-body' : 'custom-scrollbar'} order-details-body`}>
        {orderDetailsModal.loading ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>Loading order details...</p>
        ) : order ? (
          <div className="order-details-shell">
            <section className="order-details-column">
              <div className="order-metric-grid">
                <div className="order-metric-card" style={card}>
                  <span className="order-metric-label" style={label}>Total</span>
                  <strong className="order-metric-value" style={{ ...mono, color: '#f8fafc' }}>
                    {admin.currency ? admin.currency(order.total) : order.total}
                  </strong>
                </div>
                <div className="order-metric-card" style={card}>
                  <span className="order-metric-label" style={label}>Subtotal</span>
                  <strong className="order-metric-value" style={{ ...mono, color: '#f8fafc' }}>
                    {admin.currency ? admin.currency(order.subtotal) : order.subtotal}
                  </strong>
                </div>
                <div className="order-metric-card" style={card}>
                  <span className="order-metric-label" style={label}>Shipping</span>
                  <strong className="order-metric-value" style={{ ...mono, color: '#f8fafc' }}>
                    {admin.currency ? admin.currency(order.shippingFee) : order.shippingFee}
                  </strong>
                </div>
                <div className="order-metric-card" style={card}>
                  <span className="order-metric-label" style={label}>Created</span>
                  <strong className="order-metric-value order-metric-value-small" style={{ ...mono, color: '#f8fafc' }}>
                    {admin.dateTime ? admin.dateTime(order.createdAt) : order.createdAt}
                  </strong>
                </div>
              </div>

              <div className="admin-inset-card order-section-card" style={{ marginBottom: 0 }}>
                <div className="order-section-head">
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Order Items</h4>
                  <span style={{ color: 'var(--muted)', fontSize: '12px' }}>
                    {admin.number ? admin.number(items.length) : items.length} item(s)
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {items.length ? items.map((item, index) => (
                    <div key={item.productId || index} className="order-item-card">
                      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                        <div className="order-item-media">
                          {admin.orderItemImage && admin.orderItemImage(item) ? (
                            <img src={admin.orderItemImage(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ ...mono, color: 'var(--muted)' }}>
                              {admin.orderItemInitial ? admin.orderItemInitial(item) : 'IT'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'grid', gap: '10px', flex: 1, minWidth: 0 }}>
                          <div>
                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                              {item.titleSnapshot || 'Item'}
                            </p>
                            <p style={{ margin: '4px 0 0 0', ...mono, fontSize: '11px', color: 'var(--muted)', wordBreak: 'break-all' }}>
                              {item.productId || '-'}
                            </p>
                          </div>

                          <div style={grid(100)}>
                            <div style={card}>
                              <span style={label}>Qty</span>
                              <strong style={mono}>{admin.number ? admin.number(item.qty) : item.qty}</strong>
                            </div>
                            <div style={card}>
                              <span style={label}>Unit</span>
                              <strong style={mono}>{admin.currency ? admin.currency(item.unitPrice) : item.unitPrice}</strong>
                            </div>
                            <div style={card}>
                              <span style={label}>Subtotal</span>
                              <strong style={mono}>
                                {admin.currency
                                  ? admin.currency(
                                      admin.orderItemSubtotal
                                        ? admin.orderItemSubtotal(item)
                                        : ((Number(item.qty) || 0) * (Number(item.unitPrice) || 0))
                                    )
                                  : ''}
                              </strong>
                            </div>
                            <div style={card}>
                              <span style={label}>Type</span>
                              <strong style={{ color: '#f8fafc', textTransform: 'uppercase' }}>{item.type || 'fixed'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ ...card, textAlign: 'center', color: 'var(--muted)' }}>No order items.</div>
                  )}
                </div>
              </div>
            </section>

            <section className="order-details-column">
              <div className="admin-inset-card order-section-card" style={{ marginBottom: 0 }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Order Summary</h4>
                <div className="order-summary-grid">
                  <div style={card}>
                    <span style={label}>Customer</span>
                    <strong style={{ color: '#f8fafc' }}>{order.customerName || order.displayCustomer || '-'}</strong>
                  </div>
                  <div style={card}>
                    <span style={label}>Email</span>
                    <strong style={{ ...mono, color: '#f8fafc', wordBreak: 'break-all' }}>{order.customerEmail || '-'}</strong>
                  </div>
                  <div style={card}>
                    <span style={label}>Payment Method</span>
                    <strong style={{ color: '#f8fafc', textTransform: 'uppercase' }}>{order.paymentMethod || '-'}</strong>
                  </div>
                  <div style={card}>
                    <span style={label}>Discount</span>
                    <strong style={{ ...mono, color: '#f8fafc' }}>{admin.currency ? admin.currency(order.discount) : order.discount}</strong>
                  </div>
                </div>
              </div>

              <div className="admin-inset-card order-section-card order-fraud-panel" style={{ marginBottom: 0 }}>
                <div className="order-section-head order-fraud-head">
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Courier Fraud Check</h4>
                    <p className="order-fraud-caption">SteadFast customer history by shipping phone, not your site order history.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => admin.loadCourierSuccessRate && admin.loadCourierSuccessRate(order, { forceRefresh: true })}
                    disabled={courierLoading}
                    className="secondary-btn order-fraud-refresh"
                  >
                    {courierLoading ? 'Checking...' : 'Refresh Check'}
                  </button>
                </div>

                {courierLoading ? (
                  <div className="order-fraud-state">Checking customer history from SteadFast...</div>
                ) : courierError ? (
                  <div className="order-fraud-state order-fraud-state-error">{courierError}</div>
                ) : courierHasSnapshot ? (
                  <div className="order-fraud-stack">
                    {courierWarning ? (
                      <div className="order-fraud-state order-fraud-state-warning">{courierWarning}</div>
                    ) : null}

                    <div className="order-fraud-phone-row">
                      <div>
                        <span className="order-fraud-phone-label">Phone</span>
                        <strong className="order-fraud-phone-value">{courierSuccessModal.phoneNumber || '-'}</strong>
                      </div>
                      <div style={{ display: 'grid', gap: '8px', justifyItems: 'end' }}>
                        <span className={`order-fraud-status ${courierHasFraudHistory ? 'is-risk' : 'is-clear'}`}>
                          {courierHasFraudHistory ? `Fraud Flags: ${courierFraudCount}` : 'No Fraud History'}
                        </span>
                        {courierUsingCachedSnapshot ? (
                          <span className="order-fraud-status is-cached">Cached Snapshot</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="order-fraud-grid">
                      <div className="order-fraud-card">
                        <span className="order-fraud-label">Total Orders</span>
                        <strong className="order-fraud-value">
                          {admin.number ? admin.number(courierSuccessModal.totalOrders) : courierSuccessModal.totalOrders}
                        </strong>
                      </div>
                      <div className="order-fraud-card is-good">
                        <span className="order-fraud-label">Delivered</span>
                        <strong className="order-fraud-value">
                          {admin.number ? admin.number(courierSuccessModal.totalDelivered) : courierSuccessModal.totalDelivered}
                        </strong>
                      </div>
                      <div className="order-fraud-card is-bad">
                        <span className="order-fraud-label">Cancelled</span>
                        <strong className="order-fraud-value">
                          {admin.number ? admin.number(courierSuccessModal.totalCancelled) : courierSuccessModal.totalCancelled}
                        </strong>
                      </div>
                      <div className="order-fraud-card is-highlight">
                        <span className="order-fraud-label">Success Ratio</span>
                        <strong className="order-fraud-value">{courierSuccessRatio.toFixed(2)}%</strong>
                      </div>
                    </div>

                    <div className="order-fraud-meter">
                      <div
                        className="order-fraud-meter-fill"
                        style={{ width: `${Math.max(0, Math.min(100, courierSuccessRatio))}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="order-fraud-state">Courier history will load here.</div>
                )}
              </div>

              <div className="admin-inset-card order-section-card" style={{ marginBottom: 0 }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Status + Customer Note</h4>
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div className="order-form-grid">
                    <div>
                      <label style={label}>Payment</label>
                      <select
                        value={orderDetailsModal.draft?.paymentStatus || 'unpaid'}
                        onChange={(event) => admin.orderDetailsModal?.draft && (admin.orderDetailsModal.draft.paymentStatus = event.target.value)}
                        className="order-filter-select"
                        style={{ width: '100%' }}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>

                    <div>
                      <label style={label}>Fulfillment</label>
                      <select
                        value={orderDetailsModal.draft?.fulfillmentStatus || 'pending'}
                        onChange={(event) => admin.orderDetailsModal?.draft && (admin.orderDetailsModal.draft.fulfillmentStatus = event.target.value)}
                        className="order-filter-select"
                        style={{ width: '100%' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={label}>Customer Note</label>
                    <textarea
                      value={orderDetailsModal.draft?.customerNote || ''}
                      onChange={(event) => admin.orderDetailsModal?.draft && (admin.orderDetailsModal.draft.customerNote = event.target.value)}
                      rows="4"
                      maxLength="1000"
                      placeholder="Customer note..."
                      className="admin-search-input custom-scrollbar"
                      style={{ width: '100%', minHeight: '108px', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              <div className="admin-inset-card order-section-card" style={{ marginBottom: 0 }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Shipping Address</h4>
                <div className="order-address-grid">
                  <div>
                    <label style={label}>Full Name</label>
                    <input
                      value={orderDetailsModal.draft?.shippingAddress?.fullName || ''}
                      onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.fullName = event.target.value)}
                      placeholder="Full name"
                      className="admin-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={label}>Phone</label>
                    <input
                      value={orderDetailsModal.draft?.shippingAddress?.phone || ''}
                      onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.phone = event.target.value)}
                      placeholder="Phone"
                      className="admin-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={label}>Address Line 1</label>
                    <input
                      value={orderDetailsModal.draft?.shippingAddress?.addressLine1 || ''}
                      onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.addressLine1 = event.target.value)}
                      placeholder="Address line 1"
                      className="admin-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={label}>Address Line 2</label>
                    <input
                      value={orderDetailsModal.draft?.shippingAddress?.addressLine2 || ''}
                      onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.addressLine2 = event.target.value)}
                      placeholder="Address line 2"
                      className="admin-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={label}>Area</label>
                    <input
                      value={orderDetailsModal.draft?.shippingAddress?.area || ''}
                      onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.area = event.target.value)}
                      placeholder="Area"
                      className="admin-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={label}>City</label>
                    <input
                      value={orderDetailsModal.draft?.shippingAddress?.city || ''}
                      onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.city = event.target.value)}
                      placeholder="City"
                      className="admin-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={label}>Postal Code</label>
                    <input
                      value={orderDetailsModal.draft?.shippingAddress?.postalCode || ''}
                      onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.postalCode = event.target.value)}
                      placeholder="Postal code"
                      className="admin-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={label}>Country</label>
                    <input
                      value={orderDetailsModal.draft?.shippingAddress?.country || 'BD'}
                      onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.country = event.target.value)}
                      placeholder="Country"
                      className="admin-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--muted)' }}>Order data is not available.</p>
        )}
      </div>

      {!isPage && (
        <div className="admin-modal-foot">
          <button onClick={onClose} className="secondary-btn">Close</button>
          <button
            onClick={() => admin.saveOrderDetails && admin.saveOrderDetails()}
            disabled={orderDetailsModal.saving || orderDetailsModal.loading}
            className="primary-btn"
          >
            {orderDetailsModal.saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
