// Simplified Google Sheets Data Connector
// This module handles the connection to Google Sheets using the API key

async function fetchSheetData() {
    const sheetId = SHEETS_CONFIG.SHEET_ID;
    const apiKey = SHEETS_CONFIG.API_KEY;

    if (!sheetId || sheetId === 'YOUR_SHEET_ID_HERE') {
        throw new Error('No Google Sheet configured');
    }

    // Method 1: Try Google Visualization API first (no API key needed, more reliable)
    try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Responses`;

        console.log('Fetching from Google Visualization API:', url);

        const response = await fetch(url);
        const text = await response.text();

        // Parse Google's response
        const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/);

        if (match && match[1]) {
            const data = JSON.parse(match[1]);

            if (data.table && data.table.rows) {
                const cols = data.table.cols;
                const rows = data.table.rows;

                // Get headers
                const headers = cols.map(col => col.label || '');

                // Convert to array of objects
                const result = rows.map(row => {
                    const obj = {};
                    row.c.forEach((cell, index) => {
                        const value = cell ? (cell.v !== null ? cell.v : '') : '';
                        obj[headers[index] || `col${index}`] = value;
                    });
                    return obj;
                });

                console.log(`Successfully fetched ${result.length} rows from Visualization API`);
                return result;
            }
        }
    } catch (error) {
        console.error('Google Visualization API failed:', error);
    }

    // Method 2: Try Google Sheets API v4 with API key
    if (apiKey && apiKey !== '') {
        try {
            const range = 'Responses!A1:Z1000'; // Get first 1000 rows from Responses sheet
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

            console.log('Fetching from Google Sheets API v4:', url);

            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();

                if (data.values && data.values.length > 0) {
                    // Convert to array of objects
                    const headers = data.values[0];
                    const rows = data.values.slice(1);

                    const result = rows.map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            obj[header] = row[index] || '';
                        });
                        return obj;
                    });

                    console.log(`Successfully fetched ${result.length} rows from Google Sheets API`);
                    return result;
                }
            }
        } catch (error) {
            console.error('Google Sheets API v4 failed:', error);
        }
    }


    // Method 3: Try CSV export (this gets the first/default sheet, so might not work)
    try {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

        console.log('Fetching CSV export:', url);

        const response = await fetch(url);
        const csvText = await response.text();

        // Parse CSV
        const lines = csvText.split('\n');
        if (lines.length > 1) {
            const headers = parseCSVLine(lines[0]);
            const result = [];

            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim()) {
                    const values = parseCSVLine(lines[i]);
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = values[index] || '';
                    });
                    result.push(obj);
                }
            }

            console.log(`Successfully fetched ${result.length} rows from CSV export`);
            return result;
        }
    } catch (error) {
        console.error('CSV export failed:', error);
    }

    throw new Error('All methods failed to fetch data');
}

// Helper function to parse CSV line
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// Process survey data for Leeket dashboard
function processSurveyData(rawData) {
    if (!rawData || rawData.length === 0) {
        return getFallbackData();
    }

    const totalRespondents = rawData.length;

    // Initialize counters
    let diasporaCount = 0;
    let senegalCount = 0;
    let betaTesters = 0;
    let phoneCount = 0;
    let interests = [];
    let scores = [];

    const ageGroups = {
        '18-24 ans': 0,
        '25-34 ans': 0,
        '35-44 ans': 0,
        '45-54 ans': 0,
        '55+ ans': 0
    };

    const services = {
        'Livraison à domicile': 0,
        'Click & Collect': 0,
        'Réservation de table': 0,
        'Traiteur événements': 0,
        'Abonnement mensuel': 0
    };

    const dishCounts = {};
    const prices = {
        min: [],
        ideal: [],
        max: [],
        delivery: []
    };

    // Process each row
    rawData.forEach(row => {
        // Process location
        const location = findValue(row, ['quartier/zone', 'localisation', 'location', 'pays', 'country', 'zone', 'quartier']);
        if (location) {
            const loc = location.toLowerCase();
            // Check for diaspora keywords
            if (loc.includes('france') || loc.includes('usa') || loc.includes('canada') ||
                loc.includes('europe') || loc.includes('étranger') || loc.includes('états-unis')) {
                diasporaCount++;
            } else {
                // All other locations are considered Sénégal local
                senegalCount++;
            }
        } else {
            // If no location data, assume Sénégal local
            senegalCount++;
        }

        // Process interest
        const interest = findValue(row, ['intérêt', 'interest', 'niveau']);
        if (interest) {
            const num = parseInt(interest);
            if (num >= 1 && num <= 5) {
                interests.push(num);
            }
        }

        // Process beta tester
        const beta = findValue(row, ['beta', 'testeur', 'tester']);
        if (beta && beta.toLowerCase().includes('oui')) {
            betaTesters++;
        }

        // Process phone
        const phone = findValue(row, ['téléphone', 'telephone', 'phone', 'tel']);
        if (phone && phone.trim() !== '') {
            phoneCount++;
        }

        // Process age
        const age = findValue(row, ['âge', 'age']);
        if (age) {
            categorizeAge(age, ageGroups);
        }

        // Process services
        const serviceList = findValue(row, ['services', 'service']);
        if (serviceList) {
            categorizeServices(serviceList, services);
        }

        // Process dishes
        const dishes = findValue(row, ['plats', 'plat', 'dishes', 'dish']);
        if (dishes) {
            const dishList = dishes.split(/[,;]/);
            dishList.forEach(dish => {
                const trimmed = dish.trim().toLowerCase();
                if (trimmed) {
                    dishCounts[trimmed] = (dishCounts[trimmed] || 0) + 1;
                }
            });
        }

        // Process prices
        const priceMin = findValue(row, ['prix minimum', 'prix min', 'minimum price']);
        const priceIdeal = findValue(row, ['prix idéal', 'prix ideal', 'ideal price']);
        const priceMax = findValue(row, ['prix maximum', 'prix max', 'maximum price']);
        const priceDelivery = findValue(row, ['livraison', 'delivery', 'frais']);

        if (priceMin) prices.min.push(parseInt(priceMin) || 0);
        if (priceIdeal) prices.ideal.push(parseInt(priceIdeal) || 0);
        if (priceMax) prices.max.push(parseInt(priceMax) || 0);
        if (priceDelivery) prices.delivery.push(parseInt(priceDelivery) || 0);

        // Calculate score
        let score = 50;
        if (interests.length > 0) {
            score = interests[interests.length - 1] * 20;
        }
        if (beta && beta.toLowerCase().includes('oui')) {
            score += 10;
        }
        scores.push(Math.min(100, score));
    });

    // Calculate averages and distributions
    const avgInterest = interests.length > 0 ?
        (interests.reduce((a, b) => a + b, 0) / interests.length).toFixed(2) : 3.0;

    const avgScore = scores.length > 0 ?
        (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 50;

    // Interest distribution
    const interestDistribution = [0, 0, 0, 0, 0];
    interests.forEach(level => {
        if (level >= 1 && level <= 5) {
            interestDistribution[level - 1]++;
        }
    });

    // Score distribution
    const scoreDistribution = [0, 0, 0, 0, 0];
    let hotLeads = 0, warmLeads = 0, coldLeads = 0;

    scores.forEach(score => {
        if (score <= 20) scoreDistribution[0]++;
        else if (score <= 40) scoreDistribution[1]++;
        else if (score <= 60) scoreDistribution[2]++;
        else if (score <= 80) scoreDistribution[3]++;
        else scoreDistribution[4]++;

        if (score > 80) hotLeads++;
        else if (score > 50) warmLeads++;
        else coldLeads++;
    });

    // Top dishes
    const topDishes = Object.entries(dishCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            count
        }));

    // Average prices
    const avgPrices = {
        min: prices.min.length > 0 ?
            Math.round(prices.min.reduce((a, b) => a + b, 0) / prices.min.length) : 3500,
        ideal: prices.ideal.length > 0 ?
            Math.round(prices.ideal.reduce((a, b) => a + b, 0) / prices.ideal.length) : 7500,
        max: prices.max.length > 0 ?
            Math.round(prices.max.reduce((a, b) => a + b, 0) / prices.max.length) : 15000,
        delivery: prices.delivery.length > 0 ?
            Math.round(prices.delivery.reduce((a, b) => a + b, 0) / prices.delivery.length) : 1000
    };

    return {
        totalRespondents,
        avgInterest,
        betaTestersCount: betaTesters,
        diasporaCount,
        senegalCount,
        avgScore,
        phoneCount,
        hotLeads,
        warmLeads,
        coldLeads,
        interestDistribution,
        ageDistribution: ageGroups,
        services,
        topDishes,
        scoreDistribution,
        avgPriceMin: avgPrices.min,
        avgPriceIdeal: avgPrices.ideal,
        avgPriceMax: avgPrices.max,
        avgDeliveryPrice: avgPrices.delivery,
        lastUpdate: new Date().toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    };
}

// Helper function to find value by multiple possible keys
function findValue(row, possibleKeys) {
    for (const key of possibleKeys) {
        for (const rowKey in row) {
            if (rowKey.toLowerCase().includes(key.toLowerCase())) {
                return row[rowKey];
            }
        }
    }
    return null;
}

// Helper function to categorize age
function categorizeAge(age, distribution) {
    const ageStr = age.toString().toLowerCase();
    if (ageStr.includes('18') || ageStr.includes('24') || parseInt(age) < 25) {
        distribution['18-24 ans']++;
    } else if (ageStr.includes('25') || ageStr.includes('34') || (parseInt(age) >= 25 && parseInt(age) < 35)) {
        distribution['25-34 ans']++;
    } else if (ageStr.includes('35') || ageStr.includes('44') || (parseInt(age) >= 35 && parseInt(age) < 45)) {
        distribution['35-44 ans']++;
    } else if (ageStr.includes('45') || ageStr.includes('54') || (parseInt(age) >= 45 && parseInt(age) < 55)) {
        distribution['45-54 ans']++;
    } else {
        distribution['55+ ans']++;
    }
}

// Helper function to categorize services
function categorizeServices(services, distribution) {
    const servStr = services.toLowerCase();
    if (servStr.includes('livr')) distribution['Livraison à domicile']++;
    if (servStr.includes('click') || servStr.includes('collect')) distribution['Click & Collect']++;
    if (servStr.includes('réserv') || servStr.includes('table')) distribution['Réservation de table']++;
    if (servStr.includes('trait') || servStr.includes('event')) distribution['Traiteur événements']++;
    if (servStr.includes('abonn')) distribution['Abonnement mensuel']++;
}

// Get fallback data
function getFallbackData() {
    return {
        totalRespondents: 66,
        avgInterest: 4.21,
        betaTestersCount: 30,
        diasporaCount: 38,
        senegalCount: 28,
        avgScore: 46.7,
        phoneCount: 66,
        hotLeads: 18,
        warmLeads: 25,
        coldLeads: 23,
        interestDistribution: [1, 2, 11, 24, 28],
        ageDistribution: {
            '18-24 ans': 5,
            '25-34 ans': 28,
            '35-44 ans': 20,
            '45-54 ans': 10,
            '55+ ans': 3
        },
        services: {
            'Livraison à domicile': 55,
            'Click & Collect': 40,
            'Réservation de table': 28,
            'Traiteur événements': 45,
            'Abonnement mensuel': 35
        },
        topDishes: [
            { name: 'Thiébou Dieune', count: 52 },
            { name: 'Yassa Poulet', count: 48 },
            { name: 'Mafé', count: 42 },
            { name: 'Thiou', count: 35 },
            { name: 'Domoda', count: 30 },
            { name: 'Soupe Kandia', count: 28 },
            { name: 'Caldou', count: 25 },
            { name: 'Thiebou Yapp', count: 22 },
            { name: 'Fataya', count: 20 },
            { name: 'Pastels', count: 18 }
        ],
        scoreDistribution: [5, 15, 15, 20, 11],
        avgPriceMin: 3542,
        avgPriceIdeal: 7583,
        avgPriceMax: 15950,
        avgDeliveryPrice: 1083,
        lastUpdate: '27 septembre 2025'
    };
}

// Main function to get dashboard data
async function getDashboardData() {
    try {
        const rawData = await fetchSheetData();
        const processedData = processSurveyData(rawData);

        // Mark as live data
        processedData._dataSource = 'live';
        processedData._fetchedAt = new Date().toISOString();

        return processedData;
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        const fallbackData = getFallbackData();

        // Mark as fallback data
        fallbackData._dataSource = 'fallback';
        fallbackData._reason = error.message;

        return fallbackData;
    }
}

// Create simplified data fetcher for compatibility
if (typeof window !== 'undefined') {
    window.leeketDataFetcher = {
        getDashboardData: getDashboardData,
        getFallbackData: getFallbackData
    };
}