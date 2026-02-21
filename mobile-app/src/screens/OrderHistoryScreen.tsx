import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { theme } from '../styles/theme';
import { History, Hash, Calendar, Box, CheckCircle, Package } from 'lucide-react-native';

interface Order {
    order_id: number;
    order_number: string;
    order_date: string;
    status: string;
    total_amount: string;
    item_count: string;
}

export const OrderHistoryScreen = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const response = await axios.get(`${API_URL}/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Order }) => {

        let statusColor = '#6b7280'; // gray
        let statusBg = '#f3f4f6';
        let StatusIcon = Package;

        if (item.status === 'completed') {
            statusColor = '#059669'; // green
            statusBg = '#d1fae5';
            StatusIcon = CheckCircle;
        } else if (item.status === 'dispatched') {
            statusColor = '#2563eb'; // blue
            statusBg = '#dbeafe';
        } else if (item.status === 'pending') {
            statusColor = '#d97706'; // orange
            statusBg = '#fef3c7';
        }

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.orderNumberRow}>
                        <Hash size={16} color={theme.colors.textLight} />
                        <Text style={styles.orderNumber}>{item.order_number}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <StatusIcon size={12} color={statusColor} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <Calendar size={14} color={theme.colors.textLight} style={styles.detailIcon} />
                        <Text style={styles.detailText}>{new Date(item.order_date).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Box size={14} color={theme.colors.textLight} style={styles.detailIcon} />
                        <Text style={styles.detailText}>{item.item_count} Items</Text>
                    </View>
                </View>

                <View style={styles.footerRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>₹{item.total_amount}</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <History color={theme.colors.primaryDark} size={24} style={{ marginRight: 8 }} />
                <Text style={styles.headerText}>Order History</Text>
            </View>
            <FlatList
                data={orders}
                renderItem={renderItem}
                keyExtractor={(item) => item.order_id.toString()}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <History size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyText}>No past orders found.</Text>
                        <Text style={styles.emptySubtext}>When you place orders, they will appear here.</Text>
                    </View>
                }
            />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    list: {
        padding: theme.spacing.lg,
    },
    card: {
        backgroundColor: 'white',
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.medium,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    orderNumberRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderNumber: {
        fontWeight: 'bold',
        fontSize: 16,
        color: theme.colors.text,
        marginLeft: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.round,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: theme.spacing.md,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: theme.spacing.lg,
    },
    detailIcon: {
        marginRight: 6,
    },
    detailText: {
        color: theme.colors.textLight,
        fontSize: 13,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
    },
    totalLabel: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: '900',
        color: theme.colors.primaryDark,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.textLight,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: theme.colors.textLight,
    },
});
