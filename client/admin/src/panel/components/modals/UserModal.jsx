import React from 'react';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';
import { AdminModalPortal } from './AdminModalPortal';

const mono = { fontFamily: '"Share Tech Mono", monospace' };
const label = { display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' };
const card = { display: 'grid', gap: '6px', padding: '12px', border: '1px solid var(--border)', background: 'rgba(15, 15, 25, 0.72)' };
const grid = (min) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: '12px' });

export function UserModal() {
    const admin = useAdmin();
    const { selectedUserDetails, userDetailsDraft, userDetailsLoading, userDetailsSaving } = admin;
    const details = selectedUserDetails;
    const orders = Array.isArray(details?.recentOrders) ? details.recentOrders : [];
    const addresses = Array.isArray(details?.addresses) ? details.addresses : [];
    const [expandedOrders, setExpandedOrders] = React.useState({});

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
        <>
            {(details || userDetailsLoading) && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay" style={{ justifyContent: 'flex-end', padding: 0, zIndex: 1050 }} onClick={(event) => event.target === event.currentTarget && admin.closeUserDetails && admin.closeUserDetails()}>
                        <div style={{ width: 'min(560px, 100vw)', height: '100vh', display: 'flex', flexDirection: 'column', background: 'rgba(10, 10, 18, 0.98)', borderLeft: '1px solid var(--border-strong)', boxShadow: '-18px 0 36px rgba(0, 0, 0, 0.45)' }}>
                            <div className="admin-modal-head">
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>User Detail</h3>
                                    {details?.email ? <p style={{ margin: '6px 0 0 0', ...mono, fontSize: '12px', color: 'var(--muted)', wordBreak: 'break-all' }}>{details.email}</p> : null}
                                </div>
                                <button onClick={() => admin.closeUserDetails && admin.closeUserDetails()} className="icon-btn">
                                    <Icon name="x" className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="admin-modal-body custom-scrollbar">
                                {userDetailsLoading ? (
                                    <p style={{ margin: 0, color: 'var(--muted)' }}>Loading user data...</p>
                                ) : details ? (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                    <div style={grid(180)}>
                                        <div style={card}><span style={label}>Name</span><strong style={{ color: '#f8fafc' }}>{details.name || '-'}</strong></div>
                                        <div style={card}><span style={label}>Role</span><strong style={{ color: '#f8fafc' }}>{details.role || '-'}</strong></div>
                                        <div style={card}><span style={label}>Status</span><strong style={{ color: '#f8fafc' }}>{details.isSuspended ? 'suspended' : 'active'}</strong></div>
                                        <div style={card}><span style={label}>Phone</span><strong style={{ ...mono, color: '#f8fafc' }}>{details.phone || '-'}</strong></div>
                                        <div style={card}><span style={label}>Total Orders</span><strong style={{ ...mono, color: '#f8fafc' }}>{admin.number ? admin.number(details.orderCount) : details.orderCount}</strong></div>
                                        <div style={card}><span style={label}>Total Spent</span><strong style={{ ...mono, color: '#f8fafc' }}>{admin.currency ? admin.currency(details.totalSpent) : details.totalSpent}</strong></div>
                                    </div>

                                    <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Edit User Details</h4>
                                            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Admin editable</span>
                                        </div>
                                        <div style={grid(180)}>
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
                                    </div>

                                    <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Primary Shipping Address</h4>
                                            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>Saved to user profile</span>
                                        </div>
                                        <div style={grid(180)}>
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
                                    </div>

                                    <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Address Book</h4>
                                            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{admin.number ? admin.number(addresses.length) : addresses.length} saved</span>
                                        </div>
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {addresses.length ? addresses.map((address, index) => (
                                                <div key={`${index}-${address.label || address.addressLine1 || 'address'}`} style={card}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                                        <strong style={{ color: '#f8fafc' }}>{address.label || `Address #${index + 1}`}</strong>
                                                        <span style={{ ...mono, color: 'var(--muted)', fontSize: '11px' }}>{address.phone || '-'}</span>
                                                    </div>
                                                    <span style={{ color: '#cbd5f5', fontSize: '13px' }}>{address.fullName || details.name || '-'}</span>
                                                    <span style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5 }}>{[address.addressLine1, address.addressLine2, address.area, address.city, address.postalCode, address.country].filter(Boolean).join(', ') || '-'}</span>
                                                </div>
                                            )) : <p style={{ margin: 0, color: 'var(--muted)' }}>No saved addresses.</p>}
                                        </div>
                                    </div>

                                    <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>User Orders</h4>
                                            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{admin.number ? admin.number(orders.length) : orders.length} loaded</span>
                                        </div>
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
                                                                <p style={{ margin: 0, ...mono, fontSize: '14px', color: '#f8fafc' }}>{order.orderNumber}</p>
                                                                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>{admin.date ? admin.date(order.createdAt) : order.createdAt}</p>
                                                            </div>
                                                            <div className="user-order-toggle-meta">
                                                                <div className="user-order-toggle-total">
                                                                    <span>Total</span>
                                                                    <strong style={{ ...mono }}>{admin.currency ? admin.currency(order.total) : order.total}</strong>
                                                                </div>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
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
                                                                <div style={card}><span style={label}>Method</span><strong style={{ color: '#f8fafc' }}>{order.paymentMethod || '-'}</strong></div>
                                                                <div style={card}><span style={label}>Subtotal</span><strong style={{ ...mono, color: '#f8fafc' }}>{admin.currency ? admin.currency(order.subtotal) : order.subtotal}</strong></div>
                                                                <div style={card}><span style={label}>Shipping</span><strong style={{ ...mono, color: '#f8fafc' }}>{admin.currency ? admin.currency(order.shippingFee) : order.shippingFee}</strong></div>
                                                                <div style={card}><span style={label}>Discount</span><strong style={{ ...mono, color: '#f8fafc' }}>{admin.currency ? admin.currency(order.discount) : order.discount}</strong></div>
                                                                <div style={card}><span style={label}>Total</span><strong style={{ ...mono, color: 'var(--primary)' }}>{admin.currency ? admin.currency(order.total) : order.total}</strong></div>
                                                            </div>

                                                            <div style={card}>
                                                                <span style={label}>Customer Note</span>
                                                                <span style={{ color: '#e2e8f0', fontSize: '13px', whiteSpace: 'pre-line' }}>{order.customerNote || '-'}</span>
                                                            </div>

                                                            <div style={card}>
                                                                <span style={label}>Shipping Address</span>
                                                                <span style={{ color: '#f8fafc', fontSize: '13px' }}>{order.shippingAddress?.fullName || details.name || '-'}</span>
                                                                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{order.shippingAddress?.phone || details.phone || '-'}</span>
                                                                <span style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5 }}>{[order.shippingAddress?.addressLine1, order.shippingAddress?.addressLine2, order.shippingAddress?.area, order.shippingAddress?.city, order.shippingAddress?.postalCode, order.shippingAddress?.country].filter(Boolean).join(', ') || '-'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )) : <p style={{ margin: 0, color: 'var(--muted)' }}>No orders found for this user.</p>}
                                        </div>
                                    </div>
                                    </div>
                                ) : <p style={{ margin: 0, color: 'var(--muted)' }}>User details are not available.</p>}
                            </div>
                            <div className="admin-modal-foot">
                                <button onClick={() => admin.closeUserDetails && admin.closeUserDetails()} className="order-filter-btn">Close</button>
                                <button
                                    onClick={() => admin.saveUserDetails && admin.saveUserDetails()}
                                    className="order-filter-btn primary"
                                    disabled={userDetailsLoading || userDetailsSaving || !details}
                                >
                                    {userDetailsSaving ? 'Saving...' : 'Save User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </AdminModalPortal>
            )}
        </>
    );
}
