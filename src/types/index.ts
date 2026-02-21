export interface User {
    user_id: number;
    email: string;
    role: 'customer' | 'internal_user' | 'owner';
    company_name?: string;
    phone?: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    login: (user: User, token: string) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

export interface Item {
    item_id: number;
    item_name: string;
    item_code: string;
    description?: string;
    category?: string;
    master_price: number;
    stock_quantity: number;
    image_url?: string;
}

export interface Order {
    order_id: number;
    order_number: string;
    customer_id: number;
    total_amount: string; // decimal in DB comes as string
    status: 'pending' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled';
    order_date: string;
    notes?: string;
    customer_email?: string;
    company_name?: string;
    phone?: string; // Added
    payment_status?: string; // Added
    item_count?: number;
    items?: OrderItem[]; // Added for detailed view
}

export interface OrderItem {
    order_item_id: number;
    item_name: string;
    item_code: string;
    serial_number: string;
    image_url?: string;
    price: string;
    status: 'confirmed' | 'replaced' | 'rejected';
}
