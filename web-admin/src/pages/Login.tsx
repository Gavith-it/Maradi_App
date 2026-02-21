import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import api from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            const { user, token } = response.data;

            if (user.role === 'customer') {
                setError('Access denied. Admin only.');
                return;
            }

            login(user, token);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f3f4f6'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Maradi Admin</h1>
                    <p style={{ color: '#6b7280' }}>Sign in to your account</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0.75rem', color: '#9ca3af' }}>
                                <User size={18} />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.5rem',
                                    paddingRight: '0.75rem',
                                    paddingTop: '0.5rem',
                                    paddingBottom: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="admin@example.com"
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '0.75rem', color: '#9ca3af' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.5rem',
                                    paddingRight: '0.75rem',
                                    paddingTop: '0.5rem',
                                    paddingBottom: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem',
                                    boxSizing: 'border-box'
                                }}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};
