import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { theme } from '../styles/theme';
import { PackageSearch, ChevronRight, ArrowLeft } from 'lucide-react-native';

interface Item {
    item_id: number;
    item_code: string;
    item_name: string;
    master_price: string;
    stock_quantity: number;
    image_url?: string;
}

export const InternalCatalogScreen = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { token } = useAuthStore();

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchItems();
        });
        fetchItems();
        return unsubscribe;
    }, [navigation]);

    const fetchItems = async () => {
        try {
            const response = await axios.get(`${API_URL}/items/in-stock`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setItems(response.data);
        } catch (error) {
            console.error('Failed to fetch in-stock items', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('InternalItemDetail', { itemCode: item.item_code, itemName: item.item_name })}
            activeOpacity={0.9}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
                    style={styles.image}
                />
                <View style={styles.stockBadge}>
                    <Text style={styles.stockText}>{item.stock_quantity} in stock</Text>
                </View>
            </View>
            <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>{item.item_name}</Text>
                <Text style={styles.code}>{item.item_code}</Text>
                <View style={styles.footerRow}>
                    <Text style={styles.price}>₹{item.master_price}</Text>
                    <View style={styles.chevronWrapper}>
                        <ChevronRight size={16} color={theme.colors.primaryDark} />
                    </View>
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={theme.colors.text} size={24} />
                </TouchableOpacity>
                <PackageSearch color={theme.colors.primaryDark} size={24} style={{ marginRight: 8 }} />
                <Text style={styles.headerText}>In-Stock Inventory</Text>
            </View>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.item_code}
                numColumns={2}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 100 }}>
                        <Text style={{ color: theme.colors.textLight }}>No items currently in stock.</Text>
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
    backButton: {
        marginRight: theme.spacing.md,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    list: {
        padding: theme.spacing.sm,
    },
    card: {
        flex: 1,
        backgroundColor: 'white',
        margin: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.soft,
    },
    imageContainer: {
        width: '100%',
        height: 140,
        backgroundColor: '#f9fafb',
        position: 'relative',
    },
    image: {
        height: '100%',
        width: '100%',
        resizeMode: 'cover',
    },
    stockBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#10b981',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    stockText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    info: {
        padding: theme.spacing.md,
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
        minHeight: 40,
    },
    code: {
        fontSize: 11,
        color: theme.colors.textLight,
        marginBottom: 10,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    price: {
        fontSize: 16,
        color: theme.colors.primaryDark,
        fontWeight: '800',
    },
    chevronWrapper: {
        backgroundColor: '#e8f5e9',
        borderRadius: 12,
        padding: 4,
    }
});
