import React from 'react';
import { Icon } from '../Icon';

export function DashboardStatCard({ icon, label, value, meta, tone = 'stone', compact = false, featured = false }) {
    const classNames = [
        'dashboard-stat-card',
        `is-${tone}`,
        compact ? 'is-compact' : '',
        featured ? 'is-featured' : ''
    ].filter(Boolean).join(' ');

    return (
        <article className={classNames}>
            <div className="dashboard-stat-card__top">
                {icon ? (
                    <span className="dashboard-stat-card__icon">
                        <Icon name={icon} />
                    </span>
                ) : <span />}
                {meta ? <span className="dashboard-stat-card__meta">{meta}</span> : null}
            </div>
            <div className="dashboard-stat-card__body">
                <p className="dashboard-stat-card__label">{label}</p>
                <strong className="dashboard-stat-card__value">{value}</strong>
            </div>
        </article>
    );
}
