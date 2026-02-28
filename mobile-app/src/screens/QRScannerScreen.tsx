import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { theme } from '../styles/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ScanLine, RotateCcw, CheckCircle2 } from 'lucide-react-native';
import axios from 'axios';
import { useAuthStore, API_URL } from '../store/useAuthStore';

export const QRScannerScreen = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const route = useRoute<any>();
    const mode = route.params?.mode || 'add_stock';
    const { token } = useAuthStore();

    // Accumulate scanned codes
    const [scannedCodes, setScannedCodes] = useState({
        itemCode: route.params?.currentItemCode || '',
        serialNumber: route.params?.currentSerialNumber || ''
    });

    if (!permission) {
        return <View style={styles.safeArea} />;
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.permissionContainer}>
                    <ScanLine size={48} color={theme.colors.primary} style={{ marginBottom: 20 }} />
                    <Text style={styles.permissionText}>Camera access is required to scan codes.</Text>
                    <TouchableOpacity onPress={requestPermission} activeOpacity={0.8} style={styles.buttonShadow}>
                        <LinearGradient
                            colors={theme.colors.primaryGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>Allow Camera Access</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;

        const cleanData = data.trim().toUpperCase();

        if (mode === 'add_stock') {
            let updated = { ...scannedCodes };
            let changed = false;

            // Smart detection based on format
            if (cleanData.startsWith('FG-')) {
                if (updated.itemCode !== cleanData) {
                    updated.itemCode = cleanData;
                    changed = true;
                }
            } else {
                if (updated.serialNumber !== cleanData) {
                    updated.serialNumber = cleanData;
                    changed = true;
                }
            }

            if (changed) {
                setScannedCodes(updated);

                // Auto-navigate instantly if we have successfully acquired BOTH
                if (updated.itemCode && updated.serialNumber) {
                    setScanned(true); // Stop camera
                    // Using merge: true prevents pushing another screen on stack
                    navigation.navigate({
                        name: 'AddStock',
                        params: updated,
                        merge: true,
                    });
                }
            }
        } else if (mode === 'mark_sold') {
            setScanned(true); // Pause scanner while processing

            axios.put(`${API_URL}/items/serial-number/${cleanData}/sold`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(() => {
                    Alert.alert("Success", `Item ${cleanData} marked as sold`);
                })
                .catch(err => {
                    console.error('Mark sold error:', err.response?.data || err.message);
                    Alert.alert("Error", err.response?.data?.message || "Failed to mark item as sold");
                })
                .finally(() => {
                    // Auto-resume scanner after a brief readable delay
                    setTimeout(() => setScanned(false), 2000);
                });
        }
    };

    const handleDoneScanning = () => {
        navigation.navigate({
            name: 'AddStock',
            params: scannedCodes,
            merge: true,
        });
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8", "pdf417", "code128", "code39"],
                }}
            />

            {/* Multi-scan Top Bar Indicators */}
            {mode === 'add_stock' && (
                <SafeAreaView edges={['top']} style={styles.topBarSafe}>
                    <View style={styles.topBar}>
                        <View style={[styles.statusBadge, scannedCodes.itemCode ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                            <Text style={styles.statusBadgeText}>
                                Item: {scannedCodes.itemCode ? '✓ Scanned' : 'Waiting...'}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, scannedCodes.serialNumber ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                            <Text style={styles.statusBadgeText}>
                                Serial: {scannedCodes.serialNumber ? '✓ Scanned' : 'Waiting...'}
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>
            )}

            {/* Overlay border for scanning target */}
            <View style={styles.scannerTargetContainer}>
                <View style={[
                    styles.scannerTarget,
                    (scannedCodes.itemCode || scannedCodes.serialNumber) && { borderColor: theme.colors.primary }
                ]} />
            </View>

            <View style={styles.overlay}>
                {(scannedCodes.itemCode || scannedCodes.serialNumber) ? (
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={handleDoneScanning}>
                        <CheckCircle2 size={24} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Done Scanning</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <ScanLine size={24} color="white" style={{ marginBottom: 10 }} />
                        <Text style={styles.overlayText}>
                            Point at QR Codes...
                        </Text>
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    permissionText: {
        textAlign: 'center',
        fontSize: 16,
        marginBottom: theme.spacing.xl,
        color: theme.colors.text,
        fontWeight: '500',
    },
    buttonShadow: {
        ...theme.shadows.medium,
        width: '100%',
    },
    button: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    topBarSafe: {
        position: 'absolute',
        top: 0, width: '100%', zIndex: 10
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    statusBadge: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    statusBadgeActive: {
        backgroundColor: theme.colors.primary,
    },
    statusBadgeInactive: {
        backgroundColor: 'rgba(50,50,50,0.8)',
    },
    statusBadgeText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    scannerTargetContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerTarget: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: 'transparent',
        borderRadius: theme.borderRadius.md,
        borderStyle: 'dashed',
    },
    overlay: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    overlayText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    actionActionButton: { // Left for compatibility
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.round,
        ...theme.shadows.medium,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: theme.borderRadius.round,
        ...theme.shadows.medium,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
