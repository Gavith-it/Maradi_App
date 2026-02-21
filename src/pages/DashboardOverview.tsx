import { useEffect, useState } from 'react';
import api from '../utils/axios';
import type { Order } from '../types';
import { Users, ShoppingBag, Clock, DollarSign } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

export const DashboardOverview = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // In a real app, we'd have a dashboard/stats endpoint.
            // For MVP, we fetch all pending orders to calculate some stats, 
            // but we might need a general 'all orders' endpoint for history.
            // Currently getAllOrders fetches *pending* orders only (my bad naming in backend controller, it was specifically for pending).
            // Let's use it for now, or improved backend later.
            // Wait, getAllOrders in backend:
            // "SELECT ... WHERE o.status = 'pending'" <- This is specific to pending.
            // I should probably have a true "getAllOrders" that accepts status filter.

            // For now, let's just show pending stats.
            const response = await api.get('/orders/pending');
            setOrders(response.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        {
            label: 'Pending Orders',
            value: orders.length,
            icon: Clock,
            color: '#f59e0b',
            bgColor: '#fef3c7'
        },
        {
            label: 'Total Revenue (Pending)',
            value: `₹${orders.reduce((sum, order) => sum + Number(order.total_amount), 0).toLocaleString()}`,
            icon: DollarSign,
            color: '#10b981',
            bgColor: '#d1fae5'
        },
        // Mocking others for MVP visualization
        {
            label: 'Total Customers',
            value: '12', // Mock
            icon: Users,
            color: '#3b82f6',
            bgColor: '#dbeafe'
        },
        {
            label: 'Low Stock Items',
            value: '5', // Mock
            icon: ShoppingBag,
            color: '#ef4444',
            bgColor: '#fee2e2'
        }
    ];

    // Mock chart data
    const chartData = [
        { name: 'Mon', orders: 4 },
        { name: 'Tue', orders: 3 },
        { name: 'Wed', orders: 2 },
        { name: 'Thu', orders: 7 },
        { name: 'Fri', orders: 5 },
        { name: 'Sat', orders: 8 },
        { name: 'Sun', orders: 6 },
    ];

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div>;
    }

    return (
        <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem', color: '#111827' }}>Dashboard Overview</h1>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {stats.map((stat, index) => (
                    <div key={index} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center' }}>
                        <div style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: stat.bgColor, marginRight: '1rem' }}>
                            <stat.icon size={24} color={stat.color} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>{stat.label}</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', color: '#374151' }}>Weekly Orders</h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem', color: '#374151' }}>Revenue Trend</h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
