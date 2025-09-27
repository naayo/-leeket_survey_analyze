// Google Sheets Configuration
// To use this, you need to:
// 1. Make your Google Sheet publicly readable (Share > Anyone with the link can view)
// 2. Get the Sheet ID from the URL: https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
// 3. Replace SHEET_ID below with your actual sheet ID

const SHEETS_CONFIG = {
	// Replace with your actual Google Sheets ID
	SHEET_ID: '1AFtxuGUJMRPWBld9nWXfPVAvYTatIk1fpv_SiUSxKDE',

	// Sheet names/tabs
	SHEETS: {
		responses: 'Responses', // Main survey responses sheet
		summary: 'Summary', // Summary/calculated data sheet (if exists)
	},

	// API configuration
	API_KEY: '', // Optional: Add Google API key for higher rate limits

	// Cache configuration
	CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache

	// Column mappings (adjust based on your sheet structure)
	COLUMNS: {
		timestamp: 'A',
		email: 'B',
		name: 'C',
		age: 'D',
		location: 'E',
		phone: 'F',
		interest: 'G',
		services: 'H',
		dishes: 'I',
		priceMin: 'J',
		priceIdeal: 'K',
		priceMax: 'L',
		deliveryPrice: 'M',
		betaTester: 'N',
		frequency: 'O',
		orderTime: 'P',
		comments: 'Q',
	},
};

// Generate Google Sheets API URL
function getSheetURL(sheetName = SHEETS_CONFIG.SHEETS.responses, range = 'A:Z') {
	const baseURL = 'https://sheets.googleapis.com/v4/spreadsheets';
	const sheetId = SHEETS_CONFIG.SHEET_ID;
	const apiKey = SHEETS_CONFIG.API_KEY;

	if (apiKey) {
		return `${baseURL}/${sheetId}/values/${sheetName}!${range}?key=${apiKey}`;
	} else {
		// Alternative: Use public CSV export (no API key needed)
		return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;
	}
}

// Alternative: Direct CSV export URL (simpler but less flexible)
function getCSVExportURL(sheetName = SHEETS_CONFIG.SHEETS.responses) {
	return `https://docs.google.com/spreadsheets/d/${SHEETS_CONFIG.SHEET_ID}/export?format=csv&gid=0`;
}

// Get public JSON feed URL (works without API key)
function getPublicJSONURL(sheetName = SHEETS_CONFIG.SHEETS.responses) {
	return `https://spreadsheets.google.com/feeds/cells/${SHEETS_CONFIG.SHEET_ID}/1/public/full?alt=json`;
}
