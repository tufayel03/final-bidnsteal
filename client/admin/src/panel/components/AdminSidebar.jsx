import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { Icon } from './Icon';

export function AdminSidebar() {
    const admin = useAdmin();
    const navigate = useNavigate();
    const location = useLocation();

    const collapsed = Boolean(admin.localSettings?.sidebarCollapsed);
    const activeTab = admin.activeTab;
    const menuItems = admin.menuItems || [];

    const menuGroups = [
        {
            id: 'operations',
            label: 'Operations',
            items: menuItems.filter((item) => ['dashboard', 'inventory', 'media', 'auctions', 'orders'].includes(item.id))
        },
        {
            id: 'audience',
            label: 'Audience',
            items: menuItems.filter((item) => ['users', 'subscribers', 'campaigns', 'coupons'].includes(item.id))
        },
        {
            id: 'insights',
            label: 'Insights',
            items: menuItems.filter((item) => ['analytics', 'reports', 'settings'].includes(item.id))
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
        <aside className={`admin-sidebar admin-simple-sidebar admin-sidebar--soft ${collapsed ? 'collapsed' : ''}`}>
            <div className="admin-simple-brand">
                <div className="admin-simple-brand-mark">BS</div>
                <div className="admin-simple-brand-copy">
                    <h1>BidnSteal</h1>
                    <p>Warehouse Console</p>
                </div>
            </div>

            <nav className="admin-nav admin-simple-nav custom-scrollbar" style={{ overflowY: 'auto' }}>
                {menuGroups.map((group) => (
                    <section key={group.id} className="admin-simple-nav-group">
                        {!collapsed ? <div className="admin-simple-nav-group-label">{group.label}</div> : null}
                        <div className="admin-simple-nav-list">
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id)}
                                    title={collapsed ? item.label : ''}
                                    className={`admin-nav-item admin-simple-nav-item ${activeTab === item.id ? 'active' : ''}`}
                                >
                                    <span className="admin-nav-item-icon">
                                        <Icon name={item.icon} />
                                    </span>
                                    <span className="admin-simple-nav-item-label">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                ))}
            </nav>

            <div className="admin-sidebar-footer admin-simple-sidebar-footer">
                {!collapsed ? (
                    <div className="admin-soft-sidebar-card">
                        <span className="admin-soft-sidebar-card__eyebrow">Workspace</span>
                        <strong>Admin dashboard</strong>
                        <p>Manage inventory, bids, orders, and campaigns from one place.</p>
                    </div>
                ) : null}
                <button
                    onClick={() => admin.toggleSidebarCollapse()}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className="admin-link-btn admin-simple-link-btn"
                >
                    <span className="admin-nav-item-icon">
                        <Icon name="panel-left-close" className={`sidebar-toggle-icon ${collapsed ? 'is-collapsed' : ''}`} />
                    </span>
                    <span className="admin-simple-nav-item-label">{collapsed ? 'Expand' : 'Collapse'}</span>
                </button>
                <button
                    onClick={() => admin.logout && admin.logout()}
                    title={collapsed ? 'Logout' : ''}
                    className="admin-link-btn admin-simple-link-btn logout"
                >
                    <span className="admin-nav-item-icon">
                        <Icon name="log-out" />
                    </span>
                    <span className="admin-simple-nav-item-label">Logout</span>
                </button>
            </div>
        </aside>
    );
}
