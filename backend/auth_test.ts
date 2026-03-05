import axios from 'axios';
import jwt from 'jsonwebtoken';

async function authTest() {
    const payload = { id: 10, role: 'owner' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

    try {
        const res = await axios.put('http://localhost:5000/api/items/serial-number/FRESH-SERIAL-123/sold', {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.error("Error:", e.response?.data || e.message);
    }
}
authTest();
