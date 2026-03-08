import React from 'react';
import { useAdmin } from '../AdminContext';
import { AdminModalPortal } from '../components/modals/AdminModalPortal';

export function MediaTab() {
    const admin = useAdmin();
    const { mediaFilters, mediaUpload } = admin;

    const filtered = admin.filteredMediaAssets ? admin.filteredMediaAssets() : [];

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

            {!admin.mediaTrashMode && (
                <div className="admin-card">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', alignItems: 'center' }}>
                        <div>
                            <label className="admin-soft-subtle" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px', fontWeight: 700 }}>Upload Images</label>
                            <div className="admin-soft-upload relative cursor-pointer w-full group">
                                <input
                                    id="mediaUploadInput"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => admin.onMediaFileChange && admin.onMediaFileChange(e)}
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 10 }}
                                />
                                <div className="admin-soft-upload__body pointer-events-none">
                                    <span className="admin-soft-upload__title">
                                        {mediaUpload.uploading ? 'UPLOADING DATA...' : 'SELECT DIGITAL ASSETS'}
                                    </span>
                                    <span className="admin-soft-upload__caption">
                                        {mediaUpload.uploading ? 'Please wait while asset is being stored' : 'Drag & drop or Click to browse'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="admin-card">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '200px' }}>
                        <input
                            value={mediaFilters.search || ''}
                            onChange={(e) => { admin.mediaFilters.search = e.target.value; }}
                            placeholder="Search by file name..."
                            className="admin-search-input"
                            style={{ flex: 1 }}
                        />
                        <button onClick={() => admin.loadMedia && admin.loadMedia(null, true)} className="order-filter-btn">
                            Search
                        </button>
                    </div>
                    <div className="admin-soft-segment">
                        <button
                            onClick={() => { admin.mediaViewMode = 'grid'; admin.forceUpdate && admin.forceUpdate(); }}
                            className={`admin-soft-segment-btn${admin.mediaViewMode === 'grid' ? ' is-active' : ''}`}
                        >
                            GRID
                        </button>
                        <button
                            onClick={() => { admin.mediaViewMode = 'columns'; admin.forceUpdate && admin.forceUpdate(); }}
                            className={`admin-soft-segment-btn${admin.mediaViewMode === 'columns' ? ' is-active' : ''}`}
                        >
                            LIST
                        </button>
                        <button
                            onClick={() => { admin.mediaTrashMode = !admin.mediaTrashMode; admin.loadMedia && admin.loadMedia(null, true).then(() => admin.forceUpdate && admin.forceUpdate()); }}
                            className={`admin-soft-segment-btn is-danger${admin.mediaTrashMode ? ' is-active' : ''}`}
                        >
                            {admin.mediaTrashMode ? 'VIEW LIBRARY' : 'TRASH BIN'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="order-panel">
                <p className="order-selection-meta">
                    Selected: <span className="mono">{admin.number ? admin.number(admin.selectedMediaCount ? admin.selectedMediaCount() : 0) : 0}</span>
                    {' / '}
                    <span className="mono">{admin.number ? admin.number(filtered.length) : 0}</span> visible
                </p>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={() => admin.selectAllVisibleMedia && admin.selectAllVisibleMedia()} className="order-filter-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        Select Visible
                    </button>
                    <button onClick={() => admin.clearMediaSelection && admin.clearMediaSelection()} className="order-filter-btn" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        Clear Selection
                    </button>
                    {admin.mediaTrashMode && (
                        <button onClick={() => admin.restoreSelectedMedia && admin.restoreSelectedMedia()} className="order-filter-btn primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                            Restore Selected
                        </button>
                    )}
                    <button onClick={() => admin.deleteSelectedMedia && admin.deleteSelectedMedia()} className="order-filter-btn danger" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        {admin.mediaTrashMode ? 'Delete Forever' : 'Trash Selected'}
                    </button>
                    <button onClick={() => admin.deleteAllMedia && admin.deleteAllMedia()} className="order-filter-btn danger" style={{ padding: '6px 12px', fontSize: '12px' }}>
                        {admin.mediaTrashMode ? 'Empty Trash' : 'Trash All Images'}
                    </button>
                </div>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: admin.mediaViewMode === 'columns'
                        ? '1fr'
                        : 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: admin.mediaViewMode === 'columns' ? '0px' : '16px',
                    border: admin.mediaViewMode === 'columns' ? '1px solid var(--border-strong)' : 'none',
                    borderRadius: admin.mediaViewMode === 'columns' ? '4px' : '0'
                }}
            >
                {filtered.map((item, index) => {
                    const isSelected = admin.isMediaSelected && admin.isMediaSelected(item);

                    if (admin.mediaViewMode === 'columns') {
                        // LIST VIEW (Table Row Style)
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

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p className="media-file-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.fileName}
                                    </p>
                                    <p className="mono media-tag-hint" style={{ marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(item.fileName) : ''}
                                    </p>
                                </div>

                                <div style={{ width: '120px', flexShrink: 0 }}>
                                    <p className="mono media-meta-text">{admin.formatBytes ? admin.formatBytes(item.size) : ''}</p>
                                </div>

                                <div style={{ width: '120px', flexShrink: 0 }}>
                                    <p className="mono media-meta-text">{admin.date ? admin.date(item.modifiedAt) : ''}</p>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    {admin.mediaTrashMode ? (
                                        <button
                                            onClick={() => admin.restoreMedia && admin.restoreMedia(item)}
                                            className="order-filter-btn primary" style={{ padding: '6px 12px' }}
                                        >
                                            Restore
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => admin.copyMediaTemplateTag && admin.copyMediaTemplateTag(item)}
                                            className="order-filter-btn" style={{ padding: '6px 12px' }}
                                        >
                                            Copy Tag
                                        </button>
                                    )}
                                    <button
                                        onClick={() => admin.deleteMedia && admin.deleteMedia(item)}
                                        className="order-filter-btn danger" style={{ padding: '6px 12px' }}
                                    >
                                        {admin.mediaTrashMode ? 'Delete Forever' : 'Trash'}
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    // GRID VIEW (Thumbnail Cards)
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
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px' }}>
                                    <div style={{ overflow: 'hidden' }}>
                                        <p className="media-grid-name">{item.fileName}</p>
                                        <p className="mono media-grid-meta" style={{ marginTop: '2px' }}>{admin.formatBytes ? admin.formatBytes(item.size) : ''}</p>
                                        <p className="mono media-grid-meta" style={{ marginTop: '2px', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis' }} title={admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(item.fileName) : ''}>
                                            {admin.mediaTemplatePlaceholder ? admin.mediaTemplatePlaceholder(item.fileName) : ''}
                                        </p>
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
                                <div className="media-actions-grid" style={{ marginTop: '2px' }}>
                                    {admin.mediaTrashMode ? (
                                        <button
                                            onClick={() => admin.restoreMedia && admin.restoreMedia(item)}
                                            className="order-filter-btn primary" style={{ padding: '4px', fontSize: '10px' }}
                                            title="Restore"
                                        >
                                            Restore
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => admin.copyMediaTemplateTag && admin.copyMediaTemplateTag(item)}
                                            className="order-filter-btn" style={{ padding: '4px', fontSize: '10px' }}
                                            title="Copy Tag"
                                        >
                                            Copy
                                        </button>
                                    )}
                                    <button
                                        onClick={() => admin.deleteMedia && admin.deleteMedia(item)}
                                        className="order-filter-btn danger" style={{ padding: '4px', fontSize: '10px' }}
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
            {filtered.length === 0 && <div className="text-sm text-zinc-500">No media found.</div>}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <span className="mono media-paging-copy" style={{ fontSize: '12px' }}>
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
        </div >
    );
}
