import React from 'react';
import { Clock3, Code2, Eye, ImagePlus, Mail, RefreshCw, Send, Settings2, Trash2, Type, Users, X } from 'lucide-react';
import { useAdmin } from '../AdminContext';
import { DashboardSection } from '../components/dashboard/DashboardSection';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';

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

function compactPacingLabel(intervalMs) {
    if (!intervalMs) {
        return 'Unlimited';
    }

    if (intervalMs < 60 * 1000) {
        return `${Math.max(1, Math.round(intervalMs / 1000))}s`;
    }

    if (intervalMs < 60 * 60 * 1000) {
        return `${Number((intervalMs / 60000).toFixed(1))}m`;
    }

    return `${Number((intervalMs / 3600000).toFixed(1))}h`;
}

function campaignStatusClass(normalizedStatus) {
    if (normalizedStatus === 'draft') return 'status-cancelled';
    if (normalizedStatus === 'queued') return 'status-pending';
    if (normalizedStatus === 'sending') return 'status-scheduled';
    if (normalizedStatus === 'failed') return 'status-cancelled';
    return 'status-live';
}

function ComposerBlockHeader({ icon: Icon, title, extra = null }) {
    return (
        <div className="campaigns-block-head">
            <div className="campaigns-block-head__title">
                <span className="campaigns-block-head__icon">
                    <Icon size={14} />
                </span>
                <h4>{title}</h4>
            </div>
            {extra}
        </div>
    );
}

