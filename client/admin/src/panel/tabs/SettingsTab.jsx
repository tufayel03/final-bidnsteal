import React, { useState } from 'react';
import { Activity, Eye, ImagePlus, Mail, RefreshCw, Send, ShieldCheck, ShoppingCart, SlidersHorizontal, Truck } from 'lucide-react';
import { useAdmin } from '../AdminContext';

const SETTINGS_TABS = [
    { key: 'templates', label: 'Email Templates', caption: 'Transactional template editor', icon: Mail },
    { key: 'smtp', label: 'SMTP Mailer', caption: 'Mail transport + sender identity', icon: Send },
    { key: 'courier', label: 'Courier Integration', caption: 'Steadfast dispatch + fraud checks', icon: Truck },
    { key: 'checkout', label: 'Checkout Rules', caption: 'Delivery fees + guest orders', icon: ShoppingCart },
    { key: 'preferences', label: 'Local Preferences', caption: 'Browser-only admin behavior', icon: SlidersHorizontal }
];

function ToggleVisual({ checked }) {
    return <span className={`settings-toggle ${checked ? 'is-on' : ''}`} />;
}

function SectionHeader({ kicker, title, description, aside = null }) {
    return (
        <div className="settings-panel-head">
            <div className="settings-panel-copy">
                {kicker ? <p className="settings-panel-kicker">{kicker}</p> : null}
                <h3>{title}</h3>
                {description ? <p className="settings-panel-description">{description}</p> : null}
            </div>
            {aside ? <div className="settings-panel-aside">{aside}</div> : null}
        </div>
    );
}

function StatCard({ label, value, hint, accent = '' }) {
    return (
        <div className={`settings-stat-card${accent ? ` ${accent}` : ''}`}>
            <span className="settings-stat-label">{label}</span>
            <strong className="settings-stat-value">{value}</strong>
            {hint ? <p className="settings-stat-hint">{hint}</p> : null}
        </div>
    );
}

