import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { Trash2, ShoppingCart, Clock } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface CartItem {
    cart_id: number;
    item_name: string;
    serial_number: string;
    image_url: string;
    master_price: string;
    expires_at: string;
}

export const CartScreen = () => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [timers, setTimers] = useState<{ [key: number]: string }>({});
    const { token } = useAuthStore();

    useEffect(() => {
        fetchCart();
    }, []);

    // Timer Logic
    useEffect(() => {
        const interval = setInterval(() => {
            const newTimers: { [key: number]: string } = {};

            cartItems.forEach(item => {
                const expiry = new Date(item.expires_at).getTime();
                const now = new Date().getTime();
                const diff = expiry - now;

                if (diff <= 0) {
                    newTimers[item.cart_id] = 'Expired';
                } else {
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    newTimers[item.cart_id] = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                }
            });
            setTimers(newTimers);
        }, 1000);

        return () => clearInterval(interval);
    }, [cartItems]);

    const fetchCart = async () => {
        try {
            const response = await axios.get(`${API_URL}/cart`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCartItems(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const removeItem = async (cartId: number) => {
        try {
            await axios.delete(`${API_URL}/cart/${cartId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchCart(); // Refresh
        } catch (error) {
            Alert.alert('Error', 'Failed to remove item');
        }
    };

    const renderItem = ({ item }: { item: CartItem }) => {
        const isExpired = timers[item.cart_id] === 'Expired';
        return (
            <View style={[styles.card, isExpired && { opacity: 0.6 }]}>
                <Image
                    source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
                    style={styles.image}
                />
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.item_name}</Text>
                    <Text style={styles.serial}>SN: {item.serial_number}</Text>
                    <Text style={styles.price}>₹{item.master_price}</Text>
                </View>
                <View style={styles.actionsContainer}>
                    <View style={[styles.timerWrapper, isExpired ? styles.timerExpiredWrapper : {}]}>
                        <Clock size={12} color={isExpired ? theme.colors.error : theme.colors.primaryDark} style={{ marginRight: 4 }} />
                        <Text style={[styles.timer, isExpired && styles.expired]}>
                            {timers[item.cart_id] || '...'}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.cart_id)}>
                        <Trash2 color={theme.colors.error} size={20} />
                    </TouchableOpacity>
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

    const checkout = async () => {
        try {
            const response = await axios.post(`${API_URL}/orders`, { notes: 'Mobile App Order' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert('Success', `Order Placed! ID: ${response.data.orderNumber}`, [
                {
                    text: 'OK', onPress: () => {
                        fetchCart(); // Clear cart in UI
                    }
                }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Checkout failed');
        }
    };

    const total = cartItems.reduce((sum, item) => sum + Number(item.master_price), 0);
    const hasItems = cartItems.length > 0;

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <ShoppingCart color={theme.colors.primaryDark} size={24} style={{ marginRight: 8 }} />
                <Text style={styles.headerText}>My Cart</Text>
            </View>

            <FlatList
                data={cartItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.cart_id.toString()}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <ShoppingCart size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyText}>Your cart is completely empty.</Text>
                        <Text style={styles.emptySubtext}>Browse the catalog to add items.</Text>
                    </View>
                }
            />

            <View style={styles.footer}>
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalValue}>₹{total}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.checkoutBtnWrapper, !hasItems && { opacity: 0.5 }]}
                    onPress={checkout}
                    disabled={!hasItems}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={theme.colors.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.checkoutGradient}
                    >
                        <Text style={styles.checkoutText}>Place Order</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
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
        padding: theme.spacing.md,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: 'white',
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    image: {
        height: 70,
        width: 70,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f9fafb',
        marginRight: 12,
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontWeight: '700',
        fontSize: 15,
        color: theme.colors.text,
        marginBottom: 4,
    },
    serial: {
        color: theme.colors.textLight,
        fontSize: 12,
        marginBottom: 6,
    },
    price: {
        color: theme.colors.primaryDark,
        fontWeight: '800',
        fontSize: 15,
    },
    actionsContainer: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    timerWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e8f5e9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 10,
    },
    timerExpiredWrapper: {
        backgroundColor: '#fef2f2',
    },
    timer: {
        fontWeight: 'bold',
        color: theme.colors.primaryDark,
        fontSize: 12,
    },
    expired: {
        color: theme.colors.error,
    },
    removeBtn: {
        padding: 4,
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
    footer: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: 'white',
        ...theme.shadows.large,
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    totalLabel: {
        fontSize: 16,
        color: theme.colors.textLight,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '900',
        color: theme.colors.text,
    },
    checkoutBtnWrapper: {
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    checkoutGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkoutText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
