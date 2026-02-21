import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { LayoutDashboard, ShoppingCart, Package, Users, LogOut, Menu, List } from 'lucide-react';
import { useState } from 'react';

export const DashboardLayout = () => {
    const { isAuthenticated, logout, user } = useAuthStore();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Overview', path: '/' },
        { icon: ShoppingCart, label: 'Orders', path: '/orders' },
        { icon: Package, label: 'Inventory', path: '/inventory' },
        { icon: Users, label: 'Customers', path: '/customers' },
        { icon: List, label: 'Price Lists', path: '/price-lists' },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-body)' }}>
            {/* Sidebar */}
            <aside style={{
                width: sidebarOpen ? '260px' : '80px',
                backgroundColor: 'var(--bg-sidebar)',
                color: 'var(--text-inverse)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 10
            }}>
                <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center' }}>
                    {sidebarOpen && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '8px' }}></div>
                            <span style={{ fontWeight: '800', fontSize: '1.5rem', letterSpacing: '-0.025em' }}>Maradi</span>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Menu size={20} />
                    </button>
                </div>

                <nav style={{ flex: 1, padding: '1rem' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                                textDecoration: 'none',
                                marginBottom: '0.5rem',
                                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                                transition: 'all 0.2s',
                                fontWeight: isActive ? '600' : '400'
                            })}
                        >
                            <item.icon size={22} />
                            {sidebarOpen && <span style={{ marginLeft: '1rem', fontSize: '1rem' }}>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(to right, #4f46e5, #06b6d4)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.125rem', fontWeight: 'bold' }}>
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        {sidebarOpen && (
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Admin</p>
                            </div>
                        )}
                        {sidebarOpen && (
                            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: '0.25rem' }}>
                                <LogOut size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, overflow: 'auto', padding: '2rem 3rem' }}>
                <Outlet />
            </main>
        </div>
    );
};
