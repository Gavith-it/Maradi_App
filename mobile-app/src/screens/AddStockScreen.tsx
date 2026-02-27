import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Image, Alert, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Buffer } from 'buffer';
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
    const [quantity, setQuantity] = useState('1'); // New for bulk
    const [itemName, setItemName] = useState('');
    const [itemCategory, setItemCategory] = useState(''); // New for logic
    const [fetchingName, setFetchingName] = useState(false);
    const [images, setImages] = useState<{ type: string, url: string }[]>([]); // New array
    const [loading, setLoading] = useState(false);

    // Dynamic config based on category string or item name
    const getCategoryConfig = () => {
        const cat = (itemCategory + ' ' + itemName).toLowerCase().trim();
        if (cat.includes('zari silk')) {
            return {
                type: 'serial',
                requireSerial: true,
                imageRequirements: [
                    { type: 'front', label: 'Front / Color Image' }
                ]
            };
        }
        if (cat.includes('fabric')) {
            return {
                type: 'batch',
                requireSerial: false,
                batchLabel: 'Batch Number',
                unit: 'Meters',
                imageRequirements: [{ type: 'front', label: 'Fabric Batch Image' }]
            };
        }
        if (cat.includes('other silk') || cat.includes('dothi') || cat.includes('accessories')) {
            return {
                type: 'none',
                requireSerial: false,
                unit: 'Units',
                imageRequirements: [
                    { type: 'front', label: 'Product Image' }
                ]
            };
        }

        // Default (Assume it's a Saree/Zari Silk since that's the primary product)
        return {
            type: 'serial',
            requireSerial: true,
            imageRequirements: [
                { type: 'front', label: 'Front / Color Image' }
            ]
        };
    };

    const config = getCategoryConfig();

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
            if (response.data) {
                setItemName(response.data.item_name || '');
                setItemCategory(response.data.category || 'General');
            } else {
                setItemName('');
                setItemCategory('');
            }
        } catch (error) {
            setItemName('');
            setItemCategory('');
            // Optional: console.log('Item not found, assuming new item');
        } finally {
            setFetchingName(false);
        }
    };

    const takePhoto = async (imageType: string) => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert("Permission to access camera is required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.2, // Aggressive compression (was 0.5) to stay under Vercel's 4.5MB limit
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            // Create a data URI
            const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;

            // Update the specific image type in the array
            setImages(prev => {
                const existingIndex = prev.findIndex(img => img.type === imageType);
                if (existingIndex >= 0) {
                    const newArray = [...prev];
                    newArray[existingIndex] = { type: imageType, url: base64Img };
                    return newArray;
                }
                return [...prev, { type: imageType, url: base64Img }];
            });
        }
    };

    const handleSubmit = async () => {
        if (!itemCode) {
            Alert.alert('Error', 'Item Code is required');
            return;
        }

        if (config.requireSerial && !serialNumber) {
            Alert.alert('Error', 'Serial Number is required for this product type.');
            return;
        }

        if (images.length < config.imageRequirements.length) {
            Alert.alert('Error', `Please capture all ${config.imageRequirements.length} required images for this category.`);
            return;
        }

        setLoading(true);
        try {
            // STEP 1 & 2: CONVERT BASE64 IMAGES AND UPLOAD DIRECTLY TO S3 FIRST
            const uploadedImages = [];

            for (const img of images) {
                // 1. Ask backend for an S3 Presigned URL
                const response = await axios.get(`${API_URL}/items/upload-url?extension=jpg`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const { uploadUrl, finalUrl } = response.data;

                // 2. Convert base64 dataURI to binary Blob
                const base64Data = img.url.replace(/^data:image\/\w+;base64,/, '');
                const binaryData = Buffer.from(base64Data, 'base64');

                // 3. Upload raw binary to AWS S3 using PUT Request
                await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'image/jpeg' },
                    body: binaryData
                });

                // 4. Save the finalized AWS S3 public image URL to send to our Node API in step 5
                uploadedImages.push({ type: img.type, url: finalUrl });
            }

            // STEP 3: Add stock record to the database pointing to the new S3 URL
            await axios.post(`${API_URL}/items/stock`, {
                item_code: itemCode,
                serial_number: serialNumber,
                quantity,
                image_url: uploadedImages.length > 0 ? uploadedImages[0].url : undefined, // Send single string URL
                user_id: user?.id,
                item_name: itemName || `Item ${itemCode}`,
                category: itemCategory || 'Uncategorized'
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

                    {/* Dynamic Fields based on Category config */}
                    {config.requireSerial ? (
                        <>
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
                        </>
                    ) : (
                        <>
                            {config.type === 'batch' && (
                                <>
                                    <Text style={styles.label}>{config.batchLabel}</Text>
                                    <View style={styles.inputWrapper}>
                                        <Barcode color={theme.colors.textLight} size={20} style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={serialNumber}
                                            onChangeText={setSerialNumber}
                                            placeholder="Batch Code (Optional)"
                                            placeholderTextColor={theme.colors.textLight}
                                        />
                                    </View>
                                </>
                            )}
                            <Text style={styles.label}>Quantity ({config.unit})</Text>
                            <View style={styles.inputWrapper}>
                                <Tag color={theme.colors.textLight} size={20} style={styles.inputIcon} />
                                <TextInput
                                    keyboardType='numeric'
                                    style={styles.input}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    placeholder="1"
                                    placeholderTextColor={theme.colors.textLight}
                                />
                            </View>
                        </>
                    )}
                </View>

                {/* Dynamic Image Requirements */}
                <View style={styles.card}>
                    <Text style={[styles.label, { marginBottom: 12 }]}>Required Images ({config.imageRequirements.length})</Text>

                    <View style={{ gap: theme.spacing.lg }}>
                        {config.imageRequirements.map((req, index) => {
                            const thisImg = images.find(i => i.type === req.type);
                            return (
                                <View key={req.type} style={{ width: '100%' }}>
                                    <Text style={styles.imageLabelText}>{index + 1}. {req.label}</Text>
                                    <TouchableOpacity onPress={() => takePhoto(req.type)} style={config.imageRequirements.length > 2 ? styles.imagePlaceholderSmall : styles.imagePlaceholder} activeOpacity={0.8}>
                                        {thisImg ? (
                                            <Image source={{ uri: thisImg.url }} style={styles.capturedImage} />
                                        ) : (
                                            <View style={styles.placeholderContent}>
                                                <View style={styles.cameraIconBg}>
                                                    <Camera size={24} color={theme.colors.primary} />
                                                </View>
                                                <Text style={styles.placeholderText}>Tap to Capture</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
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
        height: 200,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed'
    },
    imagePlaceholderSmall: {
        height: 140,
        backgroundColor: '#f9fafb',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed'
    },
    imageLabelText: {
        fontWeight: '600',
        color: theme.colors.textLight,
        fontSize: 13,
        marginBottom: 6,
        textTransform: 'uppercase'
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