export function SettingsTab() {
    const admin = useAdmin();
    const {
        templateEditor = {},
        templatePreview = {},
        templateKeys = [],
        templatePlaceholders = [],
        smtpSettings = {},
        courierSettings = {},
        checkoutSettings = {},
        localSettings = {}
    } = admin;

    const [activeTab, setActiveTab] = useState('templates');

    const courierDispatchEnabled = admin.courierDispatchEnabled ? admin.courierDispatchEnabled() : false;
    const activeTemplateLabel = templateEditor.selectedKey || templateEditor.key || 'No template selected';
    const smtpStatusLabel = smtpSettings.enabled ? 'Enabled' : 'Disabled';
    const smtpTransportLabel = smtpSettings.host ? `${smtpSettings.host}:${smtpSettings.port || 465}` : 'Transport not configured';
    const courierBalanceLabel = courierSettings.balance === null || courierSettings.balance === undefined
        ? 'Not checked'
        : (admin.currency ? admin.currency(courierSettings.balance) : courierSettings.balance);
    const guestOrderLabel = checkoutSettings.allowGuestOrder ? 'Allowed' : 'Login Required';
    const deliveryChargeDhakaLabel = admin.currency
        ? admin.currency(checkoutSettings.deliveryChargeDhaka || 0)
        : `BDT ${Number(checkoutSettings.deliveryChargeDhaka || 0).toFixed(2)}`;
    const deliveryChargeOutsideDhakaLabel = admin.currency
        ? admin.currency(checkoutSettings.deliveryChargeOutsideDhaka || 0)
        : `BDT ${Number(checkoutSettings.deliveryChargeOutsideDhaka || 0).toFixed(2)}`;

    const renderNav = () => (
        <div className="settings-subnav">
            {SETTINGS_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`settings-subnav-button${active ? ' is-active' : ''}`}
                    >
                        <span className="settings-subnav-icon">
                            <Icon size={16} />
                        </span>
                        <span className="settings-subnav-copy">
                            <span className="settings-subnav-title">{tab.label}</span>
                            <span className="settings-subnav-caption">{tab.caption}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );

    const renderTemplatesTab = () => (
        <div className="settings-workspace settings-workspace-wide">
            <div className="settings-layout settings-layout-editor">
                <div className="settings-stack">
                    <section className="settings-card settings-surface-card">
                        <SectionHeader
                            kicker="Email Templates"
                            title="Template Editor"
                            description="Edit live transactional templates, attach uploaded media, and keep placeholders organized."
                            aside={<span className="settings-panel-pill">Live backend</span>}
                        />
                        <div className="settings-stat-grid">
                            <StatCard label="Library Size" value={templateKeys.length} hint="Saved template records" accent="accent-primary" />
                            <StatCard label="Current Template" value={activeTemplateLabel} hint="Active editor target" />
                            <StatCard label="Quick Tokens" value={templatePlaceholders.length} hint="Insertable placeholders" />
                        </div>
                    </section>

                    <section className="settings-card settings-surface-card">
                        <SectionHeader
                            kicker="Editor Inputs"
                            title="Template Content"
                            description="Select a template from the backend library, then update its key, subject line, and HTML body."
                        />
                        <div className="settings-form-grid settings-form-grid-editor">
                            <div className="settings-field settings-field-full">
                                <label className="settings-label">Template Library</label>
                                <select
                                    value={templateEditor.selectedKey || ''}
                                    onChange={(event) => {
                                        admin.templateEditor.selectedKey = event.target.value;
                                        if (admin.selectTemplate) admin.selectTemplate(event.target.value);
                                    }}
                                    className="settings-input text-sm w-full"
                                >
                                    <option value="">Select template</option>
                                    {templateKeys.map((key) => (
                                        <option key={key} value={key}>{key}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="settings-field">
                                <label className="settings-label">Template Key</label>
                                <input
                                    value={templateEditor.key || ''}
                                    onChange={(event) => { admin.templateEditor.key = event.target.value; }}
                                    placeholder="template_key"
                                    className="settings-input mono text-sm w-full"
                                />
                            </div>
                            <div className="settings-field">
                                <label className="settings-label">Subject Line</label>
                                <input
                                    value={templateEditor.subjectTemplate || ''}
                                    onChange={(event) => { admin.templateEditor.subjectTemplate = event.target.value; }}
                                    placeholder="Subject template"
                                    className="settings-input text-sm w-full"
                                />
                            </div>
                            <div className="settings-field settings-field-full">
                                <label className="settings-label">HTML Body</label>
                                <textarea
                                    value={templateEditor.htmlTemplate || ''}
                                    onChange={(event) => { admin.templateEditor.htmlTemplate = event.target.value; }}
                                    placeholder="HTML template..."
                                    className="settings-input settings-template-editor text-sm mono w-full"
                                />
                            </div>
                        </div>

                        <div className="settings-inline-actions">
                            <button onClick={() => admin.openEmailMediaPicker && admin.openEmailMediaPicker('template')} className="settings-btn settings-btn-soft">
                                <ImagePlus size={15} />
                                <span>Insert Uploaded Image Tag</span>
                            </button>
                            <button onClick={() => admin.setActiveTab && admin.setActiveTab('media')} className="settings-btn settings-btn-soft">
                                <Eye size={15} />
                                <span>Open Media</span>
                            </button>
                            <p className="settings-inline-note">Adds a ready image tag into the current template body.</p>
                        </div>
                    </section>

                    <section className="settings-card settings-surface-card">
                        <SectionHeader
                            kicker="Tokens + Actions"
                            title="Insert Helpers"
                            description="Click a tag to insert it. Double-click a tag to copy the token or media placeholder."
                        />

                        <div className="settings-token-section">
                            <label className="settings-label">Quick Placeholders</label>
                            <div className="settings-token-grid">
                                {templatePlaceholders.map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => admin.insertTemplateTag && admin.insertTemplateTag(tag)}
                                        onDoubleClick={() => admin.copyText && admin.copyText(`{{${tag}}}`)}
                                        className="template-tag-btn"
                                    >
                                        {`{{${tag}}}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-test-card">
                            <div className="settings-field">
                                <label className="settings-label">Test Email Address</label>
                                <input
                                    value={templateEditor.testEmail || ''}
                                    onChange={(event) => { admin.templateEditor.testEmail = event.target.value; }}
                                    placeholder="test@email.com"
                                    className="settings-input text-sm w-full"
                                />
                            </div>
                            <div className="settings-actions-grid settings-actions-grid-four">
                                <button onClick={() => admin.createTemplate && admin.createTemplate()} className="settings-btn settings-btn-primary">Create</button>
                                <button onClick={() => admin.updateTemplate && admin.updateTemplate()} className="settings-btn settings-btn-soft">Update</button>
                                <button onClick={() => admin.previewTemplate && admin.previewTemplate()} className="settings-btn settings-btn-soft">Preview</button>
                                <button onClick={() => admin.testSendTemplate && admin.testSendTemplate()} className="settings-btn settings-btn-soft">Test Send</button>
                            </div>
                        </div>
                    </section>
                </div>

                <aside className="settings-sidebar">
                    <section className="settings-card settings-surface-card settings-sticky-card">
                        <SectionHeader
                            kicker="Rendered Output"
                            title="Template Preview"
                            description="Preview the generated subject and HTML before saving or sending a test."
                            aside={<Eye size={16} className="settings-panel-icon" />}
                        />
                        <div className="settings-preview-box">
                            <span className="settings-preview-label">Subject</span>
                            <p className="settings-preview-value mono">{templatePreview.subject || 'No preview generated yet'}</p>
                        </div>
                        <div className="settings-preview-box settings-preview-box-tall custom-scrollbar">
                            <span className="settings-preview-label">Rendered HTML</span>
                            <pre className="settings-preview-code">{templatePreview.html || 'No preview generated yet'}</pre>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
    const renderSmtpTab = () => (
        <div className="settings-workspace">
            <div className="settings-stat-grid settings-stat-grid-top">
                <StatCard label="SMTP Status" value={smtpStatusLabel} hint="Global mail transport state" accent={smtpSettings.enabled ? 'accent-primary' : ''} />
                <StatCard label="Transport" value={smtpTransportLabel} hint="Host + port currently set" />
                <StatCard label="From Identity" value={smtpSettings.fromEmail || 'Not set'} hint={smtpSettings.fromName || 'Sender display name pending'} />
                <StatCard label="Security" value={smtpSettings.secure ? 'SSL / TLS' : 'Plain / STARTTLS'} hint={smtpSettings.ignoreTLS ? 'TLS validation ignored' : 'TLS validation enforced'} />
            </div>

            <div className="settings-layout settings-layout-double">
                <section className="settings-card settings-surface-card">
                    <SectionHeader
                        kicker="Transport"
                        title="SMTP Connection"
                        description="Use your Namecheap Private Email or another SMTP host for transactional email delivery."
                        aside={<Send size={16} className="settings-panel-icon" />}
                    />
                    <div className="settings-form-grid">
                        <div className="settings-field">
                            <label className="settings-label">SMTP Host</label>
                            <input value={smtpSettings.host || ''} onChange={(event) => { admin.smtpSettings.host = event.target.value; }} placeholder="mail.privateemail.com" className="settings-input text-sm w-full" />
                        </div>
                        <div className="settings-field">
                            <label className="settings-label">SMTP Port</label>
                            <input type="number" value={smtpSettings.port || ''} onChange={(event) => { admin.smtpSettings.port = parseInt(event.target.value, 10) || ''; }} min="1" max="65535" className="settings-input text-sm mono w-full" />
                        </div>
                        <div className="settings-field">
                            <label className="settings-label">SMTP Username</label>
                            <input value={smtpSettings.username || ''} onChange={(event) => { admin.smtpSettings.username = event.target.value; }} placeholder="no-reply@bidnsteal.com" className="settings-input text-sm w-full" />
                        </div>
                        <div className="settings-field">
                            <label className="settings-label">SMTP Password</label>
                            <input
                                type="password"
                                value={smtpSettings.password || ''}
                                onChange={(event) => { admin.smtpSettings.password = event.target.value; }}
                                placeholder={smtpSettings.hasPassword ? 'Leave empty to keep current password' : 'Enter SMTP password'}
                                className="settings-input text-sm w-full"
                            />
                            {smtpSettings.hasPassword ? <p className="settings-helper-text">Saved password: <span className="mono">{smtpSettings.passwordMasked}</span></p> : null}
                        </div>
                    </div>
                </section>

                <section className="settings-card settings-surface-card">
                    <SectionHeader
                        kicker="Sender Identity"
                        title="From + Reply Routing"
                        description="Control the sender identity customers see when receiving order and account emails."
                        aside={<Mail size={16} className="settings-panel-icon" />}
                    />
                    <div className="settings-form-grid">
                        <div className="settings-field">
                            <label className="settings-label">From Email</label>
                            <input type="email" value={smtpSettings.fromEmail || ''} onChange={(event) => { admin.smtpSettings.fromEmail = event.target.value; }} placeholder="no-reply@bidnsteal.com" className="settings-input text-sm w-full" />
                        </div>
                        <div className="settings-field">
                            <label className="settings-label">From Name</label>
                            <input value={smtpSettings.fromName || ''} onChange={(event) => { admin.smtpSettings.fromName = event.target.value; }} placeholder="BidnSteal" className="settings-input text-sm w-full" />
                        </div>
                        <div className="settings-field settings-field-full">
                            <label className="settings-label">Reply-To Email</label>
                            <input type="email" value={smtpSettings.replyTo || ''} onChange={(event) => { admin.smtpSettings.replyTo = event.target.value; }} placeholder="support@bidnsteal.com" className="settings-input text-sm w-full" />
                        </div>
                    </div>
                </section>

                <section className="settings-card settings-surface-card">
                    <SectionHeader
                        kicker="Operational Flags"
                        title="Delivery Behavior"
                        description="These switches control how the backend connects to the SMTP provider and validates its certificate chain."
                        aside={<ShieldCheck size={16} className="settings-panel-icon" />}
                    />
                    <div className="settings-switch-grid">
                        <label className="settings-switch-card">
                            <div className="settings-switch-copy">
                                <p className="settings-switch-title">Enable SMTP</p>
                                <p className="settings-switch-text">Use the configured SMTP transport for all outgoing emails.</p>
                            </div>
                            <span className="settings-toggle-wrap">
                                <input type="checkbox" className="sr-only" checked={!!smtpSettings.enabled} onChange={(event) => { admin.smtpSettings.enabled = event.target.checked; }} />
                                <ToggleVisual checked={!!smtpSettings.enabled} />
                            </span>
                        </label>
                        <label className="settings-switch-card">
                            <div className="settings-switch-copy">
                                <p className="settings-switch-title">Use SSL / TLS</p>
                                <p className="settings-switch-text">Recommended for Namecheap Private Email and most production SMTP setups.</p>
                            </div>
                            <span className="settings-toggle-wrap">
                                <input type="checkbox" className="sr-only" checked={!!smtpSettings.secure} onChange={(event) => { admin.smtpSettings.secure = event.target.checked; }} />
                                <ToggleVisual checked={!!smtpSettings.secure} />
                            </span>
                        </label>
                        <label className="settings-switch-card">
                            <div className="settings-switch-copy">
                                <p className="settings-switch-title">Ignore TLS Validation</p>
                                <p className="settings-switch-text">Use only if the SMTP certificate chain is broken and you explicitly accept the risk.</p>
                            </div>
                            <span className="settings-toggle-wrap">
                                <input type="checkbox" className="sr-only" checked={!!smtpSettings.ignoreTLS} onChange={(event) => { admin.smtpSettings.ignoreTLS = event.target.checked; }} />
                                <ToggleVisual checked={!!smtpSettings.ignoreTLS} />
                            </span>
                        </label>
                    </div>
                </section>

                <section className="settings-card settings-surface-card">
                    <SectionHeader
                        kicker="Verification"
                        title="Save + Test"
                        description="Save the SMTP configuration, then send a test message to validate credentials and routing."
                        aside={<Activity size={16} className="settings-panel-icon" />}
                    />
                    <div className="settings-test-card">
                        <div className="settings-field">
                            <label className="settings-label">SMTP Test Recipient</label>
                            <input type="email" value={smtpSettings.testEmail || ''} onChange={(event) => { admin.smtpSettings.testEmail = event.target.value; }} placeholder="test@yourmail.com" className="settings-input text-sm w-full" />
                        </div>
                        <div className="settings-actions-grid">
                            <button onClick={() => admin.saveSmtpSettings && admin.saveSmtpSettings()} className="settings-btn settings-btn-primary">
                                {smtpSettings.saving ? 'Saving...' : 'Save SMTP'}
                            </button>
                            <button onClick={() => admin.testSmtpSettings && admin.testSmtpSettings()} className="settings-btn settings-btn-soft">
                                {smtpSettings.testing ? 'Sending...' : 'Send Test'}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
    const renderCourierTab = () => (
        <div className="settings-workspace">
            {courierSettings && typeof courierSettings === 'object' ? (
                <>
                    <div className="settings-stat-grid settings-stat-grid-top">
                        <StatCard label="Dispatch Mode" value={courierDispatchEnabled ? 'Enabled' : 'Disabled'} hint="Direct order push to Steadfast" accent={courierDispatchEnabled ? 'accent-primary' : ''} />
                        <StatCard label="Provider" value={(courierSettings.provider || 'steadfast').toUpperCase()} hint="Courier backend service" />
                        <StatCard label="Current Balance" value={courierBalanceLabel} hint="Fetch live balance on demand" />
                        <StatCard label="Fraud Check" value={courierSettings.fraudCheckerEnabled ? 'Enabled' : 'Disabled'} hint="Customer success history lookup" />
                    </div>

                    <div className="settings-layout settings-layout-double">
                        <section className="settings-card settings-surface-card">
                            <SectionHeader
                                kicker="Dispatch"
                                title="Courier Control"
                                description="Enable dispatch when you want orders pushed directly from admin to Steadfast."
                                aside={<Truck size={16} className="settings-panel-icon" />}
                            />
                            <div className="settings-switch-grid">
                                <div className="settings-switch-card settings-switch-card-highlight">
                                    <div className="settings-switch-copy">
                                        <p className="settings-switch-title">Enable Courier Dispatch</p>
                                        <p className="settings-switch-text">Turn on direct order synchronization to Steadfast from the Orders Manager panel.</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="settings-toggle-wrap"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            admin.toggleCourierDispatchEnabled && admin.toggleCourierDispatchEnabled();
                                        }}
                                    >
                                        <ToggleVisual checked={courierDispatchEnabled} />
                                    </button>
                                </div>
                            </div>
                            <div className="settings-actions-grid">
                                <button onClick={() => admin.checkCourierBalance && admin.checkCourierBalance()} className="settings-btn settings-btn-soft">
                                    {courierSettings.balanceLoading ? 'Checking...' : 'Check Balance'}
                                </button>
                            </div>
                        </section>

                        <section className="settings-card settings-surface-card">
                            <SectionHeader
                                kicker="API Credentials"
                                title="Steadfast API Connection"
                                description="Set the base endpoint and credentials used for order creation, tracking, and delivery sync."
                                aside={<Activity size={16} className="settings-panel-icon" />}
                            />
                            <div className="settings-form-grid">
                                <div className="settings-field">
                                    <label className="settings-label">Base URL</label>
                                    <input value={courierSettings.baseUrl || ''} onChange={(event) => { admin.courierSettings.baseUrl = event.target.value; }} placeholder="https://portal.packzy.com/api/v1" className="settings-input mono text-sm w-full" />
                                </div>
                                <div className="settings-field">
                                    <label className="settings-label">API Key</label>
                                    <input value={courierSettings.apiKey || ''} onChange={(event) => { admin.courierSettings.apiKey = event.target.value; }} placeholder="Steadfast API key" className="settings-input mono text-sm w-full" />
                                </div>
                                <div className="settings-field settings-field-full">
                                    <label className="settings-label">Secret Key</label>
                                    <input type="password" value={courierSettings.secretKey || ''} onChange={(event) => { admin.courierSettings.secretKey = event.target.value; }} placeholder="Enter new secret (leave empty to keep current)" className="settings-input mono text-sm w-full" />
                                    {courierSettings.hasSecret ? <p className="settings-helper-text">Saved: {courierSettings.secretKeyMasked}</p> : null}
                                </div>
                            </div>
                        </section>

                        <section className="settings-card settings-surface-card">
                            <SectionHeader
                                kicker="Dispatch Defaults"
                                title="Order Payload Rules"
                                description="These defaults are used when an order is pushed to Steadfast from the admin orders screen."
                                aside={<RefreshCw size={16} className="settings-panel-icon" />}
                            />
                            <div className="settings-form-grid">
                                <div className="settings-field">
                                    <label className="settings-label">Default Delivery Type</label>
                                    <select value={courierSettings.defaultDeliveryType || ''} onChange={(event) => { admin.courierSettings.defaultDeliveryType = event.target.value; }} className="settings-input text-sm w-full">
                                        <option value="0">Home Delivery</option>
                                        <option value="1">Point / Hub Pickup</option>
                                    </select>
                                </div>
                                <div className="settings-field settings-field-full">
                                    <label className="settings-label">Item Description Template</label>
                                    <input value={courierSettings.defaultItemDescription || ''} onChange={(event) => { admin.courierSettings.defaultItemDescription = event.target.value; }} placeholder="Order {{order_number}} - {{items}}" className="settings-input w-full" />
                                    <p className="settings-helper-text">
                                        Supported placeholders:
                                        {' '}
                                        <span className="settings-code-pill">{`{{order_number}}`}</span>
                                        {' '}
                                        <span className="settings-code-pill">{`{{items}}`}</span>
                                        {' '}
                                        <span className="settings-code-pill">{`{{total}}`}</span>
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="settings-card settings-surface-card">
                            <SectionHeader
                                kicker="Fraud Signals"
                                title="Customer Success Check"
                                description="Use Steadfast merchant login credentials to fetch courier history by phone when reviewing orders."
                                aside={<ShieldCheck size={16} className="settings-panel-icon" />}
                            />
                            <div className="settings-switch-grid">
                                <div className="settings-switch-card">
                                    <div className="settings-switch-copy">
                                        <p className="settings-switch-title">Enable Success Check</p>
                                        <p className="settings-switch-text">Adds courier-history signals to help flag risky buyers before dispatch.</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="settings-toggle-wrap"
                                        onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            admin.toggleFraudCheckerEnabled && admin.toggleFraudCheckerEnabled();
                                        }}
                                    >
                                        <ToggleVisual checked={!!courierSettings?.fraudCheckerEnabled} />
                                    </button>
                                </div>
                            </div>
                            <div className="settings-form-grid">
                                <div className="settings-field">
                                    <label className="settings-label">Steadfast Login Email</label>
                                    <input type="email" value={courierSettings.fraudCheckerEmail || ''} onChange={(event) => { admin.courierSettings.fraudCheckerEmail = event.target.value; }} placeholder="merchant@email.com" className="settings-input text-sm w-full" />
                                </div>
                                <div className="settings-field">
                                    <label className="settings-label">Steadfast Login Password</label>
                                    <input type="password" value={courierSettings.fraudCheckerPassword || ''} onChange={(event) => { admin.courierSettings.fraudCheckerPassword = event.target.value; }} placeholder="Enter new password (leave empty to keep current)" className="settings-input text-sm w-full" />
                                    {courierSettings.fraudCheckerHasPassword ? <p className="settings-helper-text">Saved: {courierSettings.fraudCheckerPasswordMasked}</p> : null}
                                </div>
                            </div>
                            <div className="settings-actions-grid settings-actions-grid-single">
                                <button onClick={() => admin.saveCourierSettings && admin.saveCourierSettings()} className="settings-btn settings-btn-primary">
                                    {courierSettings.saving ? 'Saving...' : 'Save Courier Settings'}
                                </button>
                            </div>
                        </section>
                    </div>
                </>
            ) : (
                <div className="settings-card settings-empty-panel">
                    <SectionHeader
                        kicker="Courier State Error"
                        title="Courier Integration Error"
                        description="Courier settings state became invalid or failed to load correctly."
                    />
                    <p className="settings-helper-text">Use recover to rebuild this panel state and reload the defaults from the backend.</p>
                    <div className="settings-actions-grid settings-actions-grid-single">
                        <button onClick={() => admin.resetCourierSettingsState && admin.resetCourierSettingsState()} className="settings-btn settings-btn-primary">
                            Recover Courier Settings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderPreferencesTab = () => (
        <div className="settings-workspace">
            <div className="settings-stat-grid settings-stat-grid-top">
                <StatCard label="Auto Refresh" value={localSettings.autoRefresh ? 'On' : 'Off'} hint="Refresh data during tab switches" accent={localSettings.autoRefresh ? 'accent-primary' : ''} />
                <StatCard label="Debug Logging" value={localSettings.debug ? 'Verbose' : 'Quiet'} hint="Browser console diagnostics" />
                <StatCard label="Persistence" value="Instant Save" hint="Preferences are saved immediately when toggled" />
            </div>

            <div className="settings-layout settings-layout-single">
                <section className="settings-card settings-surface-card">
                    <SectionHeader
                        kicker="Local Preferences"
                        title="Admin Console Behavior"
                        description="These preferences are local to your admin session and affect only how this browser behaves."
                        aside={<SlidersHorizontal size={16} className="settings-panel-icon" />}
                    />
                    <div className="settings-switch-grid">
                        <label className="settings-switch-card">
                            <div className="settings-switch-copy">
                                <p className="settings-switch-title">Auto Refresh Tabs</p>
                                <p className="settings-switch-text">Refresh dashboard and table data automatically when moving across admin tabs.</p>
                            </div>
                            <span className="settings-toggle-wrap">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={!!localSettings.autoRefresh}
                                    onChange={(event) => {
                                        admin.localSettings.autoRefresh = event.target.checked;
                                        if (admin.saveLocalSettings) admin.saveLocalSettings();
                                    }}
                                />
                                <ToggleVisual checked={!!localSettings.autoRefresh} />
                            </span>
                        </label>
                        <label className="settings-switch-card">
                            <div className="settings-switch-copy">
                                <p className="settings-switch-title">Developer Debug Logs</p>
                                <p className="settings-switch-text">Expose payload dumps and timing details in the browser console for troubleshooting.</p>
                            </div>
                            <span className="settings-toggle-wrap">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={!!localSettings.debug}
                                    onChange={(event) => {
                                        admin.localSettings.debug = event.target.checked;
                                        if (admin.saveLocalSettings) admin.saveLocalSettings();
                                    }}
                                />
                                <ToggleVisual checked={!!localSettings.debug} />
                            </span>
                        </label>
                    </div>
                </section>
            </div>
        </div>
    );

    const renderCheckoutTab = () => (
        <div className="settings-workspace">
            <div className="settings-stat-grid settings-stat-grid-top">
                <StatCard label="Guest Order" value={guestOrderLabel} hint="Storefront order access rule" accent={checkoutSettings.allowGuestOrder ? 'accent-primary' : ''} />
                <StatCard label="Dhaka Charge" value={deliveryChargeDhakaLabel} hint="Applied when city is Dhaka" />
                <StatCard label="Outside Dhaka" value={deliveryChargeOutsideDhakaLabel} hint="Rest of Bangladesh delivery fee" />
            </div>

            <div className="settings-layout settings-layout-double">
                <section className="settings-card settings-surface-card">
                    <SectionHeader
                        kicker="Delivery Pricing"
                        title="Bangladesh Delivery Charge Rules"
                        description="Set the default delivery fee for Dhaka city and for the rest of Bangladesh outside Dhaka."
                        aside={<Truck size={16} className="settings-panel-icon" />}
                    />
                    <div className="settings-form-grid">
                        <div className="settings-field">
                            <label className="settings-label">Dhaka City Delivery Charge</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={checkoutSettings.deliveryChargeDhaka ?? 0}
                                onChange={(event) => {
                                    admin.checkoutSettings.deliveryChargeDhaka = Number(event.target.value || 0);
                                }}
                                className="settings-input text-sm mono w-full"
                            />
                            <p className="settings-helper-text">Used when the shipping city or area contains Dhaka.</p>
                        </div>
                        <div className="settings-field">
                            <label className="settings-label">Whole Bangladesh Except Dhaka</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={checkoutSettings.deliveryChargeOutsideDhaka ?? 0}
                                onChange={(event) => {
                                    admin.checkoutSettings.deliveryChargeOutsideDhaka = Number(event.target.value || 0);
                                }}
                                className="settings-input text-sm mono w-full"
                            />
                            <p className="settings-helper-text">Applied for every Bangladesh destination outside Dhaka city.</p>
                        </div>
                    </div>
                </section>

                <section className="settings-card settings-surface-card">
                    <SectionHeader
                        kicker="Access Policy"
                        title="Guest Checkout Control"
                        description="Turn guest orders on if non-logged-in customers should be allowed to place store orders."
                        aside={<ShieldCheck size={16} className="settings-panel-icon" />}
                    />
                    <div className="settings-switch-grid">
                        <label className="settings-switch-card settings-switch-card-highlight">
                            <div className="settings-switch-copy">
                                <p className="settings-switch-title">Allow Guest Order</p>
                                <p className="settings-switch-text">When disabled, customers must log in before they can submit a store order.</p>
                            </div>
                            <span className="settings-toggle-wrap">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={!!checkoutSettings.allowGuestOrder}
                                    onChange={(event) => {
                                        admin.checkoutSettings.allowGuestOrder = event.target.checked;
                                    }}
                                />
                                <ToggleVisual checked={!!checkoutSettings.allowGuestOrder} />
                            </span>
                        </label>
                    </div>
                    <div className="settings-actions-grid settings-actions-grid-single">
                        <button onClick={() => admin.saveCheckoutSettings && admin.saveCheckoutSettings()} className="settings-btn settings-btn-primary">
                            {checkoutSettings.saving ? 'Saving...' : 'Save Checkout Settings'}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );

    return (
        <div className="settings-shell">
            <div className="settings-hero-card">
                <div className="settings-hero-copy">
                    <p className="settings-hero-kicker">Control Center</p>
                    <h2>System Control</h2>
                    <p>Manage core infrastructure, integrations, notifications, and browser-level console preferences.</p>
                    <div className="settings-hero-chip-row">
                        <span className="settings-hero-chip">
                            <Activity size={14} />
                            <span>{templateKeys.length} templates</span>
                        </span>
                        <span className="settings-hero-chip">
                            <Send size={14} />
                            <span>SMTP {smtpStatusLabel}</span>
                        </span>
                        <span className="settings-hero-chip">
                            <Truck size={14} />
                            <span>{courierDispatchEnabled ? 'Courier live' : 'Courier idle'}</span>
                        </span>
                    </div>
                </div>
                <div className="settings-hero-actions">
                    <button onClick={() => admin.loadSettings && admin.loadSettings(true)} className="settings-btn settings-btn-soft">
                        <RefreshCw size={15} />
                        <span>Force Sync Cloud Settings</span>
                    </button>
                </div>
            </div>

            {renderNav()}

            <div className="settings-content">
                {activeTab === 'templates' && renderTemplatesTab()}
                {activeTab === 'smtp' && renderSmtpTab()}
                {activeTab === 'courier' && renderCourierTab()}
                {activeTab === 'checkout' && renderCheckoutTab()}
                {activeTab === 'preferences' && renderPreferencesTab()}
            </div>
        </div>
    );
}
