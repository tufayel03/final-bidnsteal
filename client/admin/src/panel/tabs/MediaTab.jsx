import React from 'react';
import { useAdmin } from '../AdminContext';
import { Icon } from '../components/Icon';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';
import { AdminModalPortal } from '../components/modals/AdminModalPortal';

export function MediaTab() {
    const admin = useAdmin();
    const { mediaFilters, mediaUpload } = admin;

    const filtered = admin.filteredMediaAssets ? admin.filteredMediaAssets() : [];
    const selectedCount = admin.selectedMediaCount ? admin.selectedMediaCount() : 0;
    const totalAssets = admin.mediaMeta?.total || filtered.length;
    const visibleSize = filtered.reduce((total, item) => total + Number(item.size || 0), 0);
    const recentUploads = filtered.filter((item) => {
        if (!item.modifiedAt) return false;
        const timestamp = new Date(item.modifiedAt).getTime();
        return Number.isFinite(timestamp) && (Date.now() - timestamp) <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div className="admin-tab-header">
                <div>
                    <h2>{admin.mediaTrashMode ? 'Media Trash' : 'Media Library'}</h2>
                    <p>{admin.mediaTrashMode ? 'Restore deleted assets or permanently erase them.' : 'Upload images once and reuse in products and email templates.'}</p>
                </div>
                <button onClick={() => admin.loadMedia && admin.loadMedia()} className="order-filter-btn">
                    Reload
                </button>
            </div>

            <div className="dashboard-stat-grid dashboard-stat-grid--primary">
                <DashboardStatCard
                    icon="images"
                    label={admin.mediaTrashMode ? 'Trash Assets' : 'Library Assets'}
                    value={admin.number ? admin.number(totalAssets) : totalAssets}
                    meta={admin.mediaTrashMode ? 'Recovery queue' : 'Stored for reuse'}
                    tone="stone"
                    featured
                />
                <DashboardStatCard
                    icon="check-check"
                    label="Selected"
                    value={admin.number ? admin.number(selectedCount) : selectedCount}
                    meta="Current selection"
                    tone="sand"
                    compact
                />
                <DashboardStatCard
                    icon="hard-drive"
                    label="Visible Storage"
                    value={admin.formatBytes ? admin.formatBytes(visibleSize) : visibleSize}
                    meta="Loaded asset weight"
                    tone="sage"
                    compact
                />
                <DashboardStatCard
                    icon="sparkles"
                    label="Uploaded Recently"
                    value={admin.number ? admin.number(recentUploads) : recentUploads}
                    meta="Last 7 days"
                    tone="olive"
                    compact
                />
            </div>

            {!admin.mediaTrashMode && (
                <section className="dashboard-section media-library-upload-shell">
                    <div className="dashboard-section__head">
                        <div className="dashboard-section__copy">
                            <p className="dashboard-section__eyebrow">Asset Intake</p>
                            <h3 className="dashboard-section__title">Upload + Organize</h3>
                            <p className="dashboard-section__subtitle">Store image assets once and reuse them in products, auctions, templates, and campaigns without re-uploading files.</p>
                        </div>
                    </div>

                    <div className="media-library-hero-grid">
                        <div className="media-library-upload-card">
                            <label className="media-library-field-label">Upload Images</label>
                            <div className="admin-soft-upload media-library-dropzone relative cursor-pointer w-full group">
                                <input
                                    id="mediaUploadInput"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => admin.onMediaFileChange && admin.onMediaFileChange(e)}
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                                />
                                <div className="admin-soft-upload__body pointer-events-none">
                                    <span className="media-library-dropzone__icon">
                                        <Icon name="image-plus" />
                                    </span>
                                    <span className="admin-soft-upload__title">
                                        {mediaUpload.uploading ? 'Uploading assets...' : 'Select digital assets'}
                                    </span>
                                    <span className="admin-soft-upload__caption">
                                        {mediaUpload.uploading ? 'Please wait while files are being stored on the server' : 'Drag and drop files here or click to browse your device'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <aside className="media-library-side-card">
                            <p className="media-library-side-title">Reuse Anywhere</p>
                            <div className="media-library-side-list">
                                <div className="media-library-side-item">
                                    <span className="media-library-side-icon"><Icon name="package" /></span>
                                    <div>
                                        <strong>Products + Auctions</strong>
                                        <span>Assign uploaded images directly in catalog items and bidding lots.</span>
                                    </div>
                                </div>
                                <div className="media-library-side-item">
                                    <span className="media-library-side-icon"><Icon name="mail" /></span>
                                    <div>
                                        <strong>Email Templates</strong>
                                        <span>Copy template tags and drop them into transactional or campaign HTML.</span>
                                    </div>
                                </div>
                                <div className="media-library-side-item">
                                    <span className="media-library-side-icon"><Icon name="copy" /></span>
                                    <div>
                                        <strong>Fast Tag Workflow</strong>
                                        <span>Use the copy action on any asset to insert the media placeholder wherever you need it.</span>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </section>
            )}

            <section className="dashboard-section media-library-tools">
                <div className="media-library-toolbar">
                    <div className="media-library-search-row">
                        <div className="media-library-search-shell">
                            <Icon name="search" className="media-library-search-icon" />
                            <input
                                value={mediaFilters.search || ''}
                                onChange={(e) => { admin.mediaFilters.search = e.target.value; }}
                                placeholder="Search by file name..."
                                className="admin-search-input media-library-search-input"
                            />
                        </div>
                        <button onClick={() => admin.loadMedia && admin.loadMedia(null, true)} className="order-filter-btn">
                            Search
                        </button>
                    </div>

                    <div className="media-library-controls-row">
                        <div className="admin-soft-segment">
                            <button
                                onClick={() => { admin.mediaViewMode = 'grid'; admin.forceUpdate && admin.forceUpdate(); }}
                                className={`admin-soft-segment-btn${admin.mediaViewMode === 'grid' ? ' is-active' : ''}`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => { admin.mediaViewMode = 'columns'; admin.forceUpdate && admin.forceUpdate(); }}
                                className={`admin-soft-segment-btn${admin.mediaViewMode === 'columns' ? ' is-active' : ''}`}
                            >
                                List
                            </button>
                            <button
                                onClick={() => { admin.mediaTrashMode = !admin.mediaTrashMode; admin.loadMedia && admin.loadMedia(null, true).then(() => admin.forceUpdate && admin.forceUpdate()); }}
                                className={`admin-soft-segment-btn is-danger${admin.mediaTrashMode ? ' is-active' : ''}`}
                            >
                                {admin.mediaTrashMode ? 'View Library' : 'Trash Bin'}
                            </button>
                        </div>

                        <div className="media-library-count-pills">
                            <span className="media-library-count-pill">Selected <strong className="mono">{admin.number ? admin.number(selectedCount) : 0}</strong></span>
                            <span className="media-library-count-pill">Visible <strong className="mono">{admin.number ? admin.number(filtered.length) : 0}</strong></span>
                        </div>
                    </div>

                    <div className="media-library-selection-row">
                        <button onClick={() => admin.selectAllVisibleMedia && admin.selectAllVisibleMedia()} className="order-filter-btn">
                            Select Visible
                        </button>
                        <button onClick={() => admin.clearMediaSelection && admin.clearMediaSelection()} className="order-filter-btn">
                            Clear Selection
                        </button>
                        {admin.mediaTrashMode && (
                            <button onClick={() => admin.restoreSelectedMedia && admin.restoreSelectedMedia()} className="order-filter-btn primary">
                                Restore Selected
                            </button>
                        )}
                        <button onClick={() => admin.deleteSelectedMedia && admin.deleteSelectedMedia()} className="order-filter-btn danger">
                            {admin.mediaTrashMode ? 'Delete Forever' : 'Trash Selected'}
                        </button>
                        <button onClick={() => admin.deleteAllMedia && admin.deleteAllMedia()} className="order-filter-btn danger">
                            {admin.mediaTrashMode ? 'Empty Trash' : 'Trash All Images'}
                        </button>
                    </div>
                </div>
            </section>

            <section className="dashboard-section media-library-gallery-shell">
                <div className="dashboard-section__head">
                    <div className="dashboard-section__copy">
                        <p className="dashboard-section__eyebrow">{admin.mediaTrashMode ? 'Recycle Bin' : 'Asset Gallery'}</p>
                        <h3 className="dashboard-section__title">{admin.mediaTrashMode ? 'Deleted Media Records' : 'Library Browser'}</h3>
                        <p className="dashboard-section__subtitle">{admin.mediaTrashMode ? 'Recover deleted assets or erase them permanently.' : 'Browse uploaded media, inspect metadata, and copy tags for reuse.'}</p>
                    </div>
                    <div className="media-library-count-pills">
                        <span className="media-library-count-pill">Page <strong className="mono">{admin.mediaMeta?.page || 1}</strong> / <strong className="mono">{admin.mediaMeta?.totalPages || 1}</strong></span>
                    </div>
                </div>

                <div className="dashboard-section__body">
                    {filtered.length === 0 ? (
                        <div className="media-gallery-empty">
                            <span className="media-gallery-empty__icon"><Icon name="image-off" /></span>
                            <div>
                                <strong>No media found</strong>
                                <p>{admin.mediaTrashMode ? 'Trash is currently empty for this filter set.' : 'Upload images or adjust your filters to populate the library.'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className={admin.mediaViewMode === 'columns' ? 'media-list-wrap' : 'media-gallery-grid'}>
                            {filtered.map((item, index) => {
                                const isSelected = admin.isMediaSelected && admin.isMediaSelected(item);

                                if (admin.mediaViewMode === 'columns') {
                                    return (
                                        <div
                                            key={item.id || item.fileName || index}
                                            className={`media-list-row${isSelected ? ' is-selected' : ''}`}
                                        >
                                            <label style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', margin: 0, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => admin.toggleMediaSelection && admin.toggleMediaSelection(item)}
                                                    className="order-check"
                                                />
                                            </label>

                                            <div className="admin-soft-thumb media-list-thumb">
                                                <img src={admin.mediaPreviewUrl ? admin.mediaPreviewUrl(item) : ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>

                                            <div className="media-list-copy">
                                                <p className="media-file-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {item.fileName}
                                                </p>
                                                <p className="mono media-tag-hint" style={{ marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(item) : ''}
                                                </p>
                                            </div>

                                            <div className="media-list-metrics">
                                                <div className="media-list-metric">
                                                    <strong className="mono">{admin.formatBytes ? admin.formatBytes(item.size) : ''}</strong>
                                                    <small>Size</small>
                                                </div>
                                                <div className="media-list-metric">
                                                    <strong>{admin.date ? admin.date(item.modifiedAt) : ''}</strong>
                                                    <small>Updated</small>
                                                </div>
                                            </div>

                                            <div className="media-list-actions">
                                                {admin.mediaTrashMode ? (
                                                    <button
                                                        onClick={() => admin.restoreMedia && admin.restoreMedia(item)}
                                                        className="order-filter-btn primary"
                                                    >
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => admin.copyMediaTemplateTag && admin.copyMediaTemplateTag(item)}
                                                        className="order-filter-btn"
                                                    >
                                                        Copy Tag
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => admin.deleteMedia && admin.deleteMedia(item)}
                                                    className="order-filter-btn danger"
                                                >
                                                    {admin.mediaTrashMode ? 'Delete Forever' : 'Trash'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={item.id || item.fileName || index}
                                        className={`admin-card no-pad media-grid-card${isSelected ? ' is-selected' : ''}`}
                                    >
                                        <div className="media-grid-preview">
                                            <img
                                                src={admin.mediaPreviewUrl ? admin.mediaPreviewUrl(item) : ''}
                                                alt=""
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </div>
                                        <div className="media-grid-body">
                                            <div className="media-grid-head">
                                                <div style={{ overflow: 'hidden' }}>
                                                    <p className="media-grid-name">{item.fileName}</p>
                                                    <div className="media-grid-chip-row">
                                                        <span className="media-grid-chip mono">{admin.formatBytes ? admin.formatBytes(item.size) : ''}</span>
                                                        <span className="media-grid-chip">{admin.date ? admin.date(item.modifiedAt) : ''}</span>
                                                    </div>
                                                </div>
                                                <label style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', margin: 0 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => admin.toggleMediaSelection && admin.toggleMediaSelection(item)}
                                                        className="order-check"
                                                    />
                                                </label>
                                            </div>
                                            <p className="mono media-grid-meta" title={admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(item) : ''}>
                                                {admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(item) : ''}
                                            </p>
                                            <div className="media-actions-grid">
                                                {admin.mediaTrashMode ? (
                                                    <button
                                                        onClick={() => admin.restoreMedia && admin.restoreMedia(item)}
                                                        className="order-filter-btn primary"
                                                        title="Restore"
                                                    >
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => admin.copyMediaTemplateTag && admin.copyMediaTemplateTag(item)}
                                                        className="order-filter-btn"
                                                        title="Copy Tag"
                                                    >
                                                        Copy Tag
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => admin.deleteMedia && admin.deleteMedia(item)}
                                                    className="order-filter-btn danger"
                                                    title={admin.mediaTrashMode ? 'Delete Forever' : 'Trash'}
                                                >
                                                    {admin.mediaTrashMode ? 'Erase' : 'Trash'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <div className="media-library-pagination">
                <span className="mono media-library-pagination__meta">
                    Page {admin.mediaMeta?.page || 1} of {admin.mediaMeta?.totalPages || 1} ({admin.mediaMeta?.total || 0} items)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        disabled={(admin.mediaMeta?.page || 1) <= 1}
                        onClick={() => {
                            if (admin.mediaFilters) {
                                admin.mediaFilters.page = Math.max(1, (admin.mediaFilters.page || 1) - 1);
                                admin.loadMedia && admin.loadMedia();
                            }
                        }}
                        className="order-filter-btn"
                    >
                        Prev
                    </button>
                    <button
                        disabled={(admin.mediaMeta?.page || 1) >= (admin.mediaMeta?.totalPages || 1)}
                        onClick={() => {
                            if (admin.mediaFilters) {
                                admin.mediaFilters.page = (admin.mediaFilters.page || 1) + 1;
                                admin.loadMedia && admin.loadMedia();
                            }
                        }}
                        className="order-filter-btn"
                    >
                        Next
                    </button>
                </div>
            </div>

            {admin.mediaDeleteModal && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay">
                        <div className="admin-modal admin-soft-confirm-modal">
                            <h3 className="admin-soft-confirm-title">
                                {admin.mediaTrashMode ? 'Permanent Erase' : 'Move to Trash'}
                            </h3>
                            <p className="admin-soft-confirm-copy" style={{ marginBottom: '24px' }}>
                                {admin.mediaDeleteModal.type === 'single' && (
                                    <>Are you sure you want to {admin.mediaTrashMode ? 'forever erase' : 'trash'} <br /><strong className="admin-soft-value">{admin.mediaDeleteModal.item.fileName}</strong>?</>
                                )}
                                {admin.mediaDeleteModal.type === 'selected' && (
                                    <>Are you sure you want to {admin.mediaTrashMode ? 'forever erase' : 'trash'} <strong>{admin.mediaDeleteModal.count}</strong> selected images?</>
                                )}
                                {admin.mediaDeleteModal.type === 'all' && (
                                    <>Are you sure you want to {admin.mediaTrashMode ? 'forever erase' : 'trash'} <strong>ALL {admin.mediaDeleteModal.count}</strong> images?</>
                                )}
                                <br /><br />
                                {admin.mediaTrashMode ? 'This action cannot be undone.' : 'You can restore them later from the Trash Bin.'}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button
                                    onClick={() => { admin.mediaDeleteModal = null; admin.forceUpdate && admin.forceUpdate(); }}
                                    className="order-filter-btn"
                                    style={{ textAlign: 'center' }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => admin.executeMediaDelete && admin.executeMediaDelete(admin.mediaDeleteModal)}
                                    className="order-filter-btn danger"
                                    style={{ height: 'auto', padding: '12px', fontSize: '14px' }}
                                >
                                    CONFIRM
                                </button>
                            </div>
                        </div>
                    </div>
                </AdminModalPortal>
            )}
        </div>
    );
}