function CampaignTemplatePicker({ admin, emailTemplates, selectedTemplateKey, activeTemplate }) {
    if (!emailTemplates.length) {
        return (
            <div className="campaigns-composer-block campaigns-composer-block--empty">
                <div className="campaigns-section-copy">
                    <ComposerBlockHeader icon={Mail} title="Template" />
                    <strong>No templates</strong>
                </div>
                <button
                    type="button"
                    onClick={() => admin.setActiveTab && admin.setActiveTab('settings')}
                    className="order-filter-btn"
                >
                    <Settings2 size={14} />
                    <span>Open Settings</span>
                </button>
            </div>
        );
    }

    return (
        <div className="campaigns-composer-block">
            <ComposerBlockHeader
                icon={Mail}
                title="Template"
                extra={activeTemplate ? <span className="campaigns-template-chip">{activeTemplate.key}</span> : null}
            />

            <div className="campaigns-template-row">
                <div className="campaigns-field campaigns-field--full">
                    <label className="campaigns-field-label sr-only" htmlFor="campaign-template-select">Email Template</label>
                    <select
                        id="campaign-template-select"
                        value={selectedTemplateKey || ''}
                        onChange={(event) => {
                            if (admin.applyEmailTemplateToCampaign) {
                                admin.applyEmailTemplateToCampaign(event.target.value);
                            }
                        }}
                        className="order-filter-select campaigns-select"
                    >
                        <option value="">Select a settings template</option>
                        {emailTemplates.map((template) => (
                            <option key={template.key} value={template.key}>
                                {template.key}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="campaigns-template-actions">
                    <button
                        type="button"
                        onClick={() => admin.setActiveTab && admin.setActiveTab('settings')}
                        className="order-filter-btn campaigns-icon-btn"
                        title="Manage templates"
                        aria-label="Manage templates"
                    >
                        <Settings2 size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => admin.clearCampaignTemplateSelection && admin.clearCampaignTemplateSelection()}
                        className="order-filter-btn campaigns-icon-btn"
                        disabled={!selectedTemplateKey}
                        title="Clear template"
                        aria-label="Clear template"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function CampaignRateControls({ admin, campaignDraft, draftIntervalMs }) {
    return (
        <div className="campaigns-footer-panel">
            <ComposerBlockHeader
                icon={Clock3}
                title="Rate"
                extra={<span className="campaigns-mini-pill">{compactPacingLabel(draftIntervalMs)}</span>}
            />

            <div className="campaigns-rate-grid">
                <label className="campaigns-field">
                    <span className="campaigns-field-label">Hourly</span>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={campaignDraft.hourlyRateLimit || '0'}
                        onChange={(event) => { admin.campaignDraft.hourlyRateLimit = event.target.value; }}
                        className="admin-search-input mono"
                        placeholder="0"
                    />
                </label>

                <label className="campaigns-field">
                    <span className="campaigns-field-label">Daily</span>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        value={campaignDraft.dailyRateLimit || '0'}
                        onChange={(event) => { admin.campaignDraft.dailyRateLimit = event.target.value; }}
                        className="admin-search-input mono"
                        placeholder="0"
                    />
                </label>
            </div>
        </div>
    );
}

function CampaignComposer({ admin, emailTemplates, selectedTemplateKey, campaignDraft, draftIntervalMs }) {
    const activeTemplate = emailTemplates.find((template) => template.key === selectedTemplateKey) || null;

    return (
        <DashboardSection
            eyebrow="Campaign Composer"
            title="Draft"
            className="campaigns-section campaigns-section--composer"
        >
            <div className="campaigns-composer-surface admin-inset-card">
                <CampaignTemplatePicker
                    admin={admin}
                    emailTemplates={emailTemplates}
                    selectedTemplateKey={selectedTemplateKey}
                    activeTemplate={activeTemplate}
                />

                <div className="campaigns-composer-block campaigns-composer-main">
                    <ComposerBlockHeader icon={Type} title="Subject" />

                    <div className="campaigns-field campaigns-field--full">
                        <label className="campaigns-field-label sr-only" htmlFor="campaign-subject">Subject</label>
                        <input
                            id="campaign-subject"
                            value={campaignDraft.subject || ''}
                            onChange={(event) => { admin.campaignDraft.subject = event.target.value; }}
                            placeholder="Campaign subject"
                            className="admin-search-input"
                        />
                    </div>

                    <ComposerBlockHeader icon={Code2} title="HTML" />

                    <div className="campaigns-field campaigns-field--full">
                        <label className="campaigns-field-label sr-only" htmlFor="campaign-html">HTML Content</label>
                        <textarea
                            id="campaign-html"
                            value={campaignDraft.html || ''}
                            onChange={(event) => { admin.campaignDraft.html = event.target.value; }}
                            placeholder="Compose campaign HTML..."
                            className="admin-search-input mono campaigns-textarea"
                        />
                    </div>
                </div>

                <div className="campaigns-composer-footer">
                    <CampaignRateControls
                        admin={admin}
                        campaignDraft={campaignDraft}
                        draftIntervalMs={draftIntervalMs}
                    />

                    <div className="campaigns-footer-panel">
                        <ComposerBlockHeader icon={ImagePlus} title="Assets" />

                        <div className="campaigns-inline-actions">
                            <button
                                type="button"
                                onClick={() => admin.openEmailMediaPicker && admin.openEmailMediaPicker('campaign')}
                                className="order-filter-btn campaigns-icon-btn"
                                title="Insert image"
                                aria-label="Insert image"
                            >
                                <ImagePlus size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => admin.setActiveTab && admin.setActiveTab('media')}
                                className="order-filter-btn campaigns-icon-btn"
                                title="Open media library"
                                aria-label="Open media library"
                            >
                                <Eye size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="campaigns-submit-row">
                    <button
                        type="button"
                        onClick={() => admin.previewCampaignDraft && admin.previewCampaignDraft()}
                        className="order-filter-btn"
                    >
                        <Eye size={14} />
                        <span>Preview</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => admin.createCampaign && admin.createCampaign()}
                        className="order-filter-btn primary"
                    >
                        <Send size={14} />
                        <span>Save</span>
                    </button>
                </div>
            </div>
        </DashboardSection>
    );
}

function CampaignQueueCard({ admin, campaign }) {
    const normalizedStatus = admin.normalizeStatus ? admin.normalizeStatus(campaign.status) : String(campaign.status || '').toLowerCase();
    const statusClass = campaignStatusClass(normalizedStatus);
    const isQueueActive = normalizedStatus === 'queued' || normalizedStatus === 'sending';
    const intervalMs = intervalMsFromLimits(campaign.hourlyRateLimit, campaign.dailyRateLimit);
    const subject = String(campaign.subject || '').trim() || 'Untitled campaign';
    const nextSendLabel = campaign.nextSendAt ? (admin.dateTime ? admin.dateTime(campaign.nextSendAt) : campaign.nextSendAt) : '';

    return (
        <article className="campaigns-queue-card admin-inset-card">
            <div className="campaigns-queue-card__head">
                <div className="campaigns-queue-card__copy">
                    <div className="campaigns-queue-card__title-row">
                        <strong>{subject}</strong>
                        <span className={`status-badge ${statusClass}`}>{campaign.status}</span>
                    </div>
                    <div className="campaigns-queue-card__meta">
                        <span className="campaigns-queue-chip" title="Pace">
                            <Clock3 size={13} />
                            <span>{compactPacingLabel(intervalMs)}</span>
                        </span>
                        <span className="campaigns-queue-chip" title="Hourly / Daily">
                            <Send size={13} />
                            <span>{campaign.hourlyRateLimit || 0}/{campaign.dailyRateLimit || 0}</span>
                        </span>
                        {nextSendLabel ? (
                            <span className="campaigns-queue-chip" title="Next send">
                                <RefreshCw size={13} />
                                <span>{nextSendLabel}</span>
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="campaigns-table-actions">
                    <button
                        type="button"
                        onClick={() => admin.sendCampaign && admin.sendCampaign(campaign)}
                        disabled={isQueueActive}
                        className="order-filter-btn primary campaigns-icon-btn"
                        title={isQueueActive ? 'Queued' : 'Send'}
                        aria-label={isQueueActive ? 'Queued' : 'Send'}
                    >
                        <Send size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => admin.resendCampaign && admin.resendCampaign(campaign)}
                        disabled={isQueueActive}
                        className="order-filter-btn campaigns-icon-btn"
                        title="Resend"
                        aria-label="Resend"
                    >
                        <RefreshCw size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => admin.deleteCampaign && admin.deleteCampaign(campaign)}
                        className="order-filter-btn danger campaigns-icon-btn"
                        title="Delete"
                        aria-label="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="campaigns-queue-card__stats">
                <div className="campaigns-queue-card__stat">
                    <span className="campaigns-queue-card__stat-label"><Users size={13} /></span>
                    <strong className="campaigns-queue-card__stat-value mono" title="Recipients">
                        {admin.number ? admin.number(campaign.totalRecipients) : campaign.totalRecipients}
                    </strong>
                </div>
                <div className="campaigns-queue-card__stat">
                    <span className="campaigns-queue-card__stat-label"><Send size={13} /></span>
                    <strong className="campaigns-queue-card__stat-value campaigns-queue-card__stat-value--sent mono" title="Sent">
                        {admin.number ? admin.number(campaign.sentCount) : campaign.sentCount}
                    </strong>
                </div>
                <div className="campaigns-queue-card__stat">
                    <span className="campaigns-queue-card__stat-label"><Eye size={13} /></span>
                    <strong className="campaigns-queue-card__stat-value campaigns-queue-card__stat-value--opened mono" title="Opened">
                        {admin.number ? admin.number(campaign.openCount) : campaign.openCount}
                    </strong>
                </div>
            </div>
        </article>
    );
}

function CampaignList({ admin, campaigns }) {
    return (
        <DashboardSection
            eyebrow="Campaign Queue"
            title="Queue"
            className="campaigns-section campaigns-section--list"
            actions={(
                <button
                    type="button"
                    onClick={() => admin.loadCampaigns && admin.loadCampaigns(true)}
                    className="order-filter-btn"
                >
                    <RefreshCw size={14} />
                    <span>Reload</span>
                </button>
            )}
        >
            <div className="campaigns-queue-list">
                {campaigns.map((campaign) => (
                    <CampaignQueueCard key={campaign.id} admin={admin} campaign={campaign} />
                ))}
                {campaigns.length === 0 && (
                    <div className="campaigns-empty-state admin-inset-card">
                        No campaigns found. Create a draft from the composer to start building your email queue.
                    </div>
                )}
            </div>
        </DashboardSection>
    );
}

export function CampaignsTab() {
    const admin = useAdmin();
    const {
        campaigns = [],
        campaignDraft = {},
        emailTemplates = [],
        selectedCampaignTemplateKey = ''
    } = admin;
    const campaignTemplates = emailTemplates.filter((template) => !template.isSystem);
    const activeCampaignTemplateKey = campaignTemplates.some((template) => template.key === selectedCampaignTemplateKey)
        ? selectedCampaignTemplateKey
        : '';

    const draftIntervalMs = intervalMsFromLimits(campaignDraft.hourlyRateLimit, campaignDraft.dailyRateLimit);
    const queuedCount = campaigns.filter((campaign) => {
        const status = admin.normalizeStatus ? admin.normalizeStatus(campaign.status) : String(campaign.status || '').toLowerCase();
        return status === 'queued' || status === 'sending';
    }).length;
    const deliveredCount = campaigns.reduce((total, campaign) => total + Number(campaign.sentCount || 0), 0);

    return (
        <div className="campaigns-shell">
            <div className="admin-tab-header">
                <div>
                    <h2>Campaigns</h2>
                    <p>Template-driven email campaigns.</p>
                </div>
                <button onClick={() => admin.loadCampaigns && admin.loadCampaigns(true)} className="order-filter-btn">
                    <RefreshCw size={14} />
                    <span>Reload</span>
                </button>
            </div>

            <div className="dashboard-stat-grid dashboard-stat-grid--primary">
                <DashboardStatCard
                    icon="megaphone"
                    label="Campaign Library"
                    value={admin.number ? admin.number(campaigns.length) : campaigns.length}
                    meta="Saved campaign drafts"
                    tone="stone"
                    featured
                />
                <DashboardStatCard
                    icon="mail"
                    label="Shared Templates"
                    value={admin.number ? admin.number(campaignTemplates.length) : campaignTemplates.length}
                    meta="Loaded from settings"
                    tone="olive"
                    compact
                />
                <DashboardStatCard
                    icon="send"
                    label="Queued / Sending"
                    value={admin.number ? admin.number(queuedCount) : queuedCount}
                    meta="Active delivery jobs"
                    tone="sand"
                    compact
                />
                <DashboardStatCard
                    icon="badge-check"
                    label="Emails Sent"
                    value={admin.number ? admin.number(deliveredCount) : deliveredCount}
                    meta="Across all campaigns"
                    tone="sage"
                    compact
                />
            </div>

            <div className="campaigns-layout">
                <CampaignComposer
                    admin={admin}
                    emailTemplates={campaignTemplates}
                    selectedTemplateKey={activeCampaignTemplateKey}
                    campaignDraft={campaignDraft}
                    draftIntervalMs={draftIntervalMs}
                />
                <CampaignList admin={admin} campaigns={campaigns} />
            </div>
        </div>
    );
}
