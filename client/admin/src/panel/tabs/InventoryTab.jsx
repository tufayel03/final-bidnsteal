import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../AdminContext';
import { Icon } from '../components/Icon';
import { AdminModalPortal } from '../components/modals/AdminModalPortal';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';

export function InventoryTab() {
    const admin = useAdmin();
    const navigate = useNavigate();
    const { inventoryFilters, inventory = [], inventoryDeleting, categories = [], categoryFilters = {}, categoryEditor = {} } = admin;
    const inventoryView = admin.inventoryView || 'products';
    const lowStockCount = inventory.filter((item) => Number(item.stock || 0) < 10).length;
    const reservedUnits = inventory.reduce((total, item) => total + Number(item.reserved || 0), 0);
    const soldUnits = inventory.reduce((total, item) => total + Number(item.soldUnits || 0), 0);
    const auctionModeCount = inventory.filter((item) => String(item.mode || '').toLowerCase().includes('auction')).length;
    const categoriesWithProducts = categories.filter((item) => Number(item.productCount || 0) > 0).length;
    const defaultCategory = categories.find((item) => item.isDefault);

    const renderProductsView = () => (
        <>
            <div className="dashboard-stat-grid dashboard-stat-grid--primary">
                <DashboardStatCard
                    icon="boxes"
                    label="Catalog Size"
                    value={admin.number ? admin.number(inventory.length) : inventory.length}
                    meta={admin.inventoryTrashMode ? 'Trash inventory' : 'Live inventory'}
                    tone="stone"
                    featured
                />
                <DashboardStatCard
                    icon="triangle-alert"
                    label="Low Stock"
                    value={admin.number ? admin.number(lowStockCount) : lowStockCount}
                    meta="Below 10 units"
                    tone="clay"
                    compact
                />
                <DashboardStatCard
                    icon="layers-3"
                    label="Held Stock"
                    value={admin.number ? admin.number(reservedUnits) : reservedUnits}
                    meta="Held for active orders"
                    tone="sand"
                    compact
                />
                <DashboardStatCard
                    icon="shopping-bag"
                    label="Sold Units"
                    value={admin.number ? admin.number(soldUnits) : soldUnits}
                    meta="Units sold from orders"
                    tone="olive"
                    compact
                />
                <DashboardStatCard
                    icon="gavel"
                    label="Auction Mode"
                    value={admin.number ? admin.number(auctionModeCount) : auctionModeCount}
                    meta="Products tied to bidding"
                    tone="clay"
                    compact
                />
            </div>

            <div className="admin-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '200px', alignItems: 'center' }}>
                    <input
                        value={inventoryFilters.search || ''}
                        onChange={(e) => { admin.inventoryFilters.search = e.target.value; }}
                        type="text"
                        placeholder="Search title, slug..."
                        className="admin-search-input"
                        style={{ flex: 1 }}
                    />
                    <select
                        value={inventoryFilters.saleMode || 'All Sale Modes'}
                        onChange={(e) => { admin.inventoryFilters.saleMode = e.target.value; }}
                        className="order-filter-select"
                        style={{ flex: '0 1 auto', minWidth: '150px' }}
                    >
                        <option>All Sale Modes</option>
                        <option>Fixed Price</option>
                        <option>Auction</option>
                    </select>
                    <button
                        onClick={() => admin.loadInventory && admin.loadInventory(true)}
                        className="order-filter-btn"
                    >
                        Apply Filters
                    </button>
                </div>
                <div className="admin-soft-segment">
                    <button
                        onClick={() => { admin.inventoryTrashMode = !admin.inventoryTrashMode; admin.loadInventory && admin.loadInventory(true).then(() => admin.forceUpdate && admin.forceUpdate()); }}
                        className={`admin-soft-segment-btn is-danger${admin.inventoryTrashMode ? ' is-active' : ''}`}
                    >
                        {admin.inventoryTrashMode ? 'VIEW INVENTORY' : 'TRASH BIN'}
                    </button>
                </div>
            </div>

            <div className="order-panel p-3 flex flex-wrap items-center gap-2">
                <div className="order-selection-meta flex items-center gap-2 text-xs">
                    <span className="text-zinc-400">
                        Selected{' '}
                        <span className="mono text-zinc-200">{admin.number ? admin.number(admin.selectedInventoryCount ? admin.selectedInventoryCount() : 0) : 0}</span>
                        {' / '}
                        <span className="mono text-zinc-200">{admin.number ? admin.number(inventory.length) : 0}</span>
                    </span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => admin.selectAllVisibleInventory && admin.selectAllVisibleInventory()} className="order-filter-btn">
                        Select Visible
                    </button>
                    <button onClick={() => admin.clearInventorySelection && admin.clearInventorySelection()} className="order-filter-btn">
                        Clear
                    </button>
                    <button
                        onClick={() => admin.deleteSelectedInventory && admin.deleteSelectedInventory()}
                        disabled={!(admin.selectedInventoryCount && admin.selectedInventoryCount()) || inventoryDeleting}
                        className="order-filter-btn danger"
                    >
                        {inventoryDeleting ? 'Deleting...' : (admin.inventoryTrashMode ? 'Delete Forever' : 'Trash Selected')}
                    </button>
                </div>
            </div>

            <div className="admin-table-wrap">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px', paddingRight: '0' }}>
                                <input
                                    type="checkbox"
                                    checked={inventory.length > 0 && admin.selectedInventoryCount && admin.selectedInventoryCount() === inventory.length}
                                    onChange={(e) => e.target.checked ? admin.selectAllVisibleInventory() : admin.clearInventorySelection()}
                                    className="order-check"
                                />
                            </th>
                            <th>Image</th>
                            <th>Title / SKU</th>
                            <th>Category</th>
                            <th>Mode</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Held Stock</th>
                            <th>Sold</th>
                            <th>Available</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventory.map((item) => (
                            <tr key={item.id || item.slug}>
                                <td style={{ paddingRight: '0' }}>
                                    <input
                                        type="checkbox"
                                        checked={admin.isInventorySelected ? admin.isInventorySelected(item) : false}
                                        onChange={() => admin.toggleInventorySelection && admin.toggleInventorySelection(item)}
                                        className="order-check"
                                    />
                                </td>
                                <td>
                                    <div className="admin-soft-thumb" style={{ width: '40px', height: '40px' }}>
                                        {admin.mediaUrl && admin.mediaUrl(item.image) && (
                                            <img src={admin.mediaUrl(item.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <p style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{item.title}</p>
                                    <p className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.sku}</p>
                                    <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                                        {item.isFeatured && <span className="status-badge status-live">featured</span>}
                                        {item.isNewDrop && <span className="status-badge status-processing">new</span>}
                                    </div>
                                </td>
                                <td>
                                    <div className="inventory-category-pill">
                                        <Icon name="folder-tree" style={{ width: '13px', height: '13px' }} />
                                        <span>{item.category || 'Uncategorized'}</span>
                                    </div>
                                </td>
                                <td style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.mode}</td>
                                <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{admin.currency ? admin.currency(item.price) : ''}</td>
                                <td className="mono">{admin.number ? admin.number(item.stock) : ''}</td>
                                <td className="mono" style={{ color: 'var(--muted)' }}>{admin.number ? admin.number(item.reserved) : ''}</td>
                                <td className="mono" style={{ color: 'var(--text)', fontWeight: 700 }}>{admin.number ? admin.number(item.soldUnits) : ''}</td>
                                <td className="mono" style={{ fontWeight: 700 }}>{admin.number ? admin.number(item.stock - item.reserved) : ''}</td>
                                <td>
                                    <span className={`status-badge ${item.stock < 10 ? 'status-low' : 'status-delivered'}`}>
                                        {item.stock < 10 ? 'Low Stock' : 'In Stock'}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {admin.inventoryTrashMode ? (
                                            <button
                                                onClick={() => admin.restoreProduct && admin.restoreProduct(item)}
                                                className="order-icon-btn primary"
                                                title="Restore"
                                            >
                                                <Icon name="rotate-ccw" style={{ width: '14px', height: '14px' }} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => navigate(`/tufayel/panel/inventory/${item.id || item.slug}/buyers`)}
                                                className="order-icon-btn"
                                                title="Buyer list"
                                            >
                                                <Icon name="users" style={{ width: '14px', height: '14px' }} />
                                            </button>
                                        )}
                                        {!admin.inventoryTrashMode && (
                                            <button
                                                onClick={() => admin.openProductEdit && admin.openProductEdit(item)}
                                                className="order-icon-btn"
                                                title="Edit product"
                                            >
                                                <Icon name="edit-3" style={{ width: '14px', height: '14px' }} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => admin.deleteProduct && admin.deleteProduct(item)}
                                            className="order-icon-btn danger"
                                            title={admin.inventoryTrashMode ? 'Permanent Erase' : 'Move to Trash'}
                                        >
                                            <Icon name={admin.inventoryTrashMode ? 'x-circle' : 'trash-2'} style={{ width: '14px', height: '14px' }} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );

    const renderCategoriesView = () => (
        <>
            <div className="dashboard-stat-grid dashboard-stat-grid--primary">
                <DashboardStatCard
                    icon="folder-tree"
                    label="Category Library"
                    value={admin.number ? admin.number(categories.length) : categories.length}
                    meta="Managed taxonomy"
                    tone="stone"
                    featured
                />
                <DashboardStatCard
                    icon="package-check"
                    label="Used Categories"
                    value={admin.number ? admin.number(categoriesWithProducts) : categoriesWithProducts}
                    meta="Assigned to products"
                    tone="olive"
                    compact
                />
                <DashboardStatCard
                    icon="package-x"
                    label="Empty Categories"
                    value={admin.number ? admin.number(Math.max(0, categories.length - categoriesWithProducts)) : Math.max(0, categories.length - categoriesWithProducts)}
                    meta="Ready for future products"
                    tone="sand"
                    compact
                />
                <DashboardStatCard
                    icon="shield-check"
                    label="Default Category"
                    value={defaultCategory?.name || 'Unset'}
                    meta="Fallback on delete"
                    tone="clay"
                    compact
                />
            </div>

            <div className="inventory-category-layout">
                <div className="inventory-category-form-card admin-card">
                    <div className="inventory-section-head">
                        <div>
                            <span className="inventory-section-eyebrow">Category Builder</span>
                            <h3>{categoryEditor.id ? 'Edit Category' : 'Create Category'}</h3>
                            <p>Build reusable product categories and assign them from the product form.</p>
                        </div>
                        <div className="inventory-category-head-icon">
                            <Icon name="folder-plus" style={{ width: '18px', height: '18px' }} />
                        </div>
                    </div>

                    <div className="inventory-category-form-grid">
                        <div>
                            <label className="settings-label">Category Name</label>
                            <input
                                value={categoryEditor.name || ''}
                                onChange={(e) => { admin.categoryEditor.name = e.target.value; }}
                                placeholder="Die-cast Cars"
                                className="admin-search-input"
                            />
                        </div>
                        <div>
                            <label className="settings-label">Slug</label>
                            <input
                                value={categoryEditor.slug || ''}
                                onChange={(e) => { admin.categoryEditor.slug = e.target.value; }}
                                placeholder="auto from name"
                                className="admin-search-input"
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="settings-label">Description</label>
                            <textarea
                                value={categoryEditor.description || ''}
                                onChange={(e) => { admin.categoryEditor.description = e.target.value; }}
                                placeholder="Optional note for admins about when to use this category."
                                className="settings-textarea admin-search-input"
                            />
                        </div>
                    </div>

                    <div className="inventory-category-note">
                        <Icon name="info" style={{ width: '14px', height: '14px' }} />
                        <span>Deleting a category automatically moves linked products into {defaultCategory?.name || 'Uncategorized'}.</span>
                    </div>

                    <div className="inventory-category-form-actions">
                        <button
                            type="button"
                            onClick={() => admin.cancelCategoryEdit && admin.cancelCategoryEdit()}
                            className="order-filter-btn"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={() => admin.saveCategoryEditor && admin.saveCategoryEditor()}
                            className="order-filter-btn primary"
                            disabled={admin.categorySaving}
                        >
                            {admin.categorySaving ? 'Saving...' : (categoryEditor.id ? 'Save Category' : 'Create Category')}
                        </button>
                    </div>
                </div>

                <div className="inventory-category-list-card admin-card">
                    <div className="inventory-section-head inventory-section-head--tight">
                        <div>
                            <span className="inventory-section-eyebrow">Taxonomy Library</span>
                            <h3>Existing Categories</h3>
                            <p>Manage reusable product groupings and keep the catalog structured.</p>
                        </div>
                        <div className="inventory-category-toolbar">
                            <input
                                value={categoryFilters.search || ''}
                                onChange={(e) => { admin.categoryFilters.search = e.target.value; }}
                                type="text"
                                placeholder="Search category..."
                                className="admin-search-input"
                            />
                            <button
                                type="button"
                                onClick={() => admin.loadCategories && admin.loadCategories()}
                                className="order-filter-btn"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    <div className="inventory-category-list-head">
                        <span>Category</span>
                        <span>Slug</span>
                        <span>Products</span>
                        <span>Description</span>
                        <span>Actions</span>
                    </div>

                    <div className="inventory-category-list">
                        {categories.length ? categories.map((category) => (
                            <div key={category.id} className="inventory-category-row">
                                <div className="inventory-category-main">
                                    <div className="inventory-category-badge">
                                        <Icon name={category.isDefault ? 'shield-check' : 'folder-tree'} style={{ width: '14px', height: '14px' }} />
                                        <span>{category.name}</span>
                                    </div>
                                    {category.isDefault && <span className="status-badge status-processing">default</span>}
                                </div>
                                <div className="inventory-category-meta mono">{category.slug}</div>
                                <div className="inventory-category-count">
                                    <strong>{admin.number ? admin.number(category.productCount || 0) : category.productCount || 0}</strong>
                                    <span>{Number(category.productCount || 0) === 1 ? 'product' : 'products'}</span>
                                </div>
                                <div className="inventory-category-description">{category.description || 'No admin description set.'}</div>
                                <div className="inventory-category-actions">
                                    <button
                                        type="button"
                                        onClick={() => admin.startCategoryEdit && admin.startCategoryEdit(category)}
                                        className="order-filter-btn"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm(`Delete "${category.name}"? Linked products will move to ${defaultCategory?.name || 'Uncategorized'}.`)) {
                                                admin.deleteCategory && admin.deleteCategory(category);
                                            }
                                        }}
                                        className="order-filter-btn danger"
                                        disabled={category.isDefault || admin.categoryDeletingId === category.id}
                                    >
                                        {admin.categoryDeletingId === category.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="coupon-empty-state">
                                <strong>No categories found.</strong>
                                <p>Create your first category here, then reuse it across products from the product editor.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div style={{ display: 'grid', gap: '24px' }}>
            <div className="admin-tab-header">
                <div>
                    <h2>{inventoryView === 'categories' ? 'Category Management' : (admin.inventoryTrashMode ? 'Inventory Trash' : 'Inventory Management')}</h2>
                    <p>
                        {inventoryView === 'categories'
                            ? 'Create reusable catalog categories and use them across product creation.'
                            : (admin.inventoryTrashMode
                                ? 'Restore deleted products or permanently erase them.'
                                : 'Manage products, view stock levels, and control pricing.')}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="admin-soft-segment">
                        <button
                            type="button"
                            onClick={() => { admin.inventoryView = 'products'; admin.forceUpdate && admin.forceUpdate(); }}
                            className={`admin-soft-segment-btn${inventoryView === 'products' ? ' is-active' : ''}`}
                        >
                            Products
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                admin.inventoryView = 'categories';
                                admin.loadCategories && admin.loadCategories().then(() => admin.forceUpdate && admin.forceUpdate());
                            }}
                            className={`admin-soft-segment-btn${inventoryView === 'categories' ? ' is-active' : ''}`}
                        >
                            Categories
                        </button>
                    </div>
                    {inventoryView === 'products' ? (
                        !admin.inventoryTrashMode && (
                            <button
                                onClick={() => admin.openProductCreate && admin.openProductCreate()}
                                className="order-filter-btn primary"
                            >
                                + Add Product
                            </button>
                        )
                    ) : (
                        <button
                            type="button"
                            onClick={() => admin.startCategoryCreate && admin.startCategoryCreate()}
                            className="order-filter-btn primary"
                        >
                            + New Category
                        </button>
                    )}
                </div>
            </div>

            {inventoryView === 'products' ? renderProductsView() : renderCategoriesView()}

            {admin.inventoryDeleteModal && (
                <AdminModalPortal>
                    <div className="admin-modal-overlay">
                        <div className="admin-modal admin-soft-confirm-modal">
                            <h3 className="admin-soft-confirm-title">
                                {admin.inventoryTrashMode ? 'Permanent Erase' : 'Move to Trash'}
                            </h3>
                            <p className="admin-soft-confirm-copy" style={{ marginBottom: '24px' }}>
                                {admin.inventoryDeleteModal.type === 'single' && (
                                    <>Are you sure you want to {admin.inventoryTrashMode ? 'forever erase' : 'trash'} <br /><strong className="admin-soft-value">{admin.inventoryDeleteModal.item?.title || admin.inventoryDeleteModal.item?.slug}</strong>?</>
                                )}
                                {admin.inventoryDeleteModal.type === 'selected' && (
                                    <>Are you sure you want to {admin.inventoryTrashMode ? 'forever erase' : 'trash'} <strong>{admin.inventoryDeleteModal.count}</strong> selected product(s)?</>
                                )}
                                <br /><br />
                                {admin.inventoryTrashMode ? 'This action cannot be undone.' : 'You can restore them later from the Trash Bin.'}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button
                                    onClick={() => { admin.inventoryDeleteModal = null; admin.forceUpdate && admin.forceUpdate(); }}
                                    className="order-filter-btn"
                                    style={{ textAlign: 'center' }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => admin.executeInventoryDelete && admin.executeInventoryDelete(admin.inventoryDeleteModal)}
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
