import { create } from 'zustand';
import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Automatically figures out your Wi-Fi IP address from the Expo Bundler
const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];

// Production: set EXPO_PUBLIC_API_URL to your Vercel API URL (e.g. https://maradi-app-theta.vercel.app/api)
// Local: uses localhost (web) or dev machine IP (mobile on same network)
const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
export const API_URL = envApiUrl
    ? (envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/$/, '')}/api`)
    : Platform.OS === 'web'
        ? 'http://localhost:5000/api'
        : `http://${debuggerHost || '192.168.20.65'}:5000/api`;

interface User {
    id: number;
    email: string;
    role: 'customer' | 'internal_user' | 'owner';
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isLoading: false,
    login: async (email, password) => {
        set({ isLoading: true });
        try {
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });
            set({
                user: response.data.user,
                token: response.data.token,
                isLoading: false
            });
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },
    logout: () => set({ user: null, token: null }),
}));
