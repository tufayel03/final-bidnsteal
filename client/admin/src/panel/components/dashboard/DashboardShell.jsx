import React from 'react';

export function DashboardShell({ eyebrow, title, description, actions, children }) {
    return (
        <section className="dashboard-shell">
            <header className="dashboard-shell__head">
                <div className="dashboard-shell__copy">
                    {eyebrow ? <span className="dashboard-shell__eyebrow">{eyebrow}</span> : null}
                    <h2 className="dashboard-shell__title">{title}</h2>
                    {description ? <p className="dashboard-shell__description">{description}</p> : null}
                </div>
                {actions ? <div className="dashboard-shell__actions">{actions}</div> : null}
            </header>
            {children}
        </section>
    );
}
