import { useEffect, useState } from 'react';
import api from '../utils/axios';
import type { Item } from '../types';
import { Plus, Search, Edit, Trash2, LayoutGrid, List as ListIcon } from 'lucide-react';

export const Inventory = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [serials, setSerials] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ item_name: '', master_price: '', category: '' });

    // Add Item State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ item_code: '', item_name: '', master_price: '', category: 'General', serial_number: '', quantity: '1' });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await api.get('/items');
            setItems(response.data);
        } catch (error) {
            console.error('Failed to fetch items', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchItemDetails = async (item: Item) => {
        setSelectedItem(item);
        setEditForm({
            item_name: item.item_name,
            master_price: item.master_price.toString(),
            category: item.category || 'General'
        });
        setIsEditing(false);
        try {
            const response = await api.get(`/items/${item.item_code}/all-serials`);
            setSerials(response.data);
        } catch (error) {
            console.error('Failed to fetch serials', error);
        }
    };

    const getCategoryConfig = (cat: string) => {
        const lowerCat = (cat + ' ' + addForm.item_name).toLowerCase().trim();
        if (lowerCat.includes('fabric')) return { type: 'batch', unit: 'Meters', requireSerial: false };
        if (lowerCat.includes('other silk') || lowerCat.includes('dothi') || lowerCat.includes('accessories')) return { type: 'none', unit: 'Each', requireSerial: false };
        // Default to Zari Silk / Saree serial tracking
        return { type: 'serial', unit: 'Each', requireSerial: true };
    };

    const handleCreateItem = async () => {
        const config = getCategoryConfig(addForm.category);

        // Validation: Serial/Batch Number is conditional
        if (!addForm.item_code || !addForm.item_name || !addForm.master_price) {
            alert('Please fill in ALL required fields.');
            return;
        }

        if (config.requireSerial && !addForm.serial_number) {
            alert('Serial number is required for this category.');
            return;
        }

        try {
            await api.post('/items', {
                ...addForm,
                master_price: parseFloat(addForm.master_price),
                inventory_type: config.type,
                unit_of_measure: config.unit,
                quantity: parseInt(addForm.quantity) || 1
            });
            alert('Item created successfully');
            setShowAddModal(false);
            setAddForm({ item_code: '', item_name: '', master_price: '', category: 'General', serial_number: '', quantity: '1' });
            fetchItems();
        } catch (error: any) {
            console.error('Create failed', error);
            alert(error.response?.data?.message || 'Failed to create item');
        }
    };

    const handleUpdate = async () => {
        if (!selectedItem) return;
        try {
            await api.put(`/items/${selectedItem.item_id}`, {
                ...editForm,
                master_price: parseFloat(editForm.master_price)
            });
            alert('Item updated successfully');
            setIsEditing(false);
            fetchItems(); // Refresh list
            setSelectedItem(null); // Close modal
        } catch (error) {
            console.error('Update failed', error);
            alert('Failed to update item');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This will delete the item and ALL its history.')) return;
        try {
            await api.delete(`/items/${id}`);
            alert('Item deleted');
            setSelectedItem(null);
            fetchItems();
        } catch (error) {
            console.error('Delete failed', error);
            alert('Failed to delete item');
        }
    };

    const filteredItems = items.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <div className="skeleton" style={{ height: '32px', width: '200px', marginBottom: '0.5rem' }}></div>
                        <div className="skeleton" style={{ height: '20px', width: '300px' }}></div>
                    </div>
                    <div className="skeleton" style={{ height: '40px', width: '120px' }}></div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                    <div className="skeleton" style={{ height: '50px', width: '100%', borderRadius: 'var(--radius-md)' }}></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div className="skeleton" style={{ height: '160px', width: '100%' }}></div>
                            <div style={{ padding: '1.5rem', flex: 1 }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <div className="skeleton" style={{ height: '20px', width: '80%', marginBottom: '0.5rem' }}></div>
                                    <div className="skeleton" style={{ height: '16px', width: '40%' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
                                    <div className="skeleton" style={{ height: '24px', width: '60px' }}></div>
                                    <div className="skeleton" style={{ height: '16px', width: '40px' }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Inventory</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your detailed stock and items</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn btn-primary"
                >
                    <Plus size={20} />
                    Add Item
                </button>
            </div>

            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '1rem', color: 'var(--text-secondary)' }}>
                        <Search size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input"
                        style={{ paddingLeft: '3rem', fontSize: '1rem', padding: '1rem 3rem', width: '100%' }}
                    />
                </div>

                {/* View Toggles */}
                <div style={{ display: 'flex', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setViewMode('card')}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: viewMode === 'card' ? 'var(--bg-color)' : 'transparent', color: viewMode === 'card' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', ... (viewMode === 'card' ? { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : {}) }}
                        title="Card View"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: viewMode === 'list' ? 'var(--bg-color)' : 'transparent', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s', ... (viewMode === 'list' ? { boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : {}) }}
                        title="List View"
                    >
                        <ListIcon size={20} />
                    </button>
                </div>
            </div>

            {viewMode === 'card' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    {filteredItems.map((item) => (
                        <div
                            key={item.item_id}
                            onClick={() => fetchItemDetails(item)}
                            className="card"
                            style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                        >
                            <div style={{ height: '160px', backgroundColor: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ color: '#94a3b8' }}>No Image</span>
                                )}
                                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                                    <span className={`badge ${item.stock_quantity > 0 ? 'badge-success' : 'badge-danger'}`}>
                                        {item.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ padding: '1.5rem', flex: 1 }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontWeight: '600', fontSize: '1.125rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{item.item_name}</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{item.item_code}</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem' }}>
                                    <span style={{ fontWeight: '700', fontSize: '1.5rem', color: 'var(--primary)' }}>₹{item.master_price}</span>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {item.stock_quantity} units
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                            <tr>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Image</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Item Details</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Price</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Stock</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr
                                    key={item.item_id}
                                    onClick={() => fetchItemDetails(item)}
                                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-color)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ padding: '1rem' }}>
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.item_name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
                                        ) : (
                                            <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>No Img</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{item.item_name}</div>
                                        <div style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{item.item_code}</div>
                                    </td>
                                    <td style={{ padding: '1rem', fontWeight: '700', color: 'var(--primary)' }}>₹{item.master_price}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className={`badge ${item.stock_quantity > 0 ? 'badge-success' : 'badge-danger'}`}>
                                            {item.stock_quantity > 0 ? `${item.stock_quantity} Units` : 'Out of Stock'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>Manage</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Add New Item</h2>
                            <button onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>Close</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Item Code (Unique)</label>
                                <input
                                    className="input"
                                    value={addForm.item_code}
                                    onChange={e => setAddForm({ ...addForm, item_code: e.target.value })}
                                    placeholder="e.g. saree-001"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Item Name</label>
                                <input
                                    className="input"
                                    value={addForm.item_name}
                                    onChange={e => setAddForm({ ...addForm, item_name: e.target.value })}
                                    placeholder="e.g. Silk Saree Red"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Price (₹)</label>
                                    <input
                                        className="input"
                                        value={addForm.master_price}
                                        onChange={e => setAddForm({ ...addForm, master_price: e.target.value })}
                                        placeholder="0.00"
                                        type="number"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Category</label>
                                    <input
                                        className="input"
                                        value={addForm.category}
                                        onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                                        placeholder="e.g. Sarees - Zari Silk, Fabrics"
                                    />
                                </div>
                            </div>

                            {/* Dynamic Fields based on Category */}
                            {getCategoryConfig(addForm.category).requireSerial ? (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Initial Serial Number (Required)</label>
                                    <input
                                        className="input"
                                        value={addForm.serial_number}
                                        onChange={e => setAddForm({ ...addForm, serial_number: e.target.value })}
                                        placeholder="e.g. SN-001"
                                    />
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {getCategoryConfig(addForm.category).type === 'batch' && (
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Batch Number (Optional)</label>
                                            <input
                                                className="input"
                                                value={addForm.serial_number}
                                                onChange={e => setAddForm({ ...addForm, serial_number: e.target.value })}
                                                placeholder="e.g. BATCH-A1"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                            Initial Quantity ({getCategoryConfig(addForm.category).unit})
                                        </label>
                                        <input
                                            className="input"
                                            value={addForm.quantity}
                                            onChange={e => setAddForm({ ...addForm, quantity: e.target.value })}
                                            placeholder="1"
                                            type="number"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleCreateItem}
                                className="btn btn-primary"
                                style={{ marginTop: '0.5rem', padding: '1rem' }}
                            >
                                <Plus size={18} /> Create Item
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Item Details Modal */}
            {selectedItem && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '900px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                                {isEditing ? 'Edit Item' : 'Item Details'}
                            </h2>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {!isEditing && (
                                    <>
                                        <button onClick={() => setIsEditing(true)} className="btn btn-secondary">
                                            <Edit size={16} /> Edit
                                        </button>
                                        <button onClick={() => handleDelete(selectedItem.item_id)} className="btn btn-danger">
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </>
                                )}
                                <button onClick={() => setSelectedItem(null)} className="btn btn-secondary">Close</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
                                <div className="card" style={{ width: '220px', height: '220px', padding: 0, overflow: 'hidden' }}>
                                    {selectedItem.image_url ? (
                                        <img src={selectedItem.image_url} alt="Item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#9ca3af' }}>No Image</div>
                                    )}
                                </div>

                                <div>
                                    <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Master View Images</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '220px' }}>
                                        {(selectedItem as any).master_images.filter((img: any) => img && img.url).map((img: any, idx: number) => (
                                            <div key={idx} style={{ width: '68px' }}>
                                                <img src={img.url} alt={img.type} style={{ width: '100%', height: '68px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                                                <div style={{ fontSize: '0.65rem', textAlign: 'center', marginTop: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{img.type}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ flex: 1 }}>
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* Edit Form similar to Add Form but repurposed */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Item Name</label>
                                            <input
                                                className="input"
                                                value={editForm.item_name}
                                                onChange={e => setEditForm({ ...editForm, item_name: e.target.value })}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Price</label>
                                                <input
                                                    className="input"
                                                    value={editForm.master_price}
                                                    onChange={e => setEditForm({ ...editForm, master_price: e.target.value })}
                                                    type="number"
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Category</label>
                                                <input
                                                    className="input"
                                                    value={editForm.category}
                                                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '1rem' }}>
                                            <button onClick={handleUpdate} className="btn btn-primary">Save Changes</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Item Name</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: '600' }}>{selectedItem.item_name}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Item Code</p>
                                            <p style={{ fontFamily: 'monospace', fontSize: '1.125rem' }}>{selectedItem.item_code}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '3rem' }}>
                                            <div>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Master Price</p>
                                                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>₹{selectedItem.master_price}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Stock Status</p>
                                                <span className={`badge ${selectedItem.stock_quantity > 0 ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: '0.25rem' }}>
                                                    {selectedItem.stock_quantity} Units Available
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Stock History</h3>
                        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ backgroundColor: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Image</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Serial #</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Added On</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>Sold To</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serials.map((serial) => (
                                        <tr key={serial.serial_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem' }}>
                                                {serial.image_url ? (
                                                    <img src={serial.image_url} alt="Serial" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                                ) : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{serial.serial_number}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className={`badge ${serial.status === 'available' ? 'badge-success' : 'badge-danger'}`}>
                                                    {serial.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                                {new Date(serial.date_added).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                                {serial.sold_to_name || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
