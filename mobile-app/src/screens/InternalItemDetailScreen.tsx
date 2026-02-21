import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { theme } from '../styles/theme';
import { ArrowLeft, Box } from 'lucide-react-native';

type InternalItemDetailRouteProp = RouteProp<RootStackParamList, 'InternalItemDetail'>;

interface Serial {
    serial_id: number;
    serial_number: string;
    image_url?: string;
    date_added: string;
}

export const InternalItemDetailScreen = () => {
    const route = useRoute<InternalItemDetailRouteProp>();
    const navigation = useNavigation();
    const { itemCode, itemName } = route.params;
    const { token } = useAuthStore();

    const [serials, setSerials] = useState<Serial[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAvailableSerials();
    }, []);

    const fetchAvailableSerials = async () => {
        try {
            // Note: reusing the customer serials endpoint because it returns exactly what we need
            // (Only serials with status = 'available' for a specific item code)
            const response = await axios.get(`${API_URL}/items/${itemCode}/serials`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSerials(response.data);
        } catch (error) {
            console.error('Failed to fetch serials', error);
        } finally {
            setLoading(false);
        }
    };

    const renderSerialItem = ({ item }: { item: Serial }) => (
        <View style={styles.serialCard}>
            {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.serialImage} />
            ) : (
                <View style={styles.placeholderImage}>
                    <Text style={{ color: theme.colors.textLight, fontSize: 10 }}>No Img</Text>
                </View>
            )}
            <View style={styles.serialInfo}>
                <Text style={styles.serialNumber}>{item.serial_number}</Text>
                <Text style={styles.serialDate}>Added: {new Date(item.date_added).toLocaleDateString()}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft color={theme.colors.text} size={24} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{itemName}</Text>
                    <Text style={styles.headerCode}>{itemCode}</Text>
                </View>
            </View>

            <View style={styles.summaryContainer}>
                <Box color={theme.colors.primary} size={20} style={{ marginRight: 8 }} />
                <Text style={styles.summaryText}>Total Available Stock: <Text style={{ fontWeight: 'bold' }}>{serials.length}</Text></Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={serials}
                    renderItem={renderSerialItem}
                    keyExtractor={(item) => item.serial_number}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No stock available for this item.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backButton: {
        marginRight: theme.spacing.md,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    headerCode: {
        fontSize: 12,
        color: theme.colors.textLight,
        fontFamily: 'monospace',
    },
    summaryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0f2fe',
        padding: theme.spacing.md,
        margin: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: '#bae6fd',
    },
    summaryText: {
        fontSize: 15,
        color: '#0369a1',
    },
    list: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xl,
    },
    serialCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.sm,
        alignItems: 'center',
        ...theme.shadows.soft,
    },
    serialImage: {
        width: 50,
        height: 50,
        borderRadius: theme.borderRadius.sm,
        marginRight: theme.spacing.md,
        backgroundColor: '#f1f5f9',
    },
    placeholderImage: {
        width: 50,
        height: 50,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: '#f1f5f9',
        marginRight: theme.spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serialInfo: {
        flex: 1,
    },
    serialNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: 'monospace',
    },
    serialDate: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginTop: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textLight,
        fontSize: 16,
    }
});
