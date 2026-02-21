export type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    ScanQR: {
        mode: 'add_stock' | 'mark_sale' | 'audit';
        currentItemCode?: string;
        currentSerialNumber?: string;
    };
    AddStock: { itemCode?: string; serialNumber?: string };
    Catalog: undefined;
    SerialSelection: { itemCode: string; itemName: string };
    Cart: undefined;
    OrderHistory: undefined;
    PendingOrders: undefined;
    OrderDetail: { orderId: number };
    InternalCatalog: undefined;
    InternalItemDetail: { itemCode: string; itemName: string };
};
