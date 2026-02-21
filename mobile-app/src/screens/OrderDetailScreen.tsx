import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, User, MapPin, Package, CheckCircle, Truck, Trash2, Hash } from 'lucide-react-native';

type OrderDetailRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;

interface OrderItem {
    order_item_id: number;
    item_name: string;
    item_code: string;
    serial_number: string;
    image_url: string;
    price: string;
    status: 'confirmed' | 'replaced' | 'rejected';
}

interface OrderDetail {
    order_id: number;
    order_number: string;
    order_date: string;
    status: string;
    total_amount: string;
    company_name: string;
    customer_email: string;
    phone: string;
    notes: string;
    items: OrderItem[];
}

export const OrderDetailScreen = () => {
    const route = useRoute<OrderDetailRouteProp>();
    const navigation = useNavigation();
    const { orderId } = route.params;
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const { token, user } = useAuthStore();

    useEffect(() => {
        fetchOrderDetails();
    }, []);

    const fetchOrderDetails = async () => {
        try {
            const response = await axios.get(`${API_URL}/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrder(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch order details');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        try {
            await axios.put(`${API_URL}/orders/${orderId}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Success', `Order marked as ${newStatus}`, [
                { text: 'OK', onPress: fetchOrderDetails }
            ]);
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const removeItem = async (itemId: number) => {
        try {
            await axios.put(`${API_URL}/orders/items/${itemId}/status`, { status: 'rejected' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Success', 'Item removed from order', [
                { text: 'OK', onPress: fetchOrderDetails }
            ]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to remove item');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!order) return <View style={styles.container}><Text>Order not found</Text></View>;

    const renderStatusBadge = (status: string) => {
        let bgColor = '#e0e0e0';
        let textColor = '#666';
        if (status === 'pending') { bgColor = '#fff3cd'; textColor = '#856404'; }
        if (status === 'confirmed') { bgColor = '#cce5ff'; textColor = '#004085'; }
        if (status === 'dispatched') { bgColor = '#d4edda'; textColor = '#155724'; }

        return (
            <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
                <Text style={[styles.statusText, { color: textColor }]}>{status.toUpperCase()}</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

                {/* Header Section */}
                <View style={styles.card}>
                    <View style={styles.rowBetween}>
                        <View style={styles.row}>
                            <Hash size={18} color={theme.colors.primaryDark} />
                            <Text style={styles.header}>Order #{order.order_number}</Text>
                        </View>
                        {renderStatusBadge(order.status)}
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.rowBetween}>
                        <Text style={styles.detailLabel}>Date Added</Text>
                        <Text style={styles.detailValue}>{new Date(order.order_date).toLocaleString()}</Text>
                    </View>
                </View>

                {/* Customer Section */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <User size={18} color={theme.colors.text} style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Customer Details</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Company</Text>
                        <Text style={styles.infoValue}>{order.company_name || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Email</Text>
                        <Text style={styles.infoValue}>{order.customer_email}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>{order.phone || 'N/A'}</Text>
                    </View>
                    {order.notes ? (
                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.infoLabel}>Notes</Text>
                            <Text style={[styles.infoValue, { fontStyle: 'italic' }]}>{order.notes}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Items Section */}
                <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                        <Package size={18} color={theme.colors.text} style={styles.sectionIcon} />
                        <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
                    </View>
                    <View style={styles.divider} />

                    {order.items.map((item, index) => (
                        <View key={item.order_item_id}>
                            <View style={[styles.itemCard, item.status === 'rejected' && { opacity: 0.5 }]}>
                                <Image source={{ uri: item.image_url || 'https://via.placeholder.com/60' }} style={styles.image} />
                                <View style={{ flex: 1, paddingLeft: 12 }}>
                                    <Text style={styles.itemName} numberOfLines={1}>{item.item_name}</Text>
                                    <Text style={styles.itemSerial}>SN: {item.serial_number}</Text>

                                    <View style={styles.itemFooterRow}>
                                        <Text style={[styles.itemPrice, item.status === 'rejected' && { textDecorationLine: 'line-through' }]}>
                                            ₹{item.price}
                                        </Text>

                                        {item.status !== 'confirmed' && (
                                            <View style={[styles.miniBadge, item.status === 'rejected' ? { backgroundColor: '#f5f5f5' } : { backgroundColor: '#ffebee' }]}>
                                                <Text style={{ fontSize: 10, color: item.status === 'rejected' ? '#757575' : '#d32f2f', fontWeight: 'bold' }}>
                                                    {item.status === 'rejected' ? 'REMOVED' : item.status.toUpperCase()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Remove Action */}
                                {(user?.role === 'internal_user' || user?.role === 'owner') && item.status !== 'rejected' && order.status === 'pending' && (
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => Alert.alert('Confirm Remove', 'Are you sure? This will remove the item from the order, deduct the price from the total, and release stock.', [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.order_item_id) }
                                        ])}
                                    >
                                        <Trash2 size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            {index < order.items.length - 1 && <View style={styles.itemDivider} />}
                        </View>
                    ))}

                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalAmount}>₹{order.total_amount}</Text>
                    </View>
                </View>

                {/* Actions for Internal Users */}
                {(user?.role === 'internal_user' || user?.role === 'owner') && (
                    <View style={styles.actionsContainer}>
                        {order.status === 'pending' && (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => updateStatus('confirmed')}>
                                <LinearGradient colors={theme.colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGradientBtn}>
                                    <CheckCircle size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.actionBtnText}>Confirm Order</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                        {order.status === 'confirmed' && (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => updateStatus('dispatched')}>
                                <LinearGradient colors={theme.colors.blueGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGradientBtn}>
                                    <Truck size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.actionBtnText}>Dispatch Order</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                        {order.status === 'dispatched' && (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => updateStatus('completed')}>
                                <LinearGradient colors={theme.colors.orangeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.actionGradientBtn}>
                                    <CheckCircle size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.actionBtnText}>Mark Completed</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        padding: theme.spacing.lg,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.soft,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginLeft: 6,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.md,
    },
    detailLabel: {
        fontSize: 13,
        color: theme.colors.textLight,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionIcon: {
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb',
    },
    infoLabel: {
        fontSize: 14,
        color: theme.colors.textLight,
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        flex: 2,
        textAlign: 'right',
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
    },
    itemDivider: {
        height: 1,
        backgroundColor: '#f0fdf4', // very light green
        marginVertical: theme.spacing.sm,
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f9fafb',
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
    },
    itemSerial: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 6,
    },
    itemFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itemPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: theme.colors.primaryDark,
    },
    miniBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    removeButton: {
        padding: 10,
        backgroundColor: '#fef2f2',
        borderRadius: theme.borderRadius.round,
        marginLeft: 10,
    },
    totalContainer: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        color: theme.colors.textLight,
        fontWeight: '600',
    },
    totalAmount: {
        fontSize: 22,
        fontWeight: '800',
        color: theme.colors.primaryDark,
    },
    actionsContainer: {
        marginBottom: theme.spacing.xl,
    },
    actionGradientBtn: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.medium,
    },
    actionBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
