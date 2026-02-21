import xlsx from 'xlsx';
import path from 'path';
import pool from '../db';

export const importItemsFromExcel = async (req: any, res: any) => {
    try {
        const filePath = path.join(__dirname, '../../../web-admin/public/Item details.xlsx');
        console.log('Reading from:', filePath);

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON based on the columns
        const data: any[] = xlsx.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} rows in the Excel file.`);

        let importedCount = 0;
        let skipCount = 0;

        for (const row of data) {
            const itemNo = row['Item No.'] || row['Item No'];
            const itemDesc = row['Item Description'] || row['Description'];

            if (!itemNo || !itemDesc) {
                console.log('Skipping row due to missing data:', row);
                skipCount++;
                continue;
            }

            // Default price to 0 if we don't know it, user will update it when adding stock if needed.
            // Check if item already exists
            const result = await pool.query('SELECT item_id FROM items WHERE item_code = $1', [itemNo]);

            if (result.rows.length > 0) {
                // Update existing item name
                await pool.query('UPDATE items SET item_name = $1 WHERE item_code = $2', [itemDesc, itemNo]);
            } else {
                // Insert new item master entry
                await pool.query(
                    'INSERT INTO items (item_code, item_name, master_price, category) VALUES ($1, $2, $3, $4)',
                    [itemNo, itemDesc, 0, 'Uncategorized']
                );
            }
            importedCount++;
        }

        res.json({
            message: 'Import completed successfully',
            imported: importedCount,
            skipped: skipCount,
        });

    } catch (error) {
        console.error('Error importing items:', error);
        res.status(500).json({ message: 'Error importing items', error: (error as Error).message });
    }
};
