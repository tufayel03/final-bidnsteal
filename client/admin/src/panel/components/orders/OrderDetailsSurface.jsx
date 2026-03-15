import React from 'react';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';

const mono = { fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif', fontVariantNumeric: 'tabular-nums' };
const label = {
  display: 'block',
  marginBottom: '5px',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)'
};

export function OrderDetailsSurface({ variant = 'modal', onClose }) {
  const admin = useAdmin();
  const { courierSuccessModal = {}, orderDetailsModal = {} } = admin;
  const order = orderDetailsModal.order;
  const draft = orderDetailsModal.draft || {};
  const isCreate = orderDetailsModal.mode === 'create';
  const draftItems = Array.isArray(draft.items) ? draft.items : [];
  const catalog = Array.isArray(orderDetailsModal.catalog) ? orderDetailsModal.catalog : [];
  const filteredCatalog = admin.filteredOrderDetailsCatalog ? admin.filteredOrderDetailsCatalog() : catalog;
  const catalogById = new Map(catalog.map((item) => [String(item.id || ''), item]));
  const userOptions = Array.isArray(orderDetailsModal.userOptions) ? orderDetailsModal.userOptions : [];
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
  const draftSubtotal = admin.orderDetailsDraftSubtotal ? admin.orderDetailsDraftSubtotal(draft) : Number(order?.subtotal || 0);
  const draftTotal = admin.orderDetailsDraftTotal ? admin.orderDetailsDraftTotal(draft) : Number(order?.total || 0);
  const displayCustomerName = isCreate ? (draft.customerName || draft.shippingAddress?.fullName || '-') : (order?.customerName || order?.displayCustomer || '-');
  const displayCustomerEmail = isCreate ? (draft.customerEmail || '-') : (order?.customerEmail || '-');
  const displayPaymentMethod = isCreate ? 'cod' : (order?.paymentMethod || '-');
  const displayStatus = `${draft.paymentStatus || order?.paymentStatus || '-'} / ${draft.fulfillmentStatus || order?.fulfillmentStatus || '-'}`;
  const saveLabel = orderDetailsModal.saving ? (isCreate ? 'Creating...' : 'Saving...') : (isCreate ? 'Create Order' : 'Save Changes');
  const metricCards = [
    {
      label: 'Total',
      value: admin.currency ? admin.currency(draftTotal) : draftTotal
    },
    {
      label: 'Line Items',
      value: admin.number ? admin.number(draftItems.length) : draftItems.length
    },
    {
      label: 'Subtotal',
      value: admin.currency ? admin.currency(draftSubtotal) : draftSubtotal
    },
    {
      label: 'Created',
      value: isCreate ? 'Manual Draft' : (admin.dateTime ? admin.dateTime(order?.createdAt) : order?.createdAt),
      small: true
    }
  ];
  const summaryCards = [
    {
      label: 'Customer',
      value: displayCustomerName
    },
    {
      label: 'Email',
      value: displayCustomerEmail,
      mono: true
    },
    {
      label: 'Payment Method',
      value: displayPaymentMethod,
      upper: true
    },
    {
      label: 'Status',
      value: displayStatus,
      upper: true
    }
  ];

  return (
    <div
      className={isPage ? 'order-details-page order-details-modal' : 'admin-modal order-details-modal misc-soft-modal'}
      style={isPage ? undefined : { maxWidth: '1320px' }}
    >
      <div className="admin-modal-head order-details-head">
        <div>
          <h3 className="order-details-title">{isCreate ? 'Create Order' : 'Order Details'}</h3>
          <div className="order-details-meta">
            <span className="order-details-number">{isCreate ? 'Manual order draft' : (order?.orderNumber || '-')}</span>
            {(order || isCreate) ? (
              <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(draft.paymentStatus || order?.paymentStatus) : (draft.paymentStatus || order?.paymentStatus)}`}>
                {draft.paymentStatus || order?.paymentStatus}
              </span>
            ) : null}
            {(order || isCreate) ? (
              <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(draft.fulfillmentStatus || order?.fulfillmentStatus) : (draft.fulfillmentStatus || order?.fulfillmentStatus)}`}>
                {draft.fulfillmentStatus || order?.fulfillmentStatus}
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
              {saveLabel}
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
          <p style={{ margin: 0, color: 'var(--muted)' }}>{isCreate ? 'Preparing order editor...' : 'Loading order details...'}</p>
        ) : (order || isCreate) ? (
          <div className="order-details-content-stack">
            <div className="order-details-workspace-grid">
              <section className="order-details-column order-details-workspace-main">
                <div className="order-metric-grid">
                  {metricCards.map((metric) => (
                    <div key={metric.label} className="order-metric-card order-detail-info-card">
                      <span className="order-detail-info-label">{metric.label}</span>
                      <strong
                        className={`order-detail-info-value order-metric-value${metric.small ? ' order-metric-value-small' : ''}`}
                        style={mono}
                      >
                        {metric.value}
                      </strong>
                    </div>
                  ))}
                </div>

                {isCreate ? (
                  <div className="admin-inset-card order-section-card">
                    <div className="order-section-head order-section-head-tight">
                      <div>
                        <h4 className="order-section-title">Customer Assignment</h4>
                        <p className="order-section-caption">Create this manual order for a guest customer or link it to an existing user.</p>
                      </div>
                    </div>

                    <div className="order-status-note-stack">
                      <div className="order-form-grid">
                        <div>
                          <label style={label}>Order For</label>
                          <select
                            value={draft.customerType || 'guest'}
                            onChange={(event) => admin.setOrderDetailsCustomerType && admin.setOrderDetailsCustomerType(event.target.value)}
                            className="order-filter-select"
                            style={{ width: '100%' }}
                          >
                            <option value="guest">Guest / Non User</option>
                            <option value="user">Existing User</option>
                          </select>
                        </div>

                        <div>
                          <label style={label}>Customer Email</label>
                          <input
                            value={draft.customerEmail || ''}
                            onChange={(event) => { admin.orderDetailsModal.draft.customerEmail = event.target.value; }}
                            placeholder="customer@example.com"
                            className="admin-search-input"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      {String(draft.customerType || 'guest') === 'user' ? (
                        <>
                          <div className="order-form-grid">
                            <div>
                              <label style={label}>Find User</label>
                              <input
                                value={orderDetailsModal.userSearch || ''}
                                onChange={(event) => {
                                  if (admin.setOrderDetailsUserSearch) {
                                    admin.setOrderDetailsUserSearch(event.target.value);
                                  } else {
                                    admin.orderDetailsModal.userSearch = event.target.value;
                                  }
                                }}
                                placeholder="Search by name or email..."
                                className="admin-search-input"
                                style={{ width: '100%' }}
                              />
                            </div>

                            <div>
                              <label style={label}>Select User</label>
                              <select
                                value={draft.userId || ''}
                                onChange={(event) => admin.selectOrderDetailsUser && admin.selectOrderDetailsUser(event.target.value)}
                                className="order-filter-select"
                                style={{ width: '100%' }}
                              >
                                <option value="">
                                  {orderDetailsModal.userLoading
                                    ? 'Loading users...'
                                    : userOptions.length
                                      ? 'Select existing user'
                                      : 'No users found'}
                                </option>
                                {userOptions.map((user) => (
                                  <option key={user.id} value={user.id}>
                                    {user.name || 'Unnamed user'}{user.email ? ` - ${user.email}` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="order-detail-info-card order-detail-info-card--compact">
                            <span className="order-detail-info-label">Linked Account</span>
                            <strong className="order-detail-info-value">
                              {draft.userId
                                ? `${draft.customerName || 'User'}${draft.customerEmail ? ` (${draft.customerEmail})` : ''}`
                                : 'Select a user to attach this order'}
                            </strong>
                          </div>
                        </>
                      ) : null}

                      <div>
                        <label style={label}>Customer Name</label>
                        <input
                          value={draft.customerName || ''}
                          onChange={(event) => {
                            admin.orderDetailsModal.draft.customerName = event.target.value;
                            if (isCreate && admin.orderDetailsModal?.draft?.shippingAddress) {
                              admin.orderDetailsModal.draft.shippingAddress.fullName = event.target.value;
                            }
                          }}
                          placeholder="Customer name"
                          className="admin-search-input"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="admin-inset-card order-section-card">
                  <div className="order-section-head order-section-head-tight">
                    <div>
                      <h4 className="order-section-title">Status + Customer Note</h4>
                      <p className="order-section-caption">Operational state and internal customer communication.</p>
                    </div>
                  </div>
                  <div className="order-status-note-stack">
                    <div className="order-form-grid">
                      <div>
                        <label style={label}>Payment</label>
                        <select
                          value={draft.paymentStatus || 'unpaid'}
                          onChange={(event) => { admin.orderDetailsModal.draft.paymentStatus = event.target.value; }}
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
                          value={draft.fulfillmentStatus || 'pending'}
                          onChange={(event) => { admin.orderDetailsModal.draft.fulfillmentStatus = event.target.value; }}
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
                        value={draft.customerNote || ''}
                        onChange={(event) => { admin.orderDetailsModal.draft.customerNote = event.target.value; }}
                        rows="3"
                        maxLength="1000"
                        placeholder="Customer note..."
                        className="admin-search-input custom-scrollbar"
                        style={{ width: '100%', minHeight: '92px', resize: 'vertical' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-inset-card order-section-card">
                  <div className="order-section-head order-section-head-tight">
                    <div>
                      <h4 className="order-section-title">Shipping Address</h4>
                      <p className="order-section-caption">Delivery profile used for courier dispatch.</p>
                    </div>
                  </div>
                  <div className="order-address-grid">
                    <div>
                      <label style={label}>Full Name</label>
                      <input
                        value={draft.shippingAddress?.fullName || ''}
                        onChange={(event) => {
                          if (admin.orderDetailsModal?.draft?.shippingAddress) {
                            admin.orderDetailsModal.draft.shippingAddress.fullName = event.target.value;
                          }
                          if (isCreate) {
                            admin.orderDetailsModal.draft.customerName = event.target.value;
                          }
                        }}
                        placeholder="Full name"
                        className="admin-search-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={label}>Phone</label>
                      <input
                        value={draft.shippingAddress?.phone || ''}
                        onChange={(event) => { if (admin.orderDetailsModal?.draft?.shippingAddress) admin.orderDetailsModal.draft.shippingAddress.phone = event.target.value; }}
                        placeholder="Phone"
                        className="admin-search-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Address Line 1</label>
                      <input
                        value={draft.shippingAddress?.addressLine1 || ''}
                        onChange={(event) => { if (admin.orderDetailsModal?.draft?.shippingAddress) admin.orderDetailsModal.draft.shippingAddress.addressLine1 = event.target.value; }}
                        placeholder="Address line 1"
                        className="admin-search-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={label}>Address Line 2</label>
                      <input
                        value={draft.shippingAddress?.addressLine2 || ''}
                        onChange={(event) => { if (admin.orderDetailsModal?.draft?.shippingAddress) admin.orderDetailsModal.draft.shippingAddress.addressLine2 = event.target.value; }}
                        placeholder="Address line 2"
                        className="admin-search-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={label}>Area</label>
                      <input
                        value={draft.shippingAddress?.area || ''}
                        onChange={(event) => { if (admin.orderDetailsModal?.draft?.shippingAddress) admin.orderDetailsModal.draft.shippingAddress.area = event.target.value; }}
                        placeholder="Area"
                        className="admin-search-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={label}>City</label>
                      <input
                        value={draft.shippingAddress?.city || ''}
                        onChange={(event) => { if (admin.orderDetailsModal?.draft?.shippingAddress) admin.orderDetailsModal.draft.shippingAddress.city = event.target.value; }}
                        placeholder="City"
                        className="admin-search-input"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="order-details-column order-details-workspace-side">
                <div className="admin-inset-card order-section-card order-summary-panel">
                  <div className="order-section-head order-section-head-tight">
                    <div>
                      <h4 className="order-section-title">Customer + Payment</h4>
                      <p className="order-section-caption">Top-level order context and payment identity.</p>
                    </div>
                  </div>
                  <div className="order-summary-grid">
                    {summaryCards.map((field) => (
                      <div key={field.label} className="order-detail-info-card order-detail-info-card--compact">
                        <span className="order-detail-info-label">{field.label}</span>
                        <strong
                          className={`order-detail-info-value${field.upper ? ' order-detail-info-value--upper' : ''}`}
                          style={field.mono ? mono : undefined}
                        >
                          {field.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-inset-card order-section-card">
                  <div className="order-section-head order-section-head-tight">
                    <div>
                      <h4 className="order-section-title">Totals Editor</h4>
                      <p className="order-section-caption">Shipping and discount changes roll into the live order total.</p>
                    </div>
                  </div>

                  <div className="order-editor-financials order-editor-financials--side">
                    <div className="order-editor-financial-input">
                      <label style={label}>Shipping Fee</label>
                      <input
                        value={draft.shippingFee || ''}
                        onChange={(event) => { admin.orderDetailsModal.draft.shippingFee = event.target.value; }}
                        className="admin-search-input"
                        inputMode="decimal"
                      />
                    </div>

                    <div className="order-editor-financial-input">
                      <label style={label}>Discount</label>
                      <input
                        value={draft.discount || ''}
                        onChange={(event) => { admin.orderDetailsModal.draft.discount = event.target.value; }}
                        className="admin-search-input"
                        inputMode="decimal"
                      />
                    </div>

                    <div className="order-detail-info-card order-detail-info-card--compact">
                      <span className="order-detail-info-label">Calculated Subtotal</span>
                      <strong className="order-detail-info-value" style={mono}>
                        {admin.currency ? admin.currency(draftSubtotal) : draftSubtotal}
                      </strong>
                    </div>

                    <div className="order-detail-info-card order-detail-info-card--compact">
                      <span className="order-detail-info-label">Order Total</span>
                      <strong className="order-detail-info-value" style={mono}>
                        {admin.currency ? admin.currency(draftTotal) : draftTotal}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="admin-inset-card order-section-card order-fraud-panel">
                  <div className="order-section-head order-fraud-head">
                    <div>
                      <h4 className="order-section-title">Courier Fraud Check</h4>
                      <p className="order-fraud-caption">SteadFast customer history by shipping phone, not your site order history.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => admin.loadCourierSuccessRate && admin.loadCourierSuccessRate(order, { forceRefresh: true })}
                      disabled={courierLoading || isCreate}
                      className="secondary-btn order-fraud-refresh"
                    >
                      {isCreate ? 'Save First' : courierLoading ? 'Checking...' : 'Refresh Check'}
                    </button>
                  </div>

                  {isCreate ? (
                    <div className="order-fraud-state">Save this order first to run courier history checks.</div>
                  ) : courierLoading ? (
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
                        <div className="order-fraud-status-stack">
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
              </section>
            </div>

            <div className="admin-inset-card order-section-card order-items-panel">
              <div className="order-section-head order-items-editor-head">
                <div>
                  <h4 className="order-section-title">Order Items</h4>
                  <p className="order-section-caption">Edit product lines, pricing, and quantities from a single compact table.</p>
                </div>
                <span className="order-detail-pill">{draftItems.length} item(s)</span>
              </div>

              <div className="order-editor-toolbar">
                <input
                  value={orderDetailsModal.productSearch || ''}
                  onChange={(event) => {
                    if (admin.setOrderDetailsProductSearch) {
                      admin.setOrderDetailsProductSearch(event.target.value);
                      return;
                    }
                    admin.orderDetailsModal.productSearch = event.target.value;
                  }}
                  placeholder="Search products to add..."
                  className="admin-search-input"
                />
                <select
                  value={orderDetailsModal.productToAddId || ''}
                  onChange={(event) => { admin.orderDetailsModal.productToAddId = event.target.value; }}
                  className="order-filter-select"
                >
                  <option value="">
                    {orderDetailsModal.catalogLoading
                      ? 'Searching products...'
                      : filteredCatalog.length
                        ? 'Select product'
                        : 'No matching products'}
                  </option>
                  {filteredCatalog.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}{product.sku ? ` - ${product.sku}` : ''} ({admin.currency ? admin.currency(product.price) : product.price})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => admin.addProductToOrderDetails && admin.addProductToOrderDetails()}
                  className="primary-btn order-editor-add-btn"
                  disabled={orderDetailsModal.catalogLoading}
                >
                  <Icon name="plus" className="w-4 h-4" />
                  <span>{orderDetailsModal.catalogLoading ? 'Loading...' : 'Add Product'}</span>
                </button>
              </div>

              <div className="order-editor-table">
                <div className="order-editor-table-head">
                  <span>Product</span>
                  <span>Qty</span>
                  <span>Unit Price</span>
                  <span>Line Total</span>
                  <span>Type</span>
                  <span>Action</span>
                </div>

                <div className="order-editor-table-body">
                  {draftItems.length ? draftItems.map((item, index) => {
                    const lineSubtotal = admin.orderDetailsLineSubtotal
                      ? admin.orderDetailsLineSubtotal(item)
                      : ((Number(item.qty) || 0) * (Number(item.unitPrice) || 0));
                    const productMeta = catalogById.get(String(item.productId || '').trim());
                    return (
                      <div key={item.lineId || index} className="order-editor-row">
                        <div className="order-editor-product-cell">
                          <div className="order-item-media">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt="" />
                            ) : (
                              <span style={{ ...mono, color: 'var(--muted)' }}>
                                {admin.orderItemInitial ? admin.orderItemInitial(item) : 'IT'}
                              </span>
                            )}
                          </div>
                          <div className="order-editor-product-copy">
                            <strong className="order-item-title" title={item.titleSnapshot || 'Item'}>
                              {item.titleSnapshot || 'Item'}
                            </strong>
                            <span className="order-item-code" style={mono} title={item.slugSnapshot || item.productId || '-'}>
                              {item.slugSnapshot || item.productId || '-'}
                            </span>
                            {productMeta ? (
                              <span className="order-editor-stock-note" title={`In stock: ${admin.number ? admin.number(productMeta.stock) : productMeta.stock}`}>
                                In stock: {admin.number ? admin.number(productMeta.stock) : productMeta.stock}
                              </span>
                            ) : null}
                            {item.locked ? (
                              <span className="order-editor-lock-note">Auction-backed line item is locked.</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="order-editor-input-cell">
                          <label className="order-editor-mobile-label">Qty</label>
                          <input
                            value={item.qty}
                            onChange={(event) => admin.updateOrderDetailsItem && admin.updateOrderDetailsItem(item.lineId, 'qty', event.target.value)}
                            className="admin-search-input"
                            inputMode="numeric"
                            disabled={item.locked}
                          />
                        </div>

                        <div className="order-editor-input-cell">
                          <label className="order-editor-mobile-label">Unit Price</label>
                          <input
                            value={item.unitPrice}
                            onChange={(event) => admin.updateOrderDetailsItem && admin.updateOrderDetailsItem(item.lineId, 'unitPrice', event.target.value)}
                            className="admin-search-input"
                            inputMode="decimal"
                            disabled={item.locked}
                          />
                        </div>

                        <div className="order-editor-total-cell">
                          <label className="order-editor-mobile-label">Line Total</label>
                          <strong className="order-detail-info-value" style={mono}>
                            {admin.currency ? admin.currency(lineSubtotal) : lineSubtotal}
                          </strong>
                        </div>

                        <div className="order-editor-type-cell">
                          <label className="order-editor-mobile-label">Type</label>
                          <span className={`order-detail-pill ${item.locked ? 'is-locked' : ''}`}>
                            {item.type || 'fixed'}
                          </span>
                        </div>

                        <div className="order-editor-action-cell">
                          <label className="order-editor-mobile-label">Action</label>
                          <button
                            type="button"
                            onClick={() => admin.removeOrderDetailsItem && admin.removeOrderDetailsItem(item.lineId)}
                            className="order-icon-btn danger"
                            disabled={item.locked}
                            title={item.locked ? 'Auction lines are locked' : 'Remove line'}
                          >
                            <Icon name="trash-2" className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="order-detail-info-card order-empty-card">No order items.</div>
                  )}
                </div>
              </div>
            </div>
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
            {saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}
