import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import axios from 'axios';
import { ActionCard } from '../components/ActionCard';
import { theme } from '../styles/theme';
import { PackagePlus, QrCode, ShoppingBag, LogOut, LayoutGrid, ShoppingCart, History } from 'lucide-react-native';

export const HomeScreen = () => {
    const { user, logout, token } = useAuthStore();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [pendingCount, setPendingCount] = React.useState(0);

    React.useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (user?.role === 'internal_user' || user?.role === 'owner') {
                fetchPendingCount();
            }
        });

        if (user?.role === 'internal_user' || user?.role === 'owner') {
            fetchPendingCount();
        }

        return unsubscribe;
    }, [navigation, user]);

    const fetchPendingCount = async () => {
        try {
            const response = await axios.get(`${API_URL}/orders/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingCount(response.data.length);
        } catch (error) {
            console.error('Failed to fetch pending count', error);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* Header Section */}
                <View style={styles.header}>
                    <Image
                        source={require('../../assets/maradi logo png.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View style={styles.greetingContainer}>
                        <Text style={styles.greeting}>Good Morning,</Text>
                        <Text style={styles.username}>{user?.role === 'customer' ? 'Customer' : 'Admin'}</Text>
                        <Text style={styles.email}>{user?.email}</Text>
                    </View>
                </View>

                {/* Dashboard Action Cards */}
                <View style={styles.cardGrid}>
                    {user?.role === 'internal_user' || user?.role === 'owner' ? (
                        <>
                            <ActionCard
                                title="Add Stock"
                                subtitle="New inventory"
                                icon={<PackagePlus color="white" size={24} />}
                                colors={theme.colors.primaryGradient}
                                onPress={() => navigation.navigate('ScanQR', { mode: 'add_stock' })}
                            />
                            <ActionCard
                                title="Mark as Sold"
                                subtitle="Quick scan to retire"
                                icon={<QrCode color="white" size={24} />}
                                colors={theme.colors.blueGradient}
                                onPress={() => navigation.navigate('ScanQR', { mode: 'mark_sold' })}
                            />
                            <ActionCard
                                title="In-Stock Catalog"
                                subtitle="Browse available items"
                                icon={<LayoutGrid color="white" size={24} />}
                                colors={theme.colors.orangeGradient}
                                onPress={() => navigation.navigate('InternalCatalog')}
                            />
                            <ActionCard
                                title="Pending Orders"
                                subtitle="Review & Manage"
                                icon={<ShoppingBag color="white" size={24} />}
                                colors={theme.colors.blueGradient}
                                badgeCount={pendingCount}
                                onPress={() => navigation.navigate('PendingOrders')}
                            />
                        </>
                    ) : null}

                    {user?.role === 'customer' ? (
                        <>
                            <ActionCard
                                title="Browse Catalog"
                                subtitle="View all items"
                                icon={<LayoutGrid color="white" size={24} />}
                                colors={theme.colors.primaryGradient}
                                onPress={() => navigation.navigate('Catalog')}
                            />
                            <ActionCard
                                title="My Cart"
                                subtitle="Checkout items"
                                icon={<ShoppingCart color="white" size={24} />}
                                colors={theme.colors.orangeGradient}
                                onPress={() => navigation.navigate('Cart')}
                            />
                            {/* My Orders centered below */}
                            <View style={{ width: '100%', alignItems: 'center', marginTop: theme.spacing.sm }}>
                                <ActionCard
                                    title="My Orders"
                                    subtitle="History"
                                    icon={<History color="white" size={24} />}
                                    colors={theme.colors.blueGradient}
                                    onPress={() => navigation.navigate('OrderHistory')}
                                />
                            </View>
                        </>
                    ) : null}
                </View>

                {/* Footer Section */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                        <LogOut color={theme.colors.error} size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.logoutText}>Logout securely</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flexGrow: 1,
        padding: theme.spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl,
    },
    logo: {
        width: 140,
        height: 60,
        marginBottom: theme.spacing.md,
    },
    greetingContainer: {
        alignItems: 'center',
    },
    greeting: {
        fontSize: 16,
        color: theme.colors.textLight,
        marginBottom: 4,
    },
    username: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: theme.colors.primaryDark,
        fontWeight: '500',
    },
    cardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        flex: 1,
    },
    footer: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
        paddingBottom: theme.spacing.xl,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.surface,
        ...theme.shadows.soft,
    },
    logoutText: {
        color: theme.colors.error,
        fontWeight: '600',
        fontSize: 16,
    },
});
