import React from 'react';
import { useAdmin } from '../AdminContext';

function clampRate(value) {
    const parsed = Math.max(0, Math.floor(Number(value || 0)));
    return Number.isFinite(parsed) ? parsed : 0;
}

function intervalMsFromLimits(hourlyRateLimit, dailyRateLimit) {
    const windows = [];
    const hourly = clampRate(hourlyRateLimit);
    const daily = clampRate(dailyRateLimit);

    if (hourly > 0) {
        windows.push((60 * 60 * 1000) / hourly);
    }
    if (daily > 0) {
        windows.push((24 * 60 * 60 * 1000) / daily);
    }

    if (!windows.length) {
        return 0;
    }

    return Math.ceil(Math.max(...windows));
}

function formatPacingLabel(intervalMs) {
    if (!intervalMs) {
        return 'Unlimited speed. Emails can be sent immediately.';
    }

    if (intervalMs < 60 * 1000) {
        return `One email every ${Math.max(1, Math.round(intervalMs / 1000))} second(s).`;
    }

    if (intervalMs < 60 * 60 * 1000) {
        return `One email every ${Number((intervalMs / 60000).toFixed(2))} minute(s).`;
    }

    return `One email every ${Number((intervalMs / 3600000).toFixed(2))} hour(s).`;
}

