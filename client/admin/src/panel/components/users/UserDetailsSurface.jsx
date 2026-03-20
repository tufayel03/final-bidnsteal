import React from 'react';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';

const mono = { fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif', fontVariantNumeric: 'tabular-nums' };
const label = { display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' };
const card = { display: 'grid', gap: '6px', padding: '12px', border: '1px solid var(--border)', background: '#ffffff', borderRadius: '18px' };
const grid = (min) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: '12px' });

function SummaryCard({ title, value, monoValue = false }) {
  return (
    <div className="user-details-summary-card">
      <span className="user-details-summary-label">{title}</span>
      <strong className={`user-details-summary-value${monoValue ? ' user-details-summary-value--mono' : ''}`}>{value}</strong>
    </div>
  );
}

function SectionCard({ title, meta, children }) {
  return (
    <section className="admin-inset-card user-details-section-card">
      <div className="admin-inset-card-head">
        <div className="admin-inset-card-copy">
          <h4 className="admin-inset-card-title">{title}</h4>
        </div>
        {meta ? <span className="admin-inset-card-meta">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function UserDetailsSurface({ variant = 'modal', onClose }) {
  const admin = useAdmin();
  const { selectedUserDetails, userDetailsDraft, userDetailsLoading, userDetailsSaving } = admin;
  const details = selectedUserDetails;
  const orders = Array.isArray(details?.recentOrders) ? details.recentOrders : [];
  const addresses = Array.isArray(details?.addresses) ? details.addresses : [];
  const [expandedOrders, setExpandedOrders] = React.useState({});
  const isPage = variant === 'page';

  React.useEffect(() => {
    setExpandedOrders({});
  }, [details?.id]);

  const toggleOrderExpanded = (orderId) => {
    const key = String(orderId || '').trim();
    if (!key) return;
    setExpandedOrders((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className={isPage ? 'user-details-page user-details-surface' : 'user-details-drawer user-details-surface'}>
      <div className="admin-modal-head">
        <div>
          <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>User Detail</h3>
          {details?.email ? <p style={{ margin: '6px 0 0 0', ...mono, fontSize: '12px', color: 'var(--muted)', wordBreak: 'break-all' }}>{details.email}</p> : null}
        </div>

        {isPage ? (
          <div className="user-details-page-actions">
            <button onClick={onClose} className="user-details-btn user-details-btn--secondary">
              <Icon name="arrow-left" className="w-4 h-4" />
              <span>Back to Users</span>
            </button>
            <button
              onClick={() => admin.saveUserDetails && admin.saveUserDetails()}
              className="user-details-btn user-details-btn--primary"
              disabled={userDetailsLoading || userDetailsSaving || !details}
            >
              {userDetailsSaving ? 'Saving...' : 'Save User'}
            </button>
          </div>
        ) : (
          <button onClick={onClose} className="icon-btn">
            <Icon name="x" className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className={`admin-modal-body ${isPage ? 'user-details-page-body' : 'custom-scrollbar'} user-details-body`}>
        {userDetailsLoading ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>Loading user data...</p>
        ) : details ? (
          <div className="user-details-content-stack">
            <div className="user-details-summary-grid">
              <SummaryCard title="Name" value={details.name || '-'} />
              <SummaryCard title="Role" value={details.role || '-'} />
              <SummaryCard title="Status" value={details.isSuspended ? 'suspended' : 'active'} />
              <SummaryCard title="Phone" value={details.phone || '-'} monoValue />
              <SummaryCard title="Total Orders" value={admin.number ? admin.number(details.orderCount) : details.orderCount} monoValue />
              <SummaryCard title="Total Spent" value={admin.currency ? admin.currency(details.totalSpent) : details.totalSpent} monoValue />
            </div>

            <SectionCard title="Edit User Details" meta="Admin editable">
              <div className="user-details-field-grid">
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Name</span>
                  <input
                    value={userDetailsDraft?.name || ''}
                    onChange={(e) => { admin.userDetailsDraft.name = e.target.value; }}
                    className="settings-input"
                    type="text"
                    placeholder="Customer name"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Email</span>
                  <input
                    value={userDetailsDraft?.email || ''}
                    onChange={(e) => { admin.userDetailsDraft.email = e.target.value; }}
                    className="settings-input"
                    type="email"
                    placeholder="name@example.com"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Phone</span>
                  <input
                    value={userDetailsDraft?.phone || ''}
                    onChange={(e) => { admin.userDetailsDraft.phone = e.target.value; }}
                    className="settings-input"
                    type="text"
                    placeholder="01XXXXXXXXX"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Role</span>
                  <select
                    value={userDetailsDraft?.role || 'customer'}
                    onChange={(e) => { admin.userDetailsDraft.role = e.target.value; }}
                    className="order-filter-select"
                  >
                    <option value="customer">customer</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
              </div>

              <div style={{ marginTop: '14px', display: 'grid', gap: '10px' }}>
                <div className={`settings-switch-card ${userDetailsDraft?.isSuspended ? 'settings-switch-card-highlight' : ''}`}>
                  <div className="settings-switch-copy">
                    <p className="settings-switch-title">Suspend Account</p>
                    <p className="settings-switch-text">Disable login for this account while keeping its order history and customer record intact.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { admin.userDetailsDraft.isSuspended = !admin.userDetailsDraft.isSuspended; }}
                    className={`settings-toggle-wrap ${userDetailsDraft?.isSuspended ? 'on' : ''}`}
                  >
                    <span className={`settings-toggle ${userDetailsDraft?.isSuspended ? 'is-on' : ''}`} />
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Primary Shipping Address" meta="Saved to user profile">
              <div className="user-details-field-grid">
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Full Name</span>
                  <input
                    value={userDetailsDraft?.shippingAddress?.fullName || ''}
                    onChange={(e) => { admin.userDetailsDraft.shippingAddress.fullName = e.target.value; }}
                    className="settings-input"
                    type="text"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Phone</span>
                  <input
                    value={userDetailsDraft?.shippingAddress?.phone || ''}
                    onChange={(e) => { admin.userDetailsDraft.shippingAddress.phone = e.target.value; }}
                    className="settings-input"
                    type="text"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Address Line 1</span>
                  <input
                    value={userDetailsDraft?.shippingAddress?.addressLine1 || ''}
                    onChange={(e) => { admin.userDetailsDraft.shippingAddress.addressLine1 = e.target.value; }}
                    className="settings-input"
                    type="text"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Address Line 2</span>
                  <input
                    value={userDetailsDraft?.shippingAddress?.addressLine2 || ''}
                    onChange={(e) => { admin.userDetailsDraft.shippingAddress.addressLine2 = e.target.value; }}
                    className="settings-input"
                    type="text"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Area</span>
                  <input
                    value={userDetailsDraft?.shippingAddress?.area || ''}
                    onChange={(e) => { admin.userDetailsDraft.shippingAddress.area = e.target.value; }}
                    className="settings-input"
                    type="text"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>City</span>
                  <input
                    value={userDetailsDraft?.shippingAddress?.city || ''}
                    onChange={(e) => { admin.userDetailsDraft.shippingAddress.city = e.target.value; }}
                    className="settings-input"
                    type="text"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Postal Code</span>
                  <input
                    value={userDetailsDraft?.shippingAddress?.postalCode || ''}
                    onChange={(e) => { admin.userDetailsDraft.shippingAddress.postalCode = e.target.value; }}
                    className="settings-input"
                    type="text"
                  />
                </label>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={label}>Country</span>
                  <input
                    value={userDetailsDraft?.shippingAddress?.country || 'BD'}
                    onChange={(e) => { admin.userDetailsDraft.shippingAddress.country = e.target.value; }}
                    className="settings-input"
                    type="text"
                  />
                </label>
              </div>
            </SectionCard>

            <SectionCard title="Address Book" meta={`${admin.number ? admin.number(addresses.length) : addresses.length} saved`}>
              <div style={{ display: 'grid', gap: '12px' }}>
                {addresses.length ? addresses.map((address, index) => (
                  <div key={`${index}-${address.label || address.addressLine1 || 'address'}`} style={card}>
                    <div className="user-details-address-head">
                      <strong style={{ color: 'var(--text)' }}>{address.label || `Address #${index + 1}`}</strong>
                      <span className="user-details-address-phone" style={mono}>{address.phone || '-'}</span>
                    </div>
                    <span style={{ color: 'var(--text)', fontSize: '13px' }}>{address.fullName || details.name || '-'}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5 }}>{[address.addressLine1, address.addressLine2, address.area, address.city, address.postalCode, address.country].filter(Boolean).join(', ') || '-'}</span>
                  </div>
                )) : <p style={{ margin: 0, color: 'var(--muted)' }}>No saved addresses.</p>}
              </div>
            </SectionCard>

            <SectionCard title="User Orders" meta={`${admin.number ? admin.number(orders.length) : orders.length} loaded`}>
              <div className="user-orders-stack">
                {orders.length ? orders.map((order) => (
                  <div key={order.id} className={`user-order-card ${expandedOrders[String(order.id || '')] ? 'expanded' : ''}`}>
                    <button
                      type="button"
                      className="user-order-toggle"
                      onClick={() => toggleOrderExpanded(order.id)}
                    >
                      <div className="user-order-toggle-copy">
                        <div>
                          <p style={{ margin: 0, ...mono, fontSize: '14px', color: 'var(--text)' }}>{order.orderNumber}</p>
                          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>{admin.date ? admin.date(order.createdAt) : order.createdAt}</p>
                        </div>
                        <div className="user-order-toggle-meta">
                          <div className="user-order-toggle-total">
                            <span>Total</span>
                            <strong style={{ ...mono }}>{admin.currency ? admin.currency(order.total) : order.total}</strong>
                          </div>
                          <div className="user-details-order-status-row">
                            <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(order.paymentStatus) : order.paymentStatus}`}>{order.paymentStatus || 'unknown'}</span>
                            <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(order.fulfillmentStatus) : order.fulfillmentStatus}`}>{order.fulfillmentStatus || 'unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`user-order-toggle-icon ${expandedOrders[String(order.id || '')] ? 'expanded' : ''}`}>
                        <Icon name="chevron-down" />
                      </span>
                    </button>

                    {expandedOrders[String(order.id || '')] && (
                      <div className="user-order-collapse-body">
                        <div style={grid(120)}>
                          <div style={card}><span style={label}>Method</span><strong style={{ color: 'var(--text)' }}>{order.paymentMethod || '-'}</strong></div>
                          <div style={card}><span style={label}>Subtotal</span><strong style={{ ...mono, color: 'var(--text)' }}>{admin.currency ? admin.currency(order.subtotal) : order.subtotal}</strong></div>
                          <div style={card}><span style={label}>Shipping</span><strong style={{ ...mono, color: 'var(--text)' }}>{admin.currency ? admin.currency(order.shippingFee) : order.shippingFee}</strong></div>
                          <div style={card}><span style={label}>Discount</span><strong style={{ ...mono, color: 'var(--text)' }}>{admin.currency ? admin.currency(order.discount) : order.discount}</strong></div>
                          <div style={card}><span style={label}>Total</span><strong style={{ ...mono, color: 'var(--primary)' }}>{admin.currency ? admin.currency(order.total) : order.total}</strong></div>
                        </div>

                        <div style={card}>
                          <span style={label}>Customer Note</span>
                          <span style={{ color: 'var(--muted)', fontSize: '13px', whiteSpace: 'pre-line' }}>{order.customerNote || '-'}</span>
                        </div>

                        <div style={card}>
                          <span style={label}>Shipping Address</span>
                          <span style={{ color: 'var(--text)', fontSize: '13px' }}>{order.shippingAddress?.fullName || details.name || '-'}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{order.shippingAddress?.phone || details.phone || '-'}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5 }}>{[order.shippingAddress?.addressLine1, order.shippingAddress?.addressLine2, order.shippingAddress?.area, order.shippingAddress?.city, order.shippingAddress?.postalCode, order.shippingAddress?.country].filter(Boolean).join(', ') || '-'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )) : <p style={{ margin: 0, color: 'var(--muted)' }}>No orders found for this user.</p>}
              </div>
            </SectionCard>
          </div>
        ) : <p style={{ margin: 0, color: 'var(--muted)' }}>User details are not available.</p>}
      </div>

      {!isPage && (
        <div className="admin-modal-foot user-details-foot">
          <button onClick={onClose} className="user-details-btn user-details-btn--secondary">Close</button>
          <button
            onClick={() => admin.saveUserDetails && admin.saveUserDetails()}
            className="user-details-btn user-details-btn--primary"
            disabled={userDetailsLoading || userDetailsSaving || !details}
          >
            {userDetailsSaving ? 'Saving...' : 'Save User'}
          </button>
        </div>
      )}
    </div>
  );
}
