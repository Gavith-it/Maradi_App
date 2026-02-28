import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { theme } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ShoppingCart, Maximize2, X } from 'lucide-react-native';

interface Serial {
    serial_id: number;
    serial_number: string;
    image_url: string;
    status: string;
    item_name: string;
    master_price: string;
    master_images?: { type: string, url: string }[];
}

export const SerialSelectionScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { itemCode, itemName } = route.params;
    const [serials, setSerials] = useState<Serial[]>([]);
    const [masterImages, setMasterImages] = useState<{ type: string, url: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();

    // Image Viewer State
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImage, setViewerImage] = useState<string | null>(null);

    useEffect(() => {
        fetchSerials();
    }, [itemCode]);

    const fetchSerials = async () => {
        try {
            const response = await axios.get(`${API_URL}/items/${itemCode}/serials`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data: Serial[] = response.data;
            setSerials(data);

            if (data.length > 0 && data[0].master_images) {
                const validMasterImgs = data[0].master_images.filter(img => img && img.url);
                setMasterImages(validMasterImgs);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch serials');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (serialId: number) => {
        try {
            await axios.post(`${API_URL}/cart/add`, { serial_id: serialId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Silently refresh serials so the added item disappears from available stock
            fetchSerials();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to add to cart');
        }
    };

    const renderItem = ({ item }: { item: Serial }) => (
        <View style={styles.card}>
            <TouchableOpacity
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
                <View style={styles.expandIconContainer}>
                    <Maximize2 size={16} color="white" />
                </View>
            </TouchableOpacity>
            <View style={styles.info}>
                <Text style={styles.serial}>SN: {item.serial_number}</Text>
                <Text style={styles.price}>₹{item.master_price}</Text>
                <TouchableOpacity onPress={() => addToCart(item.serial_id)} activeOpacity={0.8} style={{ marginTop: 8 }}>
                    <LinearGradient
                        colors={theme.colors.orangeGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.cartButton}
                    >
                        <ShoppingCart size={16} color="white" style={{ marginRight: 6 }} />
                        <Text style={styles.buttonText}>Add to Cart</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderHeader = () => {
        if (masterImages.length === 0) return null;
        return (
            <View style={styles.masterGalleryContainer}>
                <Text style={styles.galleryTitle}>Model View / Master Images</Text>
                <FlatList
                    data={masterImages}
                    horizontal
                    keyExtractor={(img, idx) => img.type + idx}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.galleryList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.masterImageCard}
                            activeOpacity={0.8}
                            onPress={() => {
                                setViewerImage(item.url);
                                setViewerVisible(true);
                            }}
                        >
                            <Image source={{ uri: item.url }} style={styles.masterImage} />
                            <View style={styles.expandIconContainerSmall}>
                                <Maximize2 size={12} color="white" />
                            </View>
                            <Text style={styles.masterImageLabel}>{item.type.toUpperCase()}</Text>
                        </TouchableOpacity>
                    )}
                />
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
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>{itemName}</Text>
                <Text style={styles.subtext}>Select a specific piece to purchase</Text>
            </View>
            <FlatList
                data={serials}
                renderItem={renderItem}
                keyExtractor={(item) => item.serial_number}
                numColumns={2}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={<Text style={styles.empty}>No available stock for this item.</Text>}
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
    headerContainer: {
        padding: theme.spacing.lg,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4,
    },
    subtext: {
        fontSize: 13,
        color: theme.colors.textLight,
    },
    list: {
        padding: theme.spacing.sm,
    },
    card: {
        flex: 1,
        maxWidth: '46.5%',
        backgroundColor: 'white',
        margin: theme.spacing.sm,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        ...theme.shadows.soft,
    },
    image: {
        height: 140,
        width: '100%',
        resizeMode: 'cover',
        backgroundColor: '#f9fafb',
    },
    info: {
        padding: theme.spacing.md,
    },
    serial: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textLight,
        marginBottom: 4,
    },
    price: {
        fontSize: 16,
        color: theme.colors.primaryDark,
        fontWeight: '800',
        marginBottom: 6,
    },
    cartButton: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold'
    },
    empty: {
        textAlign: 'center',
        marginTop: 40,
        color: theme.colors.textLight,
        fontSize: 16,
    },
    masterGalleryContainer: {
        backgroundColor: 'white',
        paddingVertical: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        width: '100%'
    },
    galleryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textLight,
        paddingHorizontal: theme.spacing.sm,
        marginBottom: theme.spacing.md,
    },
    galleryList: {
        paddingHorizontal: theme.spacing.sm,
    },
    masterImageCard: {
        marginRight: theme.spacing.md,
        alignItems: 'center',
    },
    masterImage: {
        width: 140,
        height: 180,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f1f5f9',
        marginBottom: 4,
    },
    masterImageLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textLight,
    },
    expandIconContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 6,
        borderRadius: 20,
    },
    expandIconContainerSmall: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 4,
        borderRadius: 12,
    },
    viewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    viewerCloseBtn: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 16,
        borderRadius: 35,
    },
    viewerImage: {
        width: '100%',
        height: '80%',
    }
});
