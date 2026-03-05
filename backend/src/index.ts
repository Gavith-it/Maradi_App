import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import itemRoutes from './routes/items.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/orders.routes';
import importRoutes from './routes/import.routes';
import priceListRoutes from './routes/price_lists.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configured CORS to be more secure. 
// In production, origins should be an array of expected domains.
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || '*'
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

if (process.env.JWT_SECRET === 'your_jwt_secret_key_change_this_for_production') {
    console.warn('\x1b[31m%s\x1b[0m', 'WARNING: INSECURE JWT_SECRET DETECTED! Change process.env.JWT_SECRET immediately before production deployment.');
}
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/import', importRoutes);
app.use('/api/price-lists', priceListRoutes);

app.get('/', (req, res) => {
    res.send('MARADI B2B Wholesale API Running');
});

// Initialize DB and start server
if (process.env.NODE_ENV !== 'production') {
    const startServer = async () => {
        // Uncomment the line below to run schema migration on startup (dev only)
        // await initDb(); 
        const server = app.listen(PORT, (err?: any) => {
            if (err) {
                console.error(`Failed to start server on port ${PORT}:`, err);
                process.exit(1);
            }
            console.log(`Server running on port ${PORT}`);
        });
        server.on('error', (err) => {
            console.error('Server error:', err);
        });
    };

    startServer();
}

export default app;

