import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { theme } from '../styles/theme';
import { PackageSearch, ChevronRight, X } from 'lucide-react-native';

interface Item {
    item_id: number;
    item_code: string;
    item_name: string;
    master_price: string;
    image_url?: string;
}

export const CatalogScreen = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // Image Viewer State
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImage, setViewerImage] = useState<string | null>(null);

    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { token } = useAuthStore();

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await axios.get(`${API_URL}/items/in-stock`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setItems(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SerialSelection', { itemCode: item.item_code, itemName: item.item_name })}
            activeOpacity={0.9}
        >
            <TouchableOpacity
                style={styles.imageContainer}
                activeOpacity={0.8}
                onPress={() => {
                    if (item.image_url) {
                        setViewerImage(item.image_url);
                        setViewerVisible(true);
                    }
                }}
            >
                <Image
                    source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
                    style={styles.image}
                />
            </TouchableOpacity>
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
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <PackageSearch color={theme.colors.primaryDark} size={24} style={{ marginRight: 8 }} />
                <Text style={styles.headerText}>Product Catalog</Text>
            </View>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.item_code}
                numColumns={2}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />

            {/* Full Screen Image Viewer Modal */}
            <Modal visible={viewerVisible} transparent={true} animationType="fade">
                <View style={styles.viewerContainer}>
                    <TouchableOpacity style={styles.viewerCloseBtn} onPress={() => setViewerVisible(false)}>
                        <X size={28} color="white" />
                    </TouchableOpacity>
                    {viewerImage && (
                        <Image source={{ uri: viewerImage }} style={styles.viewerImage} resizeMode="contain" />
                    )}
                </View>
            </Modal>
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
        padding: theme.spacing.sm,
    },
    card: {
        flex: 1,
        maxWidth: '46.5%', // Prevents odd items from expanding full width
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
    },
    image: {
        height: '100%',
        width: '100%',
        resizeMode: 'cover',
    },
    info: {
        padding: theme.spacing.md,
    },
    name: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
        minHeight: 40, // Keeps cards aligned even if text wraps
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
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerCloseBtn: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    viewerImage: {
        width: '100%',
        height: '80%',
    }
});
