import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { Icon } from './Icon';

export function AdminSidebar() {
    const admin = useAdmin();
    const navigate = useNavigate();
    const location = useLocation();

    // Extract necessary state from Proxy
    const collapsed = admin.localSettings?.sidebarCollapsed;
    const activeTab = admin.activeTab;
    const menuItems = admin.menuItems || [];
    const navMeta = {
        dashboard: 'Overview',
        inventory: 'Products',
        media: 'Assets',
        auctions: 'Live bids',
        orders: 'Fulfillment',
        users: 'Accounts',
        subscribers: 'Mail list',
        campaigns: 'Promotions',
        coupons: 'Offers',
        analytics: 'Signals',
        reports: 'Exports',
        settings: 'Config'
    };
    const menuGroups = [
        {
            id: 'operations',
            label: 'Operations',
            items: menuItems.filter((item) => ['dashboard', 'inventory', 'media', 'auctions', 'orders'].includes(item.id))
        },
        {
            id: 'audience',
            label: 'Audience & CRM',
            items: menuItems.filter((item) => ['users', 'subscribers', 'campaigns', 'coupons'].includes(item.id))
        },
        {
            id: 'intelligence',
            label: 'Intelligence',
            items: menuItems.filter((item) => ['analytics', 'reports'].includes(item.id))
        },
        {
            id: 'system',
            label: 'System',
            items: menuItems.filter((item) => ['settings'].includes(item.id))
        }
    ].filter((group) => group.items.length > 0);

    const handleTabChange = (tabId) => {
        if (!tabId) return;
        if (admin.setActiveTab) {
            admin.setActiveTab(tabId);
        }

        const nextUrl = `/tufayel/panel?tab=${encodeURIComponent(tabId)}`;
        if (`${location.pathname}${location.search}` !== nextUrl) {
            navigate(nextUrl);
        }
    };

    return (
        <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="admin-brand">
                <div className="admin-brand-mark">
                    <div className="admin-brand-badge">B</div>
                    <span className="admin-brand-pulse" />
                </div>
                <div className="admin-brand-copy">
                    <p className="admin-brand-eyebrow">Control Node</p>
                    <h1>BIDNSTEAL</h1>
                    <div className="admin-brand-meta">
                        <p>Admin Panel</p>
                        <span className="admin-brand-chip">SYS-OP</span>
                    </div>
                </div>
            </div>

            <nav className="admin-nav custom-scrollbar" style={{ overflowY: 'auto' }}>
                {menuGroups.map((group) => (
                    <section key={group.id} className="admin-sidebar-section">
                        <div className="admin-sidebar-section-label">{group.label}</div>
                        <div className="admin-sidebar-section-items">
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id)}
                                    title={collapsed ? item.label : ''}
                                    className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                                >
                                    <span className="admin-nav-item-icon">
                                        <Icon name={item.icon} />
                                    </span>
                                    <span className="admin-nav-item-copy">
                                        <span className="admin-nav-item-label">{item.label}</span>
                                        <span className="admin-nav-item-caption">{navMeta[item.id] || 'Module'}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </nav>

            <div className="admin-sidebar-footer">
                <div className="admin-sidebar-status">
                    <span className="admin-sidebar-status-dot" />
                    <div className="admin-sidebar-status-copy">
                        <strong>Secure Link</strong>
                        <span>Admin session active</span>
                    </div>
                </div>
                <button
                    onClick={() => admin.toggleSidebarCollapse()}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="admin-link-btn"
                >
                    <span className="admin-nav-item-icon">
                        <Icon name="panel-left-close" className={`sidebar-toggle-icon ${collapsed ? 'is-collapsed' : ''}`} />
                    </span>
                    <span className="admin-nav-item-copy">
                        <span className="admin-nav-item-label">{collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</span>
                        <span className="admin-nav-item-caption">Workspace layout</span>
                    </span>
                </button>
                <button
                    onClick={() => admin.logout && admin.logout()}
                    title={collapsed ? 'Logout' : ''}
                    className="admin-link-btn logout"
                >
                    <span className="admin-nav-item-icon">
                        <Icon name="log-out" />
                    </span>
                    <span className="admin-nav-item-copy">
                        <span className="admin-nav-item-label">Logout</span>
                        <span className="admin-nav-item-caption">End current session</span>
                    </span>
                </button>
            </div>
        </aside>
    );
}
