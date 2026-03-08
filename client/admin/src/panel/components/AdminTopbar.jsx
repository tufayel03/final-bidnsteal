import React from 'react';
import { useAdmin } from '../AdminContext';
import { Icon } from './Icon';

export function AdminTopbar() {
    const admin = useAdmin();

    return (
        <header className="admin-topbar admin-topbar--soft">
            <div className="admin-topbar__left">
                <div className="admin-search-shell admin-search-shell--soft">
                    <Icon name="search" />
                    <input
                        type="text"
                        placeholder="Quick search"
                        onFocus={() => { admin.showSearch = true; }}
                    />
                </div>
            </div>

            <div className="admin-topbar-right admin-topbar-right--soft">
                <button className="icon-btn admin-soft-icon-btn" aria-label="Notifications">
                    <Icon name="bell" />
                    <span className="dot"></span>
                </button>
                <button className="icon-btn admin-soft-icon-btn" aria-label="Settings">
                    <Icon name="settings" />
                </button>
                <div className="admin-user admin-user--soft">
                    <div className="avatar avatar--soft"></div>
                    <div className="admin-user__copy">
                        <strong>{admin.authUser?.name || 'Admin User'}</strong>
                        <span>{admin.authUser?.email || admin.authUser?.role || 'admin@bidnsteal.com'}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