export function CampaignsTab() {
    const admin = useAdmin();
    const { campaigns = [], campaignDraft = {}, campaignTemplates = [], selectedCampaignTemplateId, campaignTemplateName } = admin;
    const draftIntervalMs = intervalMsFromLimits(campaignDraft.hourlyRateLimit, campaignDraft.dailyRateLimit);

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div className="admin-tab-header">
                <div>
                    <h2>Campaigns</h2>
                    <p>Create and send email marketing campaigns to your subscribers.</p>
                </div>
                <button onClick={() => admin.loadCampaigns && admin.loadCampaigns(true)} className="order-filter-btn">Reload</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', alignItems: 'start' }}>
                <div className="admin-card" style={{ display: 'grid', gap: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Create Campaign</h3>
                    <div className="admin-inset-card" style={{ padding: '16px', borderRadius: '20px', display: 'grid', gap: '12px', marginBottom: 0 }}>
                        <p className="admin-soft-value" style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>Campaign Templates</p>
                        <div style={{ display: 'grid', gap: '8px' }}>
                            <input
                                value={campaignTemplateName || ''}
                                onChange={(e) => { admin.campaignTemplateName = e.target.value; }}
                                placeholder="Template name (custom)"
                                className="admin-search-input"
                            />
                            <select
                                value={selectedCampaignTemplateId || ''}
                                onChange={(e) => {
                                    admin.selectedCampaignTemplateId = e.target.value;
                                    if (admin.applyCampaignTemplateById) admin.applyCampaignTemplateById(e.target.value);
                                }}
                                className="order-filter-select"
                            >
                                <option value="">Select saved template</option>
                                {campaignTemplates.map(template => (
                                    <option key={template.id} value={template.id}>{template.name}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            <button onClick={() => admin.saveCampaignTemplate && admin.saveCampaignTemplate()} className="order-filter-btn primary" style={{ padding: '6px 0' }}>{selectedCampaignTemplateId ? 'Update' : 'Save'}</button>
                            <button onClick={() => admin.clearCampaignTemplateSelection && admin.clearCampaignTemplateSelection()} className="order-filter-btn" style={{ padding: '6px 0' }}>New</button>
                            <button onClick={() => admin.deleteCampaignTemplate && admin.deleteCampaignTemplate()} className="order-filter-btn danger" style={{ padding: '6px 0' }}>Delete</button>
                        </div>
                        <p className="admin-soft-help" style={{ fontSize: '11px', margin: 0 }}>Use custom template names and reuse them for future campaigns.</p>
                    </div>
                    <input
                        value={campaignDraft.subject || ''}
                        onChange={(e) => { admin.campaignDraft.subject = e.target.value; }}
                        placeholder="Subject"
                        className="admin-search-input"
                        style={{ fontSize: '14px' }}
                    />
                    <textarea
                        value={campaignDraft.html || ''}
                        onChange={(e) => { admin.campaignDraft.html = e.target.value; }}
                        placeholder="HTML content..."
                        className="admin-search-input mono"
                        style={{ height: '240px', padding: '12px', resize: 'vertical' }}
                    ></textarea>
                    <div className="admin-inset-card" style={{ marginBottom: 0, display: 'grid', gap: '12px' }}>
                        <div>
                            <p className="admin-soft-value" style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 4px 0' }}>Sending Rate Control</p>
                            <p className="admin-soft-help" style={{ fontSize: '11px', margin: 0 }}>Set paced delivery limits. Example: hourly rate <span className="mono">3</span> sends one email every <span className="mono">20</span> minutes.</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                            <label style={{ display: 'grid', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Hourly Rate</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={campaignDraft.hourlyRateLimit || '0'}
                                    onChange={(e) => { admin.campaignDraft.hourlyRateLimit = e.target.value; }}
                                    className="admin-search-input"
                                    placeholder="0 = unlimited"
                                />
                            </label>
                            <label style={{ display: 'grid', gap: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Daily Rate</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={campaignDraft.dailyRateLimit || '0'}
                                    onChange={(e) => { admin.campaignDraft.dailyRateLimit = e.target.value; }}
                                    className="admin-search-input"
                                    placeholder="0 = unlimited"
                                />
                            </label>
                        </div>
                        <p className="admin-soft-help" style={{ fontSize: '11px', margin: 0 }}>
                            Effective pace: <span className="mono admin-soft-value">{formatPacingLabel(draftIntervalMs)}</span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <button onClick={() => admin.openEmailMediaPicker && admin.openEmailMediaPicker('campaign')} className="order-filter-btn">Insert Uploaded Image Tag</button>
                        <button onClick={() => admin.setActiveTab && admin.setActiveTab('media')} className="order-filter-btn">Open Media</button>
                        <p className="admin-soft-help" style={{ fontSize: '11px', margin: '4px 0 0 0', width: '100%' }}>Build campaign HTML with uploaded images quickly.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
                        <button onClick={() => admin.previewCampaignDraft && admin.previewCampaignDraft()} className="order-filter-btn" style={{ width: '100%', padding: '10px', fontSize: '14px' }}>Preview HTML</button>
                        <button onClick={() => admin.createCampaign && admin.createCampaign()} className="order-filter-btn primary" style={{ width: '100%', padding: '10px', fontSize: '14px' }}>Create Draft</button>
                    </div>
                </div>
                <div className="admin-card no-pad" style={{ gridColumn: 'span 2' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Existing Campaigns</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Status</th>
                                    <th>Recipients</th>
                                    <th>Sent</th>
                                    <th>Opened</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map(campaign => {
                                    const normalizedStatus = admin.normalizeStatus ? admin.normalizeStatus(campaign.status) : campaign.status;
                                    const statusClass =
                                        normalizedStatus === 'draft'
                                            ? 'status-cancelled'
                                            : normalizedStatus === 'queued'
                                                ? 'status-pending'
                                                : normalizedStatus === 'sending'
                                                    ? 'status-scheduled'
                                                    : normalizedStatus === 'failed'
                                                        ? 'status-cancelled'
                                                        : 'status-live';
                                    const isQueueActive = normalizedStatus === 'queued' || normalizedStatus === 'sending';
                                    const intervalMs = intervalMsFromLimits(campaign.hourlyRateLimit, campaign.dailyRateLimit);

                                    return (
                                        <tr key={campaign.id}>
                                            <td style={{ fontWeight: 700 }}>
                                                <div style={{ display: 'grid', gap: '6px' }}>
                                                    <span>{campaign.subject}</span>
                                                    <span className="mono admin-soft-help" style={{ fontSize: '11px' }}>
                                                        H {campaign.hourlyRateLimit || 0}/h | D {campaign.dailyRateLimit || 0}/day | {formatPacingLabel(intervalMs)}
                                                        {campaign.nextSendAt ? ` | Next ${admin.dateTime ? admin.dateTime(campaign.nextSendAt) : campaign.nextSendAt}` : ''}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${statusClass}`}>{campaign.status}</span>
                                            </td>
                                            <td className="mono admin-soft-value">{admin.number ? admin.number(campaign.totalRecipients) : ''}</td>
                                            <td className="mono" style={{ color: 'var(--primary)', fontWeight: 700 }}>{admin.number ? admin.number(campaign.sentCount) : ''}</td>
                                            <td className="mono" style={{ color: '#10b981', fontWeight: 700 }}>{admin.number ? admin.number(campaign.openCount) : ''}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => admin.sendCampaign && admin.sendCampaign(campaign)} disabled={isQueueActive} className="order-filter-btn primary" style={{ padding: '6px 12px' }}>{isQueueActive ? 'Queued' : 'Send'}</button>
                                                    <button onClick={() => admin.resendCampaign && admin.resendCampaign(campaign)} disabled={isQueueActive} className="order-filter-btn" style={{ padding: '6px 12px' }}>Resend</button>
                                                    <button onClick={() => admin.deleteCampaign && admin.deleteCampaign(campaign)} className="order-filter-btn danger" style={{ padding: '6px 12px' }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {campaigns.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center' }} className="admin-soft-help">No campaigns found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
