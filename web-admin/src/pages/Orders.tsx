import { useEffect, useState } from 'react';
import api from '../utils/axios';
import type { Order } from '../types';
import { Eye, CheckCircle, Truck, PackageCheck } from 'lucide-react';

export const Orders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, [filter]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Note: The backend endpoint /orders/pending actually returns ALL orders based on current implementation, 
            // but we filter client-side. To be more efficient we should probably fix the backend, 
            // but for now let's rely on the client-side filtering we already have.
            const response = await api.get('/orders/pending');
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderDetails = async (orderId: number) => {
        try {
            const response = await api.get(`/orders/${orderId}`);
            setSelectedOrder(response.data);
            setShowModal(true);
        } catch (error) {
            console.error('Failed to fetch order details', error);
            alert('Failed to load order details');
        }
    };

    const handleStatusUpdate = async (orderId: number, status: string) => {
        if (!confirm(`Are you sure you want to mark order #${orderId} as ${status}?`)) return;
        try {
            await api.put(`/orders/${orderId}/status`, { status });
            alert(`Order status updated to ${status}`);
            fetchOrders();
            if (selectedOrder && selectedOrder.order_id === orderId) {
                setShowModal(false);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update status');
        }
    };

    const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    if (loading) return <div>Loading orders...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Order Management</h1>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '0.375rem', borderColor: '#d1d5db' }}
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="dispatched">Dispatched</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Order ID</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Customer</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody style={{ backgroundColor: 'white' }}>
                        {filteredOrders.map((order) => (
                            <tr key={order.order_id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap' }}>
                                    <div style={{ fontWeight: '500', color: '#111827' }}>{order.order_number}</div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem' }}>
                                    <div style={{ fontWeight: '500', color: '#111827' }}>{order.company_name}</div>
                                    <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>{order.customer_email}</div>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', color: '#6b7280' }}>
                                    {new Date(order.order_date).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', color: '#111827', fontWeight: '500' }}>
                                    ₹{order.total_amount}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap' }}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        backgroundColor: order.status === 'pending' ? '#fef3c7' : order.status === 'confirmed' ? '#dbeafe' : order.status === 'dispatched' ? '#ede9fe' : '#d1fae5',
                                        color: order.status === 'pending' ? '#92400e' : order.status === 'confirmed' ? '#1e40af' : order.status === 'dispatched' ? '#5b21b6' : '#065f46'
                                    }}>
                                        {order.status.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        {order.status === 'pending' && (
                                            <button onClick={() => handleStatusUpdate(order.order_id, 'confirmed')} title="Confirm" style={{ color: '#2563eb', padding: '0.25rem', cursor: 'pointer', border: 'none', background: 'none' }}>
                                                <CheckCircle size={20} />
                                            </button>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <button onClick={() => handleStatusUpdate(order.order_id, 'dispatched')} title="Dispatch" style={{ color: '#7c3aed', padding: '0.25rem', cursor: 'pointer', border: 'none', background: 'none' }}>
                                                <Truck size={20} />
                                            </button>
                                        )}
                                        {order.status === 'dispatched' && (
                                            <button onClick={() => handleStatusUpdate(order.order_id, 'completed')} title="Complete" style={{ color: '#059669', padding: '0.25rem', cursor: 'pointer', border: 'none', background: 'none' }}>
                                                <PackageCheck size={20} />
                                            </button>
                                        )}
                                        <button onClick={() => fetchOrderDetails(order.order_id)} title="View Details" style={{ color: '#4b5563', padding: '0.25rem', cursor: 'pointer', border: 'none', background: 'none' }}>
                                            <Eye size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Order Details Modal */}
            {showModal && selectedOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Order #{selectedOrder.order_number}</h2>
                                <p style={{ color: '#6b7280' }}>{new Date(selectedOrder.order_date).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', border: 'none', cursor: 'pointer' }}>Close</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Customer Details</h3>
                                <p><strong>Name:</strong> {selectedOrder.company_name}</p>
                                <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                                <p><strong>Phone:</strong> {selectedOrder.phone}</p>
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Order Info</h3>
                                <p><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{selectedOrder.status.toUpperCase()}</span></p>
                                <p><strong>Total Amount:</strong> ₹{selectedOrder.total_amount}</p>
                                <p><strong>Payment Status:</strong> {selectedOrder.payment_status || 'Pending'}</p>
                            </div>
                        </div>

                        <h3 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Order Items</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                                    <th style={{ padding: '0.5rem' }}>Item</th>
                                    <th style={{ padding: '0.5rem' }}>Code</th>
                                    <th style={{ padding: '0.5rem' }}>Serial</th>
                                    <th style={{ padding: '0.5rem' }}>Price</th>
                                    <th style={{ padding: '0.5rem' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrder.items?.map((item: any) => (
                                    <tr key={item.order_item_id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {item.image_url && <img src={item.image_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />}
                                                <span>{item.item_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.5rem' }}>{item.item_code}</td>
                                        <td style={{ padding: '0.5rem' }}>{item.serial_number}</td>
                                        <td style={{ padding: '0.5rem' }}>₹{item.price}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                            <span style={{
                                                color: item.status === 'rejected' ? 'red' : 'green',
                                                fontWeight: 'bold',
                                                fontSize: '0.85rem'
                                            }}>
                                                {item.status?.toUpperCase() || 'CONFIRMED'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            {selectedOrder.status === 'pending' && (
                                <button
                                    onClick={() => handleStatusUpdate(selectedOrder.order_id, 'confirmed')}
                                    style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Confirm Order
                                </button>
                            )}
                            {selectedOrder.status === 'confirmed' && (
                                <button
                                    onClick={() => handleStatusUpdate(selectedOrder.order_id, 'dispatched')}
                                    style={{ padding: '0.75rem 1.5rem', backgroundColor: '#7c3aed', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Mark Dispatched
                                </button>
                            )}
                            {selectedOrder.status === 'dispatched' && (
                                <button
                                    onClick={() => handleStatusUpdate(selectedOrder.order_id, 'completed')}
                                    style={{ padding: '0.75rem 1.5rem', backgroundColor: '#059669', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Mark Completed
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
