import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import { ShoppingBag, ChevronRight, User, Hash } from 'lucide-react-native';

interface Order {
    order_id: number;
    order_number: string;
    order_date: string;
    status: string;
    total_amount: string;
    item_count: string;
    customer_email: string;
    company_name: string;
}

export const PendingOrdersScreen = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    useEffect(() => {
        fetchPendingOrders();
    }, []);

    const fetchPendingOrders = async () => {
        try {
            const response = await axios.get(`${API_URL}/orders/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(response.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch pending orders');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Order }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.order_id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.orderNumberBadge}>
                    <Hash size={14} color={theme.colors.primaryDark} />
                    <Text style={styles.orderNumber}>{item.order_number}</Text>
                </View>
                <Text style={styles.date}>{new Date(item.order_date).toLocaleDateString()}</Text>
            </View>

            <View style={styles.customerInfo}>
                <User size={16} color={theme.colors.textLight} style={{ marginRight: 6 }} />
                <Text style={styles.customerText} numberOfLines={1}>
                    {item.company_name || 'No Company'}
                </Text>
            </View>
            <Text style={styles.emailText}>{item.customer_email}</Text>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
                <View style={styles.stats}>
                    <Text style={styles.infoLabel}>Items</Text>
                    <Text style={styles.infoValue}>{item.item_count}</Text>
                </View>
                <View style={[styles.stats, { alignItems: 'flex-end' }]}>
                    <Text style={styles.infoLabel}>Total Amount</Text>
                    <Text style={styles.totalValue}>₹{item.total_amount}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.headerTitleContainer}>
                    <ShoppingBag color={theme.colors.primaryDark} size={28} />
                    <Text style={styles.headerTitle}>Pending Orders</Text>
                </View>

                <FlatList
                    data={orders}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.order_id.toString()}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <ShoppingBag color={theme.colors.textLight} size={48} opacity={0.5} />
                            <Text style={styles.emptyText}>No pending orders to review.</Text>
                        </View>
                    }
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginLeft: theme.spacing.sm,
    },
    list: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        ...theme.shadows.soft,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    orderNumberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    orderNumber: {
        fontWeight: '700',
        fontSize: 14,
        color: theme.colors.primaryDark,
        marginLeft: 4,
    },
    date: {
        color: theme.colors.textLight,
        fontSize: 12,
        fontWeight: '500',
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    customerText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
    },
    emailText: {
        fontSize: 13,
        color: theme.colors.textLight,
        marginLeft: 22, // Align with text after icon
        marginBottom: theme.spacing.sm,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.sm,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stats: {
        justifyContent: 'center',
    },
    infoLabel: {
        fontSize: 11,
        color: theme.colors.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.primaryDark,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: theme.spacing.md,
        color: theme.colors.textLight,
        fontSize: 16,
    }
});
