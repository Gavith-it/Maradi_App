import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, Modal, Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';
import { theme } from '../styles/theme';
import { ArrowLeft, Box, Camera, Edit3, X, Maximize2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Buffer } from 'buffer';

type InternalItemDetailRouteProp = RouteProp<RootStackParamList, 'InternalItemDetail'>;

interface Serial {
    serial_id: number;
    serial_number: string;
    image_url?: string;
    date_added: string;
    master_images?: { type: string, url: string }[];
}

export const InternalItemDetailScreen = () => {
    const route = useRoute<InternalItemDetailRouteProp>();
    const navigation = useNavigation();
    const { itemCode, itemName } = route.params;
    const { token } = useAuthStore();

    const [serials, setSerials] = useState<Serial[]>([]);
    const [masterImages, setMasterImages] = useState<{ type: string, url: string }[]>([]);
    const [loading, setLoading] = useState(true);

    // Master Image Edit State
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [editImages, setEditImages] = useState<{ type: string, url: string }[]>([]);
    const [uploading, setUploading] = useState(false);

    // Image Viewer View State
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerImage, setViewerImage] = useState<string | null>(null);

    // Serial Edit State
    const [serialEditModalVisible, setSerialEditModalVisible] = useState(false);
    const [editingSerial, setEditingSerial] = useState<Serial | null>(null);
    const [editSerialNumber, setEditSerialNumber] = useState('');
    const [editSerialImage, setEditSerialImage] = useState<string | null>(null);
    const [savingSerial, setSavingSerial] = useState(false);

    useEffect(() => {
        fetchAvailableSerials();
    }, []);

    const fetchAvailableSerials = async () => {
        try {
            const response = await axios.get(`${API_URL}/items/${itemCode}/serials`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data: Serial[] = response.data;
            setSerials(data);

            if (data.length > 0 && data[0].master_images) {
                const validMasterImgs = data[0].master_images.filter(img => img && img.url);
                setMasterImages(validMasterImgs);
                setEditImages(validMasterImgs); // Pre-fill edit modal
            }
        } catch (error) {
            console.error('Failed to fetch serials', error);
        } finally {
            setLoading(false);
        }
    };

    const takeMasterPhoto = async (imageType: 'border' | 'pallu' | 'body') => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission to access camera is required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.2, // Compressed for fast upload
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
            setEditImages(prev => {
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

    const handleMasterImagesSubmit = async () => {
        if (editImages.length === 0) {
            Alert.alert("Notice", "Please add at least one image.");
            return;
        }

        setUploading(true);
        try {
            const uploadedImages = [];

            for (const img of editImages) {
                // If it's already an AWS URL from old data, just pass it through
                if (img.url.startsWith('http')) {
                    uploadedImages.push(img);
                    continue;
                }

                // Otherwise, upload new base64 image to S3
                const response = await axios.get(`${API_URL}/items/upload-url?extension=jpg`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const { uploadUrl, finalUrl } = response.data;

                const base64Data = img.url.replace(/^data:image\/\w+;base64,/, '');
                const binaryData = Buffer.from(base64Data, 'base64');

                await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'image/jpeg' },
                    body: binaryData
                });

                uploadedImages.push({ type: img.type, url: finalUrl });
            }

            // Save the finalized AWS S3 public image URLs to Node API
            await axios.post(`${API_URL}/items/${itemCode}/master-images`, {
                images: uploadedImages
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert('Success', 'Item Master Images updated successfully');
            setEditModalVisible(false);
            fetchAvailableSerials(); // Refresh the gallery
        } catch (error: any) {
            console.error('Update Images Error:', error.message);
            Alert.alert('Error', 'Failed to update master images');
            Alert.alert('Error', 'Failed to update master images');
        } finally {
            setUploading(false);
        }
    };

    const handleSerialPhotoCapture = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission required!");
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.2, // Compressed for fast upload
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setEditSerialImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleSaveSerialEdit = async () => {
        if (!editingSerial || !editSerialNumber.trim()) {
            Alert.alert("Validation Error", "Serial number is required.");
            return;
        }

        setSavingSerial(true);
        try {
            let finalImageUrl = editSerialImage;

            // If it's a new photo (base64 string), we upload it first
            if (editSerialImage && editSerialImage.startsWith('data:image')) {
                const response = await axios.get(`${API_URL}/items/upload-url?extension=jpg`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const { uploadUrl, finalUrl } = response.data;
                const base64Data = editSerialImage.replace(/^data:image\/\w+;base64,/, '');
                const binaryData = Buffer.from(base64Data, 'base64');

                await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'image/jpeg' },
                    body: binaryData
                });
                finalImageUrl = finalUrl;
            }

            // Update on the backend
            await axios.put(`${API_URL}/items/serial/${editingSerial.serial_id}`, {
                serial_number: editSerialNumber,
                image_url: finalImageUrl
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert("Success", "Serial updated successfully.");
            setSerialEditModalVisible(false);
            fetchAvailableSerials(); // Refresh the list
        } catch (error: any) {
            console.error('Save Serial Error:', error.message);
            Alert.alert("Error", error.response?.data?.message || "Failed to save serial.");
        } finally {
            setSavingSerial(false);
        }
    };

    const renderSerialItem = ({ item }: { item: Serial }) => (
        <View style={styles.serialCard}>
            <TouchableOpacity onPress={() => {
                if (item.image_url) {
                    setViewerImage(item.image_url);
                    setViewerVisible(true);
                }
            }}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.serialImage} />
                ) : (
                    <View style={styles.placeholderImage}>
                        <Text style={{ color: theme.colors.textLight, fontSize: 10 }}>No Img</Text>
                    </View>
                )}
            </TouchableOpacity>
            <View style={styles.serialInfo}>
                <Text style={styles.serialNumber}>{item.serial_number}</Text>
                <Text style={styles.serialDate}>Added: {new Date(item.date_added).toLocaleDateString()}</Text>
            </View>
            <TouchableOpacity
                onPress={() => {
                    setEditingSerial(item);
                    setEditSerialNumber(item.serial_number);
                    setEditSerialImage(item.image_url || null);
                    setSerialEditModalVisible(true);
                }}
                style={styles.editSerialBtn}
            >
                <Edit3 size={18} color={theme.colors.primary} />
            </TouchableOpacity>
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

            <View style={{ paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md }}>
                <TouchableOpacity
                    style={styles.editImagesBtn}
                    onPress={() => {
                        setEditImages(masterImages.length > 0 ? [...masterImages] : []);
                        setEditModalVisible(true);
                    }}
                >
                    <Edit3 size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.editImagesText}>Add / Edit Master Images</Text>
                </TouchableOpacity>
            </View>

            {masterImages.length > 0 && (
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
                                <View style={styles.expandIconContainer}>
                                    <Maximize2 size={12} color="white" />
                                </View>
                                <Text style={styles.masterImageLabel}>{item.type.toUpperCase()}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}

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

            {/* Edit Master Images Modal */}
            <Modal visible={isEditModalVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Master Images</Text>
                        <TouchableOpacity onPress={() => setEditModalVisible(false)} disabled={uploading}>
                            <X size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.modalSubtitle}>
                            Update the global design photos for {itemName} ({itemCode}). These will apply to all future serials.
                        </Text>

                        {(['border', 'pallu', 'body'] as const).map((type) => {
                            const currentImg = editImages.find(i => i.type === type);
                            return (
                                <View key={type} style={styles.captureBlock}>
                                    <Text style={styles.captureLabel}>{type.toUpperCase()}</Text>
                                    <TouchableOpacity
                                        style={styles.captureBox}
                                        onPress={() => takeMasterPhoto(type)}
                                        activeOpacity={0.8}
                                        disabled={uploading}
                                    >
                                        {currentImg ? (
                                            <Image source={{ uri: currentImg.url }} style={styles.captureImg} />
                                        ) : (
                                            <View style={styles.captureEmpty}>
                                                <Camera size={24} color={theme.colors.primary} style={{ marginBottom: 4 }} />
                                                <Text style={styles.captureEmptyText}>Tap to Capture</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        <TouchableOpacity
                            style={[styles.saveBtn, uploading && styles.saveBtnDisabled]}
                            onPress={handleMasterImagesSubmit}
                            disabled={uploading}
                        >
                            <Text style={styles.saveBtnText}>{uploading ? "Uploading to Cloud..." : "Save Master Images"}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Serial Edit Modal */}
            <Modal visible={serialEditModalVisible} animationType="slide" presentationStyle="pageSheet">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Serial</Text>
                        <TouchableOpacity onPress={() => setSerialEditModalVisible(false)} disabled={savingSerial}>
                            <X size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <View style={{ marginBottom: theme.spacing.lg }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: theme.spacing.sm, color: theme.colors.text }}>Serial Image</Text>
                            <TouchableOpacity style={styles.captureBox} onPress={handleSerialPhotoCapture} disabled={savingSerial}>
                                {editSerialImage ? (
                                    <Image source={{ uri: editSerialImage }} style={styles.captureImg} />
                                ) : (
                                    <View style={styles.captureEmpty}>
                                        <Camera size={24} color={theme.colors.primary} style={{ marginBottom: 4 }} />
                                        <Text style={styles.captureEmptyText}>Tap to Capture Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        <View style={{ marginBottom: theme.spacing.xl }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: theme.spacing.sm, color: theme.colors.text }}>Serial Number</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.serialInput}
                                    value={editSerialNumber}
                                    onChangeText={setEditSerialNumber}
                                    placeholder="Enter Serial Number"
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.saveBtn, savingSerial && styles.saveBtnDisabled]}
                            onPress={handleSaveSerialEdit}
                            disabled={savingSerial}
                        >
                            <Text style={styles.saveBtnText}>{savingSerial ? "Saving..." : "Save Serial Changes"}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

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
    },
    masterGalleryContainer: {
        backgroundColor: 'white',
        paddingVertical: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
    },
    galleryTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.textLight,
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    galleryList: {
        paddingHorizontal: theme.spacing.lg,
    },
    masterImageCard: {
        marginRight: theme.spacing.md,
        alignItems: 'center',
    },
    masterImage: {
        width: 100,
        height: 120,
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#f1f5f9',
        marginBottom: 4,
    },
    masterImageLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.textLight,
    },
    editImagesBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: '#f0f9ff',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: '#bae6fd',
        borderStyle: 'dashed'
    },
    editImagesText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: 'white'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    modalContent: {
        padding: theme.spacing.lg,
    },
    modalSubtitle: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginBottom: theme.spacing.xl,
        lineHeight: 20
    },
    captureBlock: {
        marginBottom: theme.spacing.lg,
    },
    captureLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    captureBox: {
        height: 180,
        backgroundColor: 'white',
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    captureEmpty: {
        alignItems: 'center',
    },
    captureEmptyText: {
        color: theme.colors.primary,
        fontWeight: '500',
        fontSize: 14
    },
    saveBtn: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.xl * 2
    },
    saveBtnDisabled: {
        backgroundColor: theme.colors.textLight
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    editSerialBtn: {
        padding: theme.spacing.sm,
        marginLeft: theme.spacing.sm,
        backgroundColor: '#f0f9ff',
        borderRadius: 20,
    },
    expandIconContainer: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: 4,
        borderRadius: 12,
    },
    inputContainer: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
    },
    serialInput: {
        paddingVertical: 12,
        fontSize: 16,
        color: theme.colors.text,
        fontFamily: 'monospace',
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
