import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Alert, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Search, Barcode, Tag } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';

export const AddStockScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { token, user } = useAuthStore();

    const [itemCode, setItemCode] = useState(route.params?.itemCode || '');
    const [serialNumber, setSerialNumber] = useState(route.params?.serialNumber || '');
    const [itemName, setItemName] = useState('');
    const [fetchingName, setFetchingName] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (route.params?.itemCode) {
            setItemCode(route.params.itemCode);
            fetchItemName(route.params.itemCode);
        }
        if (route.params?.serialNumber) setSerialNumber(route.params.serialNumber);
    }, [route.params]);

    const fetchItemName = async (code: string) => {
        if (!code) return;
        setFetchingName(true);
        try {
            const response = await axios.get(`${API_URL}/items/${code}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data && response.data.item_name) {
                setItemName(response.data.item_name);
            } else {
                setItemName('');
            }
        } catch (error) {
            setItemName('');
            // Optional: console.log('Item not found, assuming new item');
        } finally {
            setFetchingName(false);
        }
    };

    const takePhoto = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission to access camera is required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true, // We need base64 to send to backend without S3
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            // Create a data URI
            const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setImageUrl(base64Img);
        }
    };

    const handleSubmit = async () => {
        if (!itemCode || !serialNumber) {
            Alert.alert('Error', 'Item Code and Serial Number are required');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_URL}/items/stock`, {
                item_code: itemCode,
                serial_number: serialNumber,
                image_url: imageUrl || 'https://via.placeholder.com/300', // Use captured image or placeholder
                user_id: user?.id,
                // Passing the name also allows the backend to update/insert if it is brand new
                item_name: itemName || 'Unknown Item'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert('Success', 'Stock added successfully', [
                {
                    text: 'OK',
                    onPress: () => {
                        // Reset navigation stack to Home so back button doesn't rewind through scanners
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Home' }],
                        });
                    }
                }
            ]);
        } catch (error: any) {
            console.log('Add Stock Error:', error.response?.data || error.message);
            Alert.alert(
                'Error',
                error.response?.data?.message || error.message || 'Failed to add stock'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        >
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                <View style={styles.card}>
                    <Text style={styles.label}>Item Code</Text>
                    <View style={styles.inputWrapper}>
                        <Search color={theme.colors.textLight} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={itemCode}
                            onChangeText={setItemCode}
                            onBlur={() => fetchItemName(itemCode)}
                            placeholder="Enter Item Code"
                            placeholderTextColor={theme.colors.textLight}
                        />
                        <TouchableOpacity style={styles.scanButtonMini} onPress={() => navigation.navigate('ScanQR', { mode: 'add_stock', currentItemCode: itemCode, currentSerialNumber: serialNumber })}>
                            <Barcode color="white" size={16} />
                            <Text style={styles.scanButtonMiniText}>SCAN</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Item Name (Auto-fetched)</Text>
                    <View style={styles.inputWrapper}>
                        {fetchingName ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.inputIcon} />
                        ) : (
                            <Tag color={theme.colors.textLight} size={20} style={styles.inputIcon} />
                        )}
                        <TextInput
                            style={[styles.input, { color: itemName ? theme.colors.text : theme.colors.textLight }]}
                            value={itemName}
                            onChangeText={setItemName}
                            placeholder="Item name will appear here"
                            placeholderTextColor={theme.colors.textLight}
                            editable={!fetchingName}
                        />
                    </View>

                    <Text style={styles.label}>Serial Number</Text>
                    <View style={styles.inputWrapper}>
                        <Barcode color={theme.colors.textLight} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={serialNumber}
                            onChangeText={setSerialNumber}
                            placeholder="E1234..."
                            placeholderTextColor={theme.colors.textLight}
                        />
                        <TouchableOpacity style={styles.scanButtonMini} onPress={() => navigation.navigate('ScanQR', { mode: 'add_stock', currentItemCode: itemCode, currentSerialNumber: serialNumber })}>
                            <Barcode color="white" size={16} />
                            <Text style={styles.scanButtonMiniText}>SCAN</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Product Image</Text>
                    <TouchableOpacity onPress={takePhoto} style={styles.imagePlaceholder} activeOpacity={0.8}>
                        {imageUrl ? (
                            <Image source={{ uri: imageUrl }} style={styles.capturedImage} />
                        ) : (
                            <View style={styles.placeholderContent}>
                                <View style={styles.cameraIconBg}>
                                    <Camera size={32} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.placeholderText}>Tap to Capture Photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.submitButtonShadow}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={theme.colors.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.submitButton, loading && { opacity: 0.7 }]}
                    >
                        <Text style={styles.submitButtonText}>{loading ? "Saving..." : "ADD STOCK"}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        padding: theme.spacing.lg,
        flexGrow: 1,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        ...theme.shadows.soft,
    },
    label: {
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        fontSize: 15,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f9fafb',
        paddingLeft: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        overflow: 'hidden',
    },
    inputIcon: {
        marginRight: theme.spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 15,
        color: theme.colors.text,
    },
    scanButtonMini: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 14,
        justifyContent: 'center',
    },
    scanButtonMiniText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 4,
    },
    imagePlaceholder: {
        height: 220,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed'
    },
    placeholderContent: {
        alignItems: 'center',
    },
    cameraIconBg: {
        backgroundColor: theme.colors.background,
        padding: 16,
        borderRadius: theme.borderRadius.round,
        marginBottom: theme.spacing.md,
    },
    placeholderText: {
        color: theme.colors.textLight,
        fontWeight: '500',
    },
    capturedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    submitButtonShadow: {
        ...theme.shadows.medium,
        marginBottom: theme.spacing.xl,
    },
    submitButton: {
        paddingVertical: 16,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
