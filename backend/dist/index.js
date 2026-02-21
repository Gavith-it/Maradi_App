"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const items_routes_1 = __importDefault(require("./routes/items.routes"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/items', items_routes_1.default);
app.use('/api/cart', cart_routes_1.default);
app.use('/api/orders', orders_routes_1.default);
app.get('/', (req, res) => {
    res.send('MARADI B2B Wholesale API Running');
});
// Initialize DB and start server
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    // Uncomment the line below to run schema migration on startup (dev only)
    // await initDb(); 
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
startServer();
