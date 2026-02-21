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
exports.importItemsFromExcel = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("../db"));
const importItemsFromExcel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filePath = path_1.default.join(__dirname, '../../../web-admin/public/Item details.xlsx');
        console.log('Reading from:', filePath);
        const workbook = xlsx_1.default.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Convert sheet to JSON based on the columns
        const data = xlsx_1.default.utils.sheet_to_json(sheet);
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
            const result = yield db_1.default.query('SELECT item_id FROM items WHERE item_code = $1', [itemNo]);
            if (result.rows.length > 0) {
                // Update existing item name
                yield db_1.default.query('UPDATE items SET item_name = $1 WHERE item_code = $2', [itemDesc, itemNo]);
            }
            else {
                // Insert new item master entry
                yield db_1.default.query('INSERT INTO items (item_code, item_name, master_price, category) VALUES ($1, $2, $3, $4)', [itemNo, itemDesc, 0, 'Uncategorized']);
            }
            importedCount++;
        }
        res.json({
            message: 'Import completed successfully',
            imported: importedCount,
            skipped: skipCount,
        });
    }
    catch (error) {
        console.error('Error importing items:', error);
        res.status(500).json({ message: 'Error importing items', error: error.message });
    }
});
exports.importItemsFromExcel = importItemsFromExcel;
