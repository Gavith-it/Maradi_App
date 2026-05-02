import * as xlsx from 'xlsx';
import path from 'path';
import { pool } from '../db';

const filePath = path.join(__dirname, '../../../Price List 2026 May.xlsx');
const workbook = xlsx.readFile(filePath);

const extractMetadata = (name: string, sheetName: string) => {
    let color_type = 'Self';
    if (sheetName.toLowerCase().includes('contrast')) color_type = 'Contrast';
    else if (sheetName.toLowerCase().includes('printed')) color_type = 'Printed';

    let category = sheetName.toLowerCase().includes('seconds') ? 'Seconds' : 'Fresh';
    let subcategory = sheetName.toLowerCase().includes('butta') ? 'Butta' : 'Standard';

    const fabricMatch = name.match(/\((.*?)\)/);
    const fabric_type = fabricMatch ? fabricMatch[1] : 'Unknown';

    let design_type = 'Unknown';
    let design_name = 'Unknown';

    const codeMatch = name.match(/([A-Z]\d{5})/);
    if (codeMatch && codeMatch.index !== undefined) {
        const textBeforeCode = name.substring(0, codeMatch.index).trim();
        const parts = textBeforeCode.split(' ');
        if (parts.length > 1) {
             design_type = parts[1];
        } else if (parts.length === 1) {
             design_type = parts[0];
        }
        
        if (fabricMatch && fabricMatch.index !== undefined) {
             const textAfterCode = name.substring(codeMatch.index + codeMatch[0].length, fabricMatch.index).trim();
             design_name = textAfterCode;
        }
    } else {
        // Fallback if D00001 code isn't in name
        if (name.toLowerCase().includes('checks')) design_type = 'Checks';
        if (name.toLowerCase().includes('plain')) design_type = 'Plain';
        if (name.toLowerCase().includes('border')) design_type = 'Border';
    }

    return {
        color_type,
        category,
        subcategory,
        fabric_type,
        design_type,
        design_name
    };
};

const runImport = async () => {
    const client = await pool.connect();
    let totalImported = 0;
    
    try {
        await client.query('BEGIN');
        
        for (const sheetName of workbook.SheetNames) {
            console.log(`Processing Sheet: ${sheetName}`);
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json<any>(sheet);
            
            for (const row of data) {
                const name = row.NAME || row.Name;
                const code = row.CODE || row.Code;
                
                // Find agent and MRP regardless of case
                const agentKey = Object.keys(row).find(k => k.toLowerCase() === 'agent');
                const mrpKey = Object.keys(row).find(k => k.toLowerCase() === 'mrp');
                
                if (!name || !code) continue; // Skip invalid rows
                
                const agentPrice = agentKey ? parseFloat(row[agentKey]) : null;
                const mrpPrice = mrpKey ? parseFloat(row[mrpKey]) : null;
                
                const meta = extractMetadata(name, sheetName);
                
                // Upsert logic
                await client.query(`
                    INSERT INTO items (
                        item_code, item_name, category, subcategory, inventory_type,
                        master_price, a_price, is_active, fabric_type, design_type, color_type, design_name
                    ) VALUES (
                        $1, $2, $3, $4, 'serial',
                        $5, $6, true, $7, $8, $9, $10
                    )
                    ON CONFLICT (item_code) DO UPDATE SET
                        item_name = EXCLUDED.item_name,
                        category = EXCLUDED.category,
                        subcategory = EXCLUDED.subcategory,
                        master_price = EXCLUDED.master_price,
                        a_price = EXCLUDED.a_price,
                        fabric_type = EXCLUDED.fabric_type,
                        design_type = EXCLUDED.design_type,
                        color_type = EXCLUDED.color_type,
                        design_name = EXCLUDED.design_name
                `, [
                    code, name, meta.category, meta.subcategory, 
                    mrpPrice, agentPrice, meta.fabric_type, meta.design_type, meta.color_type, meta.design_name
                ]);
                
                totalImported++;
            }
        }
        
        await client.query('COMMIT');
        console.log(`Successfully imported/updated ${totalImported} items.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error importing data:', err);
    } finally {
        client.release();
        pool.end(); // close pool so script exits
    }
};

runImport();
