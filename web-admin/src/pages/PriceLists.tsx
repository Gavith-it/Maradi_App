import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import * as XLSX from 'xlsx';
import { Plus, Search, Save, List as ListIcon, Loader, RefreshCw, Download } from 'lucide-react';

interface PriceList {
    price_list_id: number;
    name: string;
    description: string;
}

interface PriceListItem {
    item_id: number;
    item_code: string;
    item_name: string;
    master_price: string | number;
    current_price: string | number | null;
    image_url: string | null;
}

export const PriceLists = () => {
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [selectedList, setSelectedList] = useState<PriceList | null>(null);
    const [items, setItems] = useState<PriceListItem[]>([]);
    const [loadingLists, setLoadingLists] = useState(true);
    const [loadingItems, setLoadingItems] = useState(false);

    // Editable state mapping item_id -> custom price string
    const [editablePrices, setEditablePrices] = useState<Record<number, string>>({});
    const [searchTerm, setSearchTerm] = useState('');

    // Add list modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchPriceLists();
    }, []);

    const fetchPriceLists = async () => {
        setLoadingLists(true);
        try {
            const response = await api.get('/price-lists');
            setPriceLists(response.data);
            if (response.data.length > 0 && !selectedList) {
                handleSelectOption(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to fetch price lists', error);
        } finally {
            setLoadingLists(false);
        }
    };

    const handleSelectOption = async (list: PriceList) => {
        setSelectedList(list);
        setEditablePrices({});
        fetchListItems(list.price_list_id);
    };

    const fetchListItems = async (listId: number) => {
        setLoadingItems(true);
        try {
            const response = await api.get(`/price-lists/${listId}/items`);
            setItems(response.data);

            // Pre-populate edits with what's currently in the DB
            const prefill: Record<number, string> = {};
            response.data.forEach((i: PriceListItem) => {
                if (i.current_price !== null && i.current_price !== undefined) {
                    prefill[i.item_id] = i.current_price.toString();
                }
            });
            setEditablePrices(prefill);

        } catch (error) {
            console.error('Failed to fetch list items', error);
        } finally {
            setLoadingItems(false);
        }
    };

    const handleCreateList = async () => {
        if (!addForm.name) {
            alert('Price list name is required');
            return;
        }
        try {
            const response = await api.post('/price-lists', addForm);
            setPriceLists([response.data, ...priceLists]);
            setShowAddModal(false);
            setAddForm({ name: '', description: '' });
            handleSelectOption(response.data);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to create price list');
        }
    };

    const handlePriceChange = (itemId: number, val: string) => {
        setEditablePrices(prev => ({
            ...prev,
            [itemId]: val
        }));
    };

    const handleSavePrices = async () => {
        if (!selectedList) return;

        // Convert object mapping to array mapping the API expects { item_id, price }
        const payloadItems = Object.keys(editablePrices).map(idStr => {
            const val = editablePrices[parseInt(idStr)];
            return {
                item_id: parseInt(idStr),
                price: val === '' ? null : parseFloat(val) // Allow clearing the override
            };
        });

        try {
            await api.put(`/price-lists/${selectedList.price_list_id}/items`, {
                items: payloadItems
            });
            alert('Prices saved successfully!');
            fetchListItems(selectedList.price_list_id); // Refresh to get exact states
        } catch (error) {
            console.error('Failed to save prices', error);
            alert('Failed to save prices');
        }
    };

    const filteredItems = items.filter(i =>
        i.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.item_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, startingIndex: number) => {
        const pastedText = e.clipboardData.getData('Text');
        if (!pastedText) return;

        // Remove the trailing newline that Excel puts at the end of a copied column
        const cleanText = pastedText.replace(/\r?\n$/, '');
        const rows = cleanText.split(/\r?\n/);

        if (rows.length > 1) {
            e.preventDefault();
            setEditablePrices(prev => {
                const newPrices = { ...prev };
                for (let i = 0; i < rows.length; i++) {
                    const itemIndex = startingIndex + i;
                    if (itemIndex < filteredItems.length) {
                        const itemId = filteredItems[itemIndex].item_id;
                        const rawVal = rows[i].trim();
                        if (rawVal === '') {
                            newPrices[itemId] = '';
                        } else {
                            const numericVal = rawVal.replace(/[^0-9.]/g, '');
                            if (numericVal !== '') {
                                newPrices[itemId] = numericVal;
                            }
                        }
                    }
                }
                return newPrices;
            });
        }
    };

    const handleExportExcel = () => {
        if (!selectedList || items.length === 0) return;

        // Group the data specifically for the Excel Export
        const exportData = filteredItems.map(item => {
            const currentPrice = item.current_price !== null ? item.current_price : '(Using Master)';
            const pendingEdit = editablePrices[item.item_id] !== undefined ? editablePrices[item.item_id] : '';
            return {
                'Item Code': item.item_code,
                'Item Name': item.item_name,
                'Master Price': item.master_price,
                'Current List Price': currentPrice,
                'Pending Edit Price': pendingEdit
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Price List");

        // Auto-size columns slightly
        const wscols = [
            { wch: 15 }, // Code
            { wch: 30 }, // Name
            { wch: 15 }, // Master Price
            { wch: 20 }, // Current Price
            { wch: 20 }  // Pending Price
        ];
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `${selectedList.name.replace(/\s+/g, '_')}_Export.xlsx`);
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 4rem)', gap: '2rem' }}>
            {/* Sidebar for Price Lists */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Price Lists</h2>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary"
                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}
                        title="Add New List"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loadingLists ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Loader size={24} className="spin" style={{ margin: '0 auto' }} />
                        </div>
                    ) : priceLists.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No price lists found. Create one!
                        </div>
                    ) : (
                        priceLists.map(list => (
                            <div
                                key={list.price_list_id}
                                onClick={() => handleSelectOption(list)}
                                style={{
                                    padding: '1.25rem 1.5rem',
                                    borderBottom: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    backgroundColor: selectedList?.price_list_id === list.price_list_id ? 'var(--bg-color)' : 'transparent',
                                    borderLeft: selectedList?.price_list_id === list.price_list_id ? '4px solid var(--primary)' : '4px solid transparent',
                                    transition: 'background 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: '600', color: selectedList?.price_list_id === list.price_list_id ? 'var(--primary)' : 'var(--text-main)' }}>
                                    {list.name}
                                </div>
                                {list.description && (
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        {list.description}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Area showing Items spread sheet */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {selectedList ? (
                    <>
                        {/* Header Area */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                    Editing: {selectedList.name}
                                </h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Set custom override prices for items in this list.</p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ position: 'relative', width: '250px' }}>
                                    <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0.75rem', color: 'var(--text-secondary)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search items..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="input"
                                        style={{ paddingLeft: '2.25rem', paddingRight: '1rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                                    />
                                </div>
                                <button
                                    onClick={handleExportExcel}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white' }}
                                >
                                    <Download size={18} />
                                    Export List
                                </button>
                                <button
                                    onClick={handleSavePrices}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Save size={18} />
                                    Save Changes
                                </button>
                            </div>
                        </div>

                        {/* Table Area */}
                        <div style={{ flex: 1, overflow: 'auto' }}>
                            {loadingItems ? (
                                <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                                    <Loader size={32} className="spin" />
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <tr>
                                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Image</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Item Code</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Item Name</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>Master Price</th>
                                            <th style={{ padding: '1rem', color: 'var(--primary)', fontWeight: '700', borderBottom: '1px solid var(--border-color)' }}>Current List Price</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: '700', borderBottom: '1px solid var(--border-color)', backgroundColor: '#eff6ff' }}>Custom Price (Type Here)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map((item, index) => {
                                            const isOverrideSet = item.current_price !== null;
                                            return (
                                                <tr key={item.item_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                                                        {item.image_url ? (
                                                            <img src={item.image_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                                                        ) : (
                                                            <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.65rem' }}>Img</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontFamily: 'monospace' }}>{item.item_code}</td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: '500' }}>{item.item_name}</td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>₹{item.master_price}</td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                                                        {isOverrideSet ? (
                                                            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>₹{item.current_price}</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>(Using master)</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#f8fafc' }}>
                                                        <input
                                                            className="input"
                                                            type="number"
                                                            placeholder={isOverrideSet ? `Edit: ${item.current_price}` : `Set price...`}
                                                            value={editablePrices[item.item_id] !== undefined ? editablePrices[item.item_id] : ''}
                                                            onChange={(e) => handlePriceChange(item.item_id, e.target.value)}
                                                            onPaste={(e) => handlePaste(e, index)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.5rem',
                                                                borderColor: editablePrices[item.item_id] ? 'var(--primary)' : 'var(--border-color)',
                                                                backgroundColor: editablePrices[item.item_id] ? '#f0fdf4' : 'white',
                                                                transition: 'all 0.2s',
                                                                boxShadow: 'none'
                                                            }}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        <ListIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                        <p>Select a Price List from the sidebar or create a new one.</p>
                    </div>
                )}
            </div>

            {/* Add List Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Create Price List</h2>
                            <button onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>Close</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>List Name</label>
                                <input
                                    className="input"
                                    value={addForm.name}
                                    onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                                    placeholder="e.g., Wholesale VIP"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Description (optional)</label>
                                <input
                                    className="input"
                                    value={addForm.description}
                                    onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                                    placeholder="Special rates for top tier buyers"
                                />
                            </div>

                            <button
                                onClick={handleCreateList}
                                className="btn btn-primary"
                                style={{ marginTop: '0.5rem', padding: '1rem', width: '100%', display: 'flex', justifyContent: 'center' }}
                            >
                                Create List
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
