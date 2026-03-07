import React from 'react';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';
import { AdminModalPortal } from './AdminModalPortal';

const mono = { fontFamily: '"Share Tech Mono", monospace' };
const label = { display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' };
const card = { display: 'grid', gap: '6px', padding: '12px', border: '1px solid var(--border)', background: 'rgba(15, 15, 25, 0.72)' };
const grid = (min) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: '12px' });

export function OrderModal() {
    const admin = useAdmin();
    const { courierSuccessModal = {}, orderDetailsModal = {} } = admin;
    const order = orderDetailsModal.order;
    const items = Array.isArray(order?.items) ? order.items : [];

    return (
        <>
            {courierSuccessModal.open && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay" style={{ zIndex: 1090 }} onClick={(event) => event.target === event.currentTarget && admin.closeCourierSuccessModal && admin.closeCourierSuccessModal()}>
                        <div className="admin-modal" style={{ maxWidth: '640px' }}>
                            <div className="admin-modal-head">
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '8px' }}>
                                        <Icon name="truck" className="w-5 h-5" />
                                        <span style={{ ...mono, fontSize: '12px', letterSpacing: '0.12em' }}>STEADFAST</span>
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>Customer Success Rate</h3>
                                    {courierSuccessModal.orderNumber ? <p style={{ margin: '6px 0 0 0', color: 'var(--muted)', fontSize: '13px' }}>Order {courierSuccessModal.orderNumber}</p> : null}
                                    {courierSuccessModal.phoneNumber ? <p style={{ margin: '4px 0 0 0', ...mono, color: 'var(--muted)', fontSize: '12px' }}>Phone {courierSuccessModal.phoneNumber}</p> : null}
                                </div>
                                <button onClick={() => admin.closeCourierSuccessModal && admin.closeCourierSuccessModal()} className="icon-btn">
                                    <Icon name="x" className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="admin-modal-body">
                                {courierSuccessModal.loading ? (
                                    <p style={{ margin: 0, color: 'var(--muted)' }}>Checking customer history from SteadFast...</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <div style={grid(140)}>
                                            <div style={card}><span style={label}>Total Orders</span><strong style={{ ...mono, fontSize: '24px', color: '#f8fafc' }}>{admin.number ? admin.number(courierSuccessModal.totalOrders) : 0}</strong></div>
                                            <div style={{ ...card, borderColor: 'rgba(16, 185, 129, 0.45)' }}><span style={label}>Delivered</span><strong style={{ ...mono, fontSize: '24px', color: '#6ee7b7' }}>{admin.number ? admin.number(courierSuccessModal.totalDelivered) : 0}</strong></div>
                                            <div style={{ ...card, borderColor: 'rgba(239, 68, 68, 0.45)' }}><span style={label}>Cancelled</span><strong style={{ ...mono, fontSize: '24px', color: '#fca5a5' }}>{admin.number ? admin.number(courierSuccessModal.totalCancelled) : 0}</strong></div>
                                        </div>
                                        <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                                <span style={label}>Success Ratio</span>
                                                <strong style={{ ...mono, fontSize: '18px', color: 'var(--primary)' }}>{Number(courierSuccessModal.successRatio || 0).toFixed(2)}%</strong>
                                            </div>
                                            <div style={{ marginTop: '12px', height: '10px', background: 'rgba(255,255,255,0.08)' }}>
                                                <div style={{ width: `${Math.max(0, Math.min(100, Number(courierSuccessModal.successRatio || 0)))}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="admin-modal-foot">
                                <button onClick={() => admin.closeCourierSuccessModal && admin.closeCourierSuccessModal()} className="secondary-btn">Close</button>
                            </div>
                        </div>
                    </div>
                </AdminModalPortal>
            )}

            {orderDetailsModal.open && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay" style={{ zIndex: 1080 }} onClick={(event) => event.target === event.currentTarget && admin.closeOrderDetails && admin.closeOrderDetails()}>
                        <div className="admin-modal" style={{ maxWidth: '1180px' }}>
                            <div className="admin-modal-head">
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>Order Details</h3>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                                        <span style={{ ...mono, fontSize: '13px', color: 'var(--muted)' }}>{order?.orderNumber || '-'}</span>
                                        {order ? <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(order.paymentStatus) : order.paymentStatus}`}>{order.paymentStatus}</span> : null}
                                        {order ? <span className={`status-badge status-${admin.normalizeStatus ? admin.normalizeStatus(order.fulfillmentStatus) : order.fulfillmentStatus}`}>{order.fulfillmentStatus}</span> : null}
                                    </div>
                                </div>
                                <button onClick={() => admin.closeOrderDetails && admin.closeOrderDetails()} className="icon-btn">
                                    <Icon name="x" className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="admin-modal-body custom-scrollbar">
                                {orderDetailsModal.loading ? (
                                    <p style={{ margin: 0, color: 'var(--muted)' }}>Loading order details...</p>
                                ) : order ? (
                                    <div style={{ display: 'grid', gap: '20px' }}>
                                    <div style={grid(320)}>
                                        <section style={{ display: 'grid', gap: '16px' }}>
                                            <div style={grid(140)}>
                                                <div style={card}><span style={label}>Total</span><strong style={{ ...mono, fontSize: '20px', color: '#f8fafc' }}>{admin.currency ? admin.currency(order.total) : order.total}</strong></div>
                                                <div style={card}><span style={label}>Subtotal</span><strong style={{ ...mono, fontSize: '20px', color: '#f8fafc' }}>{admin.currency ? admin.currency(order.subtotal) : order.subtotal}</strong></div>
                                                <div style={card}><span style={label}>Shipping</span><strong style={{ ...mono, fontSize: '20px', color: '#f8fafc' }}>{admin.currency ? admin.currency(order.shippingFee) : order.shippingFee}</strong></div>
                                                <div style={card}><span style={label}>Created</span><strong style={{ ...mono, fontSize: '12px', color: '#f8fafc' }}>{admin.dateTime ? admin.dateTime(order.createdAt) : order.createdAt}</strong></div>
                                            </div>
                                            <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Order Items</h4>
                                                    <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{admin.number ? admin.number(items.length) : items.length} item(s)</span>
                                                </div>
                                                <div style={{ display: 'grid', gap: '12px' }}>
                                                    {items.length ? items.map((item, index) => (
                                                        <div key={item.productId || index} style={{ display: 'grid', gap: '12px', padding: '14px', border: '1px solid var(--border)', background: 'rgba(10, 10, 18, 0.86)' }}>
                                                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                                                <div style={{ width: '64px', height: '64px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                                    {admin.orderItemImage && admin.orderItemImage(item) ? <img src={admin.orderItemImage(item)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ ...mono, color: 'var(--muted)' }}>{admin.orderItemInitial ? admin.orderItemInitial(item) : 'IT'}</span>}
                                                                </div>
                                                                <div style={{ display: 'grid', gap: '10px', flex: 1, minWidth: 0 }}>
                                                                    <div>
                                                                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>{item.titleSnapshot || 'Item'}</p>
                                                                        <p style={{ margin: '4px 0 0 0', ...mono, fontSize: '11px', color: 'var(--muted)', wordBreak: 'break-all' }}>{item.productId || '-'}</p>
                                                                    </div>
                                                                    <div style={grid(100)}>
                                                                        <div style={card}><span style={label}>Qty</span><strong style={mono}>{admin.number ? admin.number(item.qty) : item.qty}</strong></div>
                                                                        <div style={card}><span style={label}>Unit</span><strong style={mono}>{admin.currency ? admin.currency(item.unitPrice) : item.unitPrice}</strong></div>
                                                                        <div style={card}><span style={label}>Subtotal</span><strong style={mono}>{admin.currency ? admin.currency(admin.orderItemSubtotal ? admin.orderItemSubtotal(item) : ((Number(item.qty) || 0) * (Number(item.unitPrice) || 0))) : ''}</strong></div>
                                                                        <div style={card}><span style={label}>Type</span><strong style={{ color: '#f8fafc' }}>{item.type || 'fixed'}</strong></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )) : <div style={{ ...card, textAlign: 'center', color: 'var(--muted)' }}>No order items.</div>}
                                                </div>
                                            </div>
                                        </section>

                                        <section style={{ display: 'grid', gap: '16px' }}>
                                            <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Order Summary</h4>
                                                <div style={grid(180)}>
                                                    <div style={card}><span style={label}>Customer</span><strong style={{ color: '#f8fafc' }}>{order.customerName || order.displayCustomer || '-'}</strong></div>
                                                    <div style={card}><span style={label}>Email</span><strong style={{ ...mono, color: '#f8fafc', wordBreak: 'break-all' }}>{order.customerEmail || '-'}</strong></div>
                                                    <div style={card}><span style={label}>Payment Method</span><strong style={{ color: '#f8fafc' }}>{order.paymentMethod || '-'}</strong></div>
                                                    <div style={card}><span style={label}>Discount</span><strong style={{ ...mono, color: '#f8fafc' }}>{admin.currency ? admin.currency(order.discount) : order.discount}</strong></div>
                                                </div>
                                            </div>

                                            <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Status + Customer Note</h4>
                                                <div style={{ display: 'grid', gap: '14px' }}>
                                                    <div style={grid(180)}>
                                                        <div>
                                                            <label style={label}>Payment</label>
                                                            <select value={orderDetailsModal.draft?.paymentStatus || 'unpaid'} onChange={(event) => admin.orderDetailsModal?.draft && (admin.orderDetailsModal.draft.paymentStatus = event.target.value)} className="order-filter-select" style={{ width: '100%' }}>
                                                                <option value="unpaid">Unpaid</option>
                                                                <option value="paid">Paid</option>
                                                                <option value="refunded">Refunded</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label style={label}>Fulfillment</label>
                                                            <select value={orderDetailsModal.draft?.fulfillmentStatus || 'pending'} onChange={(event) => admin.orderDetailsModal?.draft && (admin.orderDetailsModal.draft.fulfillmentStatus = event.target.value)} className="order-filter-select" style={{ width: '100%' }}>
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
                                                        <textarea value={orderDetailsModal.draft?.customerNote || ''} onChange={(event) => admin.orderDetailsModal?.draft && (admin.orderDetailsModal.draft.customerNote = event.target.value)} rows="4" maxLength="1000" placeholder="Customer note..." className="admin-search-input custom-scrollbar" style={{ width: '100%', minHeight: '108px', resize: 'vertical' }} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                                <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700 }}>Shipping Address</h4>
                                                <div style={grid(220)}>
                                                    <div><label style={label}>Full Name</label><input value={orderDetailsModal.draft?.shippingAddress?.fullName || ''} onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.fullName = event.target.value)} placeholder="Full name" className="admin-search-input" style={{ width: '100%' }} /></div>
                                                    <div><label style={label}>Phone</label><input value={orderDetailsModal.draft?.shippingAddress?.phone || ''} onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.phone = event.target.value)} placeholder="Phone" className="admin-search-input" style={{ width: '100%' }} /></div>
                                                    <div style={{ gridColumn: '1 / -1' }}><label style={label}>Address Line 1</label><input value={orderDetailsModal.draft?.shippingAddress?.addressLine1 || ''} onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.addressLine1 = event.target.value)} placeholder="Address line 1" className="admin-search-input" style={{ width: '100%' }} /></div>
                                                    <div style={{ gridColumn: '1 / -1' }}><label style={label}>Address Line 2</label><input value={orderDetailsModal.draft?.shippingAddress?.addressLine2 || ''} onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.addressLine2 = event.target.value)} placeholder="Address line 2" className="admin-search-input" style={{ width: '100%' }} /></div>
                                                    <div><label style={label}>Area</label><input value={orderDetailsModal.draft?.shippingAddress?.area || ''} onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.area = event.target.value)} placeholder="Area" className="admin-search-input" style={{ width: '100%' }} /></div>
                                                    <div><label style={label}>City</label><input value={orderDetailsModal.draft?.shippingAddress?.city || ''} onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.city = event.target.value)} placeholder="City" className="admin-search-input" style={{ width: '100%' }} /></div>
                                                    <div><label style={label}>Postal Code</label><input value={orderDetailsModal.draft?.shippingAddress?.postalCode || ''} onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.postalCode = event.target.value)} placeholder="Postal code" className="admin-search-input" style={{ width: '100%' }} /></div>
                                                    <div><label style={label}>Country</label><input value={orderDetailsModal.draft?.shippingAddress?.country || 'BD'} onChange={(event) => admin.orderDetailsModal?.draft?.shippingAddress && (admin.orderDetailsModal.draft.shippingAddress.country = event.target.value)} placeholder="Country" className="admin-search-input" style={{ width: '100%' }} /></div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                    </div>
                                ) : <p style={{ margin: 0, color: 'var(--muted)' }}>Order data is not available.</p>}
                            </div>
                            <div className="admin-modal-foot">
                                <button onClick={() => admin.closeOrderDetails && admin.closeOrderDetails()} className="secondary-btn">Close</button>
                                <button onClick={() => admin.saveOrderDetails && admin.saveOrderDetails()} disabled={orderDetailsModal.saving || orderDetailsModal.loading} className="primary-btn">{orderDetailsModal.saving ? 'Saving...' : 'Save Changes'}</button>
                            </div>
                        </div>
                    </div>
                </AdminModalPortal>
            )}
        </>
    );
}
