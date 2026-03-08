import React from 'react';

export function DashboardSection({ eyebrow, title, subtitle, actions, className = '', children }) {
    const classNames = ['dashboard-section', className].filter(Boolean).join(' ');

    return (
        <section className={classNames}>
            <div className="dashboard-section__head">
                <div className="dashboard-section__copy">
                    {eyebrow ? <span className="dashboard-section__eyebrow">{eyebrow}</span> : null}
                    <h3 className="dashboard-section__title">{title}</h3>
                    {subtitle ? <p className="dashboard-section__subtitle">{subtitle}</p> : null}
                </div>
                {actions ? <div className="dashboard-section__actions">{actions}</div> : null}
            </div>
            <div className="dashboard-section__body">
                {children}
            </div>
        </section>
    );
}
