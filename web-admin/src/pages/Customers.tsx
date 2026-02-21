import { useState, useEffect } from 'react';
import api from '../utils/axios';
import { Plus, Search, Loader, RefreshCw, Edit2, ShieldAlert } from 'lucide-react';

interface Customer {
    user_id: number;
    email: string;
    company_name: string | null;
    phone: string | null;
    status: string;
    price_list_id: number | null;
    price_list_name: string | null;
    created_at: string;
}

interface PriceList {
    price_list_id: number;
    name: string;
}

export const Customers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        user_id: 0,
        email: '',
        password: '', // Only for creation
        company_name: '',
        phone: '',
        status: 'active',
        price_list_id: '' as string | number
    });

    useEffect(() => {
        fetchCustomers();
        fetchPriceLists();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users/customers');
            setCustomers(response.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPriceLists = async () => {
        try {
            const response = await api.get('/price-lists');
            setPriceLists(response.data);
        } catch (error) {
            console.error('Failed to fetch price lists', error);
        }
    };

    const handleOpenCreate = () => {
        setIsEditing(false);
        setFormData({
            user_id: 0,
            email: '',
            password: '',
            company_name: '',
            phone: '',
            status: 'active',
            price_list_id: ''
        });
        setShowModal(true);
    };

    const handleOpenEdit = (c: Customer) => {
        setIsEditing(true);
        setFormData({
            user_id: c.user_id,
            email: c.email,
            password: '', // Leave blank, we don't edit password here
            company_name: c.company_name || '',
            phone: c.phone || '',
            status: c.status,
            price_list_id: c.price_list_id || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                ...formData,
                price_list_id: formData.price_list_id === '' ? null : Number(formData.price_list_id)
            };

            if (isEditing) {
                await api.put(`/users/customers/${formData.user_id}`, payload);
                alert('Customer updated successfully');
            } else {
                if (!formData.email || !formData.password) {
                    alert('Email and Password are required for a new customer.');
                    return;
                }
                await api.post('/users/customers', payload);
                alert('Customer created successfully');
            }
            setShowModal(false);
            fetchCustomers();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Operation failed');
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Customer Management</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your buyers and assign them to specific Price Lists.</p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '250px' }}>
                        <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0.75rem', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input"
                            style={{ paddingLeft: '2.25rem' }}
                        />
                    </div>
                    <button onClick={handleOpenCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={18} />
                        Add Customer
                    </button>
                    <button onClick={fetchCustomers} className="btn btn-secondary">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                {loading ? (
                    <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        <Loader size={32} className="spin" />
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <tr>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', backgroundColor: '#f8fafc' }}>Company / Email</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', backgroundColor: '#f8fafc' }}>Phone</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', backgroundColor: '#f8fafc' }}>Status</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', backgroundColor: '#f8fafc' }}>Assigned Price List</th>
                                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: '600', backgroundColor: '#f8fafc' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                                <tr key={customer.user_id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{customer.company_name || 'No Company Name'}</div>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{customer.email}</div>
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{customer.phone || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            backgroundColor: customer.status === 'active' ? '#dcfce7' : '#fee2e2',
                                            color: customer.status === 'active' ? '#166534' : '#991b1b'
                                        }}>
                                            {customer.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {customer.price_list_id ? (
                                            <span style={{ color: 'var(--primary)', fontWeight: '600', backgroundColor: '#eff6ff', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                {customer.price_list_name}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.875rem' }}>
                                                (Default Master Prices)
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleOpenEdit(customer)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '0.5rem' }}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <ShieldAlert size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                                        <p>No customers found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                {isEditing ? 'Edit Customer' : 'Add Customer'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>Close</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {!isEditing && (
                                <>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Email Domain (Login ID) *</label>
                                        <input
                                            type="email"
                                            className="input"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="customer@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Initial Password *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Secure password"
                                        />
                                    </div>
                                </>
                            )}
                            {isEditing && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Email</label>
                                    <input className="input" value={formData.email} disabled style={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Company Name</label>
                                <input
                                    className="input"
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                    placeholder="Company Ltd."
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Phone</label>
                                <input
                                    className="input"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+91..."
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Status</label>
                                <select
                                    className="input"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--primary)' }}>Assigned Price List</label>
                                <select
                                    className="input"
                                    value={formData.price_list_id}
                                    onChange={e => setFormData({ ...formData, price_list_id: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--primary)', backgroundColor: '#eff6ff' }}
                                >
                                    <option value="">-- Standard Master Prices --</option>
                                    {priceLists.map(list => (
                                        <option key={list.price_list_id} value={list.price_list_id}>
                                            {list.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleSubmit}
                                className="btn btn-primary"
                                style={{ marginTop: '0.5rem', padding: '1rem', width: '100%', display: 'flex', justifyContent: 'center' }}
                            >
                                {isEditing ? 'Save Changes' : 'Create Customer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
