import React from 'react';
import { useAdmin } from '../../AdminContext';
import { Icon } from '../Icon';
import { AdminModalPortal } from './AdminModalPortal';

const mono = { fontFamily: '"Share Tech Mono", monospace' };
const label = { display: 'block', marginBottom: '6px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' };

export function MiscModals() {
    const admin = useAdmin();
    const { campaignPreview = {}, emailMediaPicker = {}, toast = {}, showSearch, menuItems = [] } = admin;
    const assets = admin.filteredEmailMediaAssets ? admin.filteredEmailMediaAssets() : [];

    return (
        <>
            {campaignPreview.open && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay" style={{ zIndex: 1085 }} onClick={(event) => event.target === event.currentTarget && admin.closeCampaignPreview && admin.closeCampaignPreview()}>
                        <div className="admin-modal" style={{ maxWidth: '1280px', width: 'min(1280px, calc(100vw - 48px))' }}>
                            <div className="admin-modal-head">
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>Campaign HTML Preview</h3>
                                    <p style={{ margin: '6px 0 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                                        Rendered with sample subscriber and site data before sending.
                                    </p>
                                </div>
                                <button onClick={() => admin.closeCampaignPreview && admin.closeCampaignPreview()} className="icon-btn">
                                    <Icon name="x" className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="admin-modal-body custom-scrollbar">
                                {campaignPreview.loading ? (
                                    <p style={{ margin: 0, color: 'var(--muted)' }}>Generating campaign preview...</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '16px' }}>
                                        <div className="admin-inset-card" style={{ marginBottom: 0 }}>
                                            <span style={label}>Rendered Subject</span>
                                            <p style={{ margin: 0, color: '#f8fafc', fontSize: '18px', fontWeight: 700 }}>{campaignPreview.subject || 'No subject rendered.'}</p>
                                        </div>

                                        <div className="admin-inset-card" style={{ marginBottom: 0, display: 'grid', gap: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                                <span style={label}>Rendered HTML</span>
                                                <button
                                                    onClick={() => admin.copyText && admin.copyText(campaignPreview.html || '')}
                                                    className="secondary-btn"
                                                    style={{ padding: '10px 14px' }}
                                                >
                                                    Copy HTML
                                                </button>
                                            </div>
                                            <div className="campaign-preview-frame-wrap">
                                                <iframe
                                                    title="Campaign preview"
                                                    srcDoc={campaignPreview.html || '<p>No preview generated.</p>'}
                                                    className="campaign-preview-frame"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </AdminModalPortal>
            )}

            {emailMediaPicker.open && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay" style={{ zIndex: 1090 }} onClick={(event) => event.target === event.currentTarget && admin.closeEmailMediaPicker && admin.closeEmailMediaPicker()}>
                        <div className="admin-modal" style={{ maxWidth: '1180px' }}>
                            <div className="admin-modal-head">
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>Insert Uploaded Image Tag</h3>
                                    <p style={{ margin: '6px 0 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                                        {emailMediaPicker.target === 'campaign' ? 'Target: Campaign HTML editor' : 'Target: Email template HTML editor'}
                                    </p>
                                </div>
                                <button onClick={() => admin.closeEmailMediaPicker && admin.closeEmailMediaPicker()} className="icon-btn">
                                    <Icon name="x" className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="admin-modal-body custom-scrollbar">
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                        <div>
                                            <label style={label}>Search</label>
                                            <input value={emailMediaPicker.search || ''} onChange={(event) => { if (admin.emailMediaPicker) admin.emailMediaPicker.search = event.target.value; }} placeholder="Search uploaded image..." className="admin-search-input" style={{ width: '100%' }} />
                                        </div>
                                        <div>
                                            <label style={label}>Alt Text</label>
                                            <input value={emailMediaPicker.alt || ''} onChange={(event) => { if (admin.emailMediaPicker) admin.emailMediaPicker.alt = event.target.value; }} placeholder="Alt text (optional)" className="admin-search-input" style={{ width: '100%' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                            <button onClick={() => admin.refreshEmailMediaPicker && admin.refreshEmailMediaPicker()} className="secondary-btn" style={{ width: '100%' }}>
                                                {emailMediaPicker.loading ? 'Loading...' : 'Refresh'}
                                            </button>
                                        </div>
                                    </div>

                                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: '12px' }}>
                                        For templates, insert uses auto placeholders like <span style={mono}>{'{{media.image_file_png}}'}</span>. Campaign target inserts direct media URLs.
                                    </p>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                                        {assets.map((asset) => (
                                            <div key={asset.id} style={{ display: 'grid', gap: '10px', padding: '12px', border: '1px solid var(--border)', background: 'rgba(15, 15, 25, 0.72)' }}>
                                                <div style={{ aspectRatio: '1 / 1', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                                                    <img src={admin.mediaPreviewUrl ? admin.mediaPreviewUrl(asset) : ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={asset.fileName}>{asset.fileName}</p>
                                                <p style={{ margin: 0, ...mono, fontSize: '10px', color: 'var(--primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(asset.fileName) : ''}>
                                                    {admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(asset.fileName) : ''}
                                                </p>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    <button onClick={() => admin.insertEmailImageTag && admin.insertEmailImageTag(asset)} className="primary-btn" style={{ padding: '10px 12px' }}>
                                                        {emailMediaPicker.target === 'campaign' ? 'Insert URL' : 'Insert Tag'}
                                                    </button>
                                                    <button onClick={() => admin.copyText && admin.copyText(emailMediaPicker.target === 'campaign' ? (admin.mediaPreviewUrl ? admin.mediaPreviewUrl(asset) : '') : (admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(asset.fileName) : ''))} className="secondary-btn" style={{ padding: '10px 12px' }}>
                                                        {emailMediaPicker.target === 'campaign' ? 'Copy URL' : 'Copy Tag'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {!assets.length ? <p style={{ margin: 0, color: 'var(--muted)' }}>No uploaded media found.</p> : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </AdminModalPortal>
            )}

            {toast.show && (
                <div className={`admin-toast ${toast.type === 'error' ? 'error' : ''}`} style={toast.type === 'success' ? { borderColor: 'rgba(0, 243, 255, 0.55)', color: '#cffafe' } : undefined}>
                    <p style={{ margin: 0 }}>
                        {toast.type === 'error' ? 'ERROR: ' : toast.type === 'success' ? 'OK: ' : ''}{toast.message}
                    </p>
                </div>
            )}

            {showSearch && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '96px', zIndex: 1000 }} onClick={(event) => event.target === event.currentTarget && admin.setShowSearch && admin.setShowSearch(false)}>
                        <div className="admin-modal" style={{ maxWidth: '720px' }}>
                            <div className="admin-modal-head" style={{ gap: '12px' }}>
                                <Icon name="search" className="w-5 h-5" />
                                <input type="text" placeholder="Jump to command, order, or user..." className="admin-search-input" style={{ flex: 1 }} autoFocus />
                                <span style={{ ...mono, fontSize: '11px', color: 'var(--muted)' }}>ESC</span>
                            </div>
                            <div className="admin-modal-body custom-scrollbar" style={{ maxHeight: '380px' }}>
                                <div style={{ marginBottom: '12px', ...mono, fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.1em' }}>NAVIGATION</div>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {menuItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                if (admin.setActiveTab) admin.setActiveTab(item.id);
                                                if (admin.setShowSearch) admin.setShowSearch(false);
                                            }}
                                            className="secondary-btn"
                                            style={{ width: '100%', justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                                        >
                                            <span>Go to {item.label}</span>
                                            <Icon name="arrow-right" className="w-4 h-4" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </AdminModalPortal>
            )}
        </>
    );
}
