import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/useAuthStore';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { QRScannerScreen } from '../screens/QRScannerScreen';
import { AddStockScreen } from '../screens/AddStockScreen';
import { PendingOrdersScreen } from '../screens/PendingOrdersScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { CatalogScreen } from '../screens/CatalogScreen';
import { SerialSelectionScreen } from '../screens/SerialSelectionScreen';
import { CartScreen } from '../screens/CartScreen';
import { OrderHistoryScreen } from '../screens/OrderHistoryScreen';
import { InternalCatalogScreen } from '../screens/InternalCatalogScreen';
import { InternalItemDetailScreen } from '../screens/InternalItemDetailScreen';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
    const { user, token, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {token ? (
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />

                        <Stack.Screen name="ScanQR" component={QRScannerScreen} options={{ headerShown: true, title: 'Scan QR Code' }} />
                        <Stack.Screen name="AddStock" component={AddStockScreen} options={{ headerShown: true, title: 'Add New Stock' }} />
                        <Stack.Screen name="PendingOrders" component={PendingOrdersScreen} options={{ headerShown: true, title: 'Pending Orders' }} />
                        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: true, title: 'Order Details' }} />
                        <Stack.Screen name="Catalog" component={CatalogScreen} options={{ headerShown: true, title: 'Catalog' }} />
                        <Stack.Screen name="SerialSelection" component={SerialSelectionScreen} options={{ headerShown: true, title: 'Select Item' }} />
                        <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: true, title: 'My Cart' }} />
                        <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ headerShown: true, title: 'My Orders' }} />
                        <Stack.Screen name="InternalCatalog" component={InternalCatalogScreen} options={{ headerShown: false }} />
                        <Stack.Screen name="InternalItemDetail" component={InternalItemDetailScreen} options={{ headerShown: false }} />
                    </>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
