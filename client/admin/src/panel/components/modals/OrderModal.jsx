import React from 'react';
import { useMatch } from 'react-router-dom';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';
import { OrderDetailsSurface } from '../orders/OrderDetailsSurface';
import { AdminModalPortal } from './AdminModalPortal';
import { ADMIN_ORDER_CREATE_PATH, ADMIN_ORDER_DETAILS_PATH } from '../../../app/router/adminPaths';

const mono = { fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif', fontVariantNumeric: 'tabular-nums' };
const label = { display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' };
const card = { display: 'grid', gap: '6px', padding: '12px', border: '1px solid var(--border)', background: 'rgba(15, 15, 25, 0.72)' };
const grid = (min) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: '12px' });

export function OrderModal() {
    const admin = useAdmin();
    const isOrderDetailsRoute = Boolean(useMatch(ADMIN_ORDER_DETAILS_PATH));
    const isOrderCreateRoute = Boolean(useMatch(ADMIN_ORDER_CREATE_PATH));
    const { courierSuccessModal = {}, orderDetailsModal = {} } = admin;
    const courierLoading = Boolean(courierSuccessModal.loading);

    return (
        <>
            {courierSuccessModal.open && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay misc-soft-overlay admin-layout--soft" style={{ zIndex: 1090 }} onClick={(event) => event.target === event.currentTarget && admin.closeCourierSuccessModal && admin.closeCourierSuccessModal()}>
                        <div className="admin-modal misc-soft-modal" style={{ maxWidth: '640px' }}>
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

            {orderDetailsModal.open && !isOrderDetailsRoute && !isOrderCreateRoute && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay misc-soft-overlay admin-layout--soft" style={{ zIndex: 1080 }} onClick={(event) => event.target === event.currentTarget && admin.closeOrderDetails && admin.closeOrderDetails()}>
                        <OrderDetailsSurface variant="modal" onClose={() => admin.closeOrderDetails && admin.closeOrderDetails()} />
                    </div>
                </AdminModalPortal>
            )}
        </>
    );
}
