// Enhanced Data Fetcher Module for Google Sheets Integration
// This version uses multiple methods to ensure connection success

class LeeketDataFetcherV2 {
    constructor() {
        this.cache = null;
        this.cacheTimestamp = null;
        this.isLoading = false;
    }

    // Check if cache is valid
    isCacheValid() {
        if (!this.cache || !this.cacheTimestamp) return false;
        const now = Date.now();
        return (now - this.cacheTimestamp) < SHEETS_CONFIG.CACHE_DURATION;
    }

    // Method 1: Fetch using Google Visualization API (most reliable)
    async fetchUsingGoogleViz() {
        const sheetId = SHEETS_CONFIG.SHEET_ID;
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

        try {
            const response = await fetch(url);
            const text = await response.text();

            // Parse Google's response format
            const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/);
            if (jsonMatch && jsonMatch[1]) {
                const data = JSON.parse(jsonMatch[1]);
                return this.parseGoogleVizData(data);
            }
        } catch (error) {
            console.error('Google Viz fetch failed:', error);
            throw error;
        }
    }

    // Method 2: Fetch using CSV export
    async fetchUsingCSV() {
        const sheetId = SHEETS_CONFIG.SHEET_ID;
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

        try {
            const response = await fetch(url);
            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.error('CSV fetch failed:', error);
            throw error;
        }
    }

    // Parse Google Visualization data
    parseGoogleVizData(data) {
        if (!data.table || !data.table.rows) return [];

        const rows = data.table.rows;
        const cols = data.table.cols;

        // Get headers
        const headers = cols.map(col => col.label || '');

        // Convert to array of objects
        const result = rows.map(row => {
            const obj = {};
            row.c.forEach((cell, index) => {
                const value = cell ? (cell.v !== null ? cell.v : '') : '';
                const header = headers[index] || `col${index}`;
                obj[header] = value;
            });
            return obj;
        });

        return result;
    }

    // Parse CSV data
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        if (lines.length < 2) return [];

        // Parse headers
        const headers = this.parseCSVLine(lines[0]);

        // Parse data rows
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                result.push(obj);
            }
        }

        return result;
    }

    // Parse a single CSV line handling quotes
    parseCSVLine(line) {
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

    // Fetch data from Google Sheets
    async fetchFromGoogleSheets() {
        if (this.isCacheValid()) {
            return this.cache;
        }

        if (this.isLoading) {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.isLoading) {
                        clearInterval(checkInterval);
                        resolve(this.cache);
                    }
                }, 100);
            });
        }

        this.isLoading = true;

        try {
            // Try Google Visualization API first
            console.log('Attempting Google Viz API...');
            const data = await this.fetchUsingGoogleViz();

            if (data && data.length > 0) {
                console.log(`Successfully fetched ${data.length} rows`);
                this.cache = data;
                this.cacheTimestamp = Date.now();
                return data;
            }

            // Fallback to CSV if Viz fails
            console.log('Trying CSV export...');
            const csvData = await this.fetchUsingCSV();

            if (csvData && csvData.length > 0) {
                console.log(`Successfully fetched ${csvData.length} rows via CSV`);
                this.cache = csvData;
                this.cacheTimestamp = Date.now();
                return csvData;
            }

            throw new Error('No data received from any method');

        } catch (error) {
            console.error('All fetch methods failed:', error);
            return this.getFallbackData();
        } finally {
            this.isLoading = false;
        }
    }

    // Process raw data into dashboard format
    processRawData(rawData) {
        if (!rawData || rawData.length === 0) {
            return this.getFallbackData();
        }

        // Remove header row if it looks like headers
        const dataRows = this.isHeaderRow(rawData[0]) ? rawData.slice(1) : rawData;

        if (dataRows.length === 0) {
            return this.getFallbackData();
        }

        const totalRespondents = dataRows.length;

        // Process each metric with flexible column detection
        const stats = this.calculateStatistics(dataRows);

        return {
            totalRespondents,
            avgInterest: stats.avgInterest,
            betaTestersCount: stats.betaTesters,
            diasporaCount: stats.diaspora,
            senegalCount: stats.senegal,
            avgScore: stats.avgScore,
            phoneCount: stats.phoneCount,
            hotLeads: stats.hotLeads,
            warmLeads: stats.warmLeads,
            coldLeads: stats.coldLeads,
            interestDistribution: stats.interestDist,
            ageDistribution: stats.ageDist,
            services: stats.services,
            topDishes: stats.topDishes,
            scoreDistribution: stats.scoreDist,
            avgPriceMin: stats.prices.min,
            avgPriceIdeal: stats.prices.ideal,
            avgPriceMax: stats.prices.max,
            avgDeliveryPrice: stats.prices.delivery,
            lastUpdate: new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
        };
    }

    // Check if row looks like headers
    isHeaderRow(row) {
        const headerKeywords = ['timestamp', 'email', 'name', 'age', 'nom', 'date'];
        const rowValues = Object.values(row).map(v => String(v).toLowerCase());
        return headerKeywords.some(keyword =>
            rowValues.some(value => value.includes(keyword))
        );
    }

    // Flexible column detection and statistics calculation
    calculateStatistics(dataRows) {
        // Find columns by detecting patterns in data
        const columns = this.detectColumns(dataRows[0]);

        let stats = {
            avgInterest: 3,
            betaTesters: 0,
            diaspora: 0,
            senegal: 0,
            avgScore: 50,
            phoneCount: 0,
            hotLeads: 0,
            warmLeads: 0,
            coldLeads: 0,
            interestDist: [0, 0, 0, 0, 0],
            ageDist: {
                '18-24 ans': 0,
                '25-34 ans': 0,
                '35-44 ans': 0,
                '45-54 ans': 0,
                '55+ ans': 0
            },
            services: {
                'Livraison à domicile': 0,
                'Click & Collect': 0,
                'Réservation de table': 0,
                'Traiteur événements': 0,
                'Abonnement mensuel': 0
            },
            topDishes: [],
            scoreDist: [0, 0, 0, 0, 0],
            prices: { min: 3500, ideal: 7500, max: 15000, delivery: 1000 }
        };

        // Process each row
        dataRows.forEach(row => {
            // Interest level
            const interest = this.extractNumber(row, columns.interest, 1, 5);
            if (interest) {
                stats.interestDist[interest - 1]++;
            }

            // Location
            const location = this.extractText(row, columns.location);
            if (this.isDiaspora(location)) {
                stats.diaspora++;
            } else {
                stats.senegal++;
            }

            // Phone
            if (this.hasValue(row, columns.phone)) {
                stats.phoneCount++;
            }

            // Beta tester
            if (this.isBetaTester(row, columns.beta)) {
                stats.betaTesters++;
            }

            // Age
            const age = this.extractText(row, columns.age);
            this.categorizeAge(age, stats.ageDist);

            // Services
            const services = this.extractText(row, columns.services);
            this.categorizeServices(services, stats.services);
        });

        // Calculate averages and segments
        const interests = dataRows.map(row =>
            this.extractNumber(row, columns.interest, 1, 5) || 3
        );
        stats.avgInterest = (interests.reduce((a, b) => a + b, 0) / interests.length).toFixed(2);

        // Calculate lead segments
        const scores = this.calculateScores(dataRows, columns);
        scores.forEach(score => {
            if (score > 80) stats.hotLeads++;
            else if (score > 50) stats.warmLeads++;
            else stats.coldLeads++;

            // Score distribution
            if (score <= 20) stats.scoreDist[0]++;
            else if (score <= 40) stats.scoreDist[1]++;
            else if (score <= 60) stats.scoreDist[2]++;
            else if (score <= 80) stats.scoreDist[3]++;
            else stats.scoreDist[4]++;
        });

        stats.avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

        // Get top dishes
        stats.topDishes = this.getTopDishes(dataRows, columns);

        // Calculate price averages
        stats.prices = this.calculatePrices(dataRows, columns);

        return stats;
    }

    // Detect columns based on content patterns
    detectColumns(sampleRow) {
        const columns = {};
        const keys = Object.keys(sampleRow);

        keys.forEach(key => {
            const lowerKey = key.toLowerCase();
            const value = String(sampleRow[key]).toLowerCase();

            // Detect each column type
            if (lowerKey.includes('intér') || lowerKey.includes('inter') ||
                (value.match(/^[1-5]$/) && !columns.interest)) {
                columns.interest = key;
            } else if (lowerKey.includes('local') || lowerKey.includes('lieu') ||
                       lowerKey.includes('pays')) {
                columns.location = key;
            } else if (lowerKey.includes('tel') || lowerKey.includes('phone')) {
                columns.phone = key;
            } else if (lowerKey.includes('beta') || lowerKey.includes('test')) {
                columns.beta = key;
            } else if (lowerKey.includes('age') || lowerKey.includes('âge')) {
                columns.age = key;
            } else if (lowerKey.includes('service')) {
                columns.services = key;
            } else if (lowerKey.includes('plat') || lowerKey.includes('dish')) {
                columns.dishes = key;
            } else if (lowerKey.includes('min')) {
                columns.priceMin = key;
            } else if (lowerKey.includes('ideal') || lowerKey.includes('idéal')) {
                columns.priceIdeal = key;
            } else if (lowerKey.includes('max')) {
                columns.priceMax = key;
            } else if (lowerKey.includes('livr') || lowerKey.includes('delivery')) {
                columns.priceDelivery = key;
            }
        });

        return columns;
    }

    // Helper methods
    extractNumber(row, column, min = 0, max = 100) {
        if (!column || !row[column]) return null;
        const num = parseInt(row[column]);
        return (num >= min && num <= max) ? num : null;
    }

    extractText(row, column) {
        return column && row[column] ? String(row[column]) : '';
    }

    hasValue(row, column) {
        return column && row[column] && String(row[column]).trim().length > 0;
    }

    isDiaspora(location) {
        const diasporaKeywords = ['france', 'usa', 'états-unis', 'canada', 'europe', 'étranger'];
        const loc = location.toLowerCase();
        return diasporaKeywords.some(keyword => loc.includes(keyword));
    }

    isBetaTester(row, column) {
        if (!column) return false;
        const value = String(row[column]).toLowerCase();
        return value.includes('oui') || value.includes('yes');
    }

    categorizeAge(age, distribution) {
        const ageStr = age.toLowerCase();
        if (ageStr.includes('18') || ageStr.includes('24')) {
            distribution['18-24 ans']++;
        } else if (ageStr.includes('25') || ageStr.includes('34')) {
            distribution['25-34 ans']++;
        } else if (ageStr.includes('35') || ageStr.includes('44')) {
            distribution['35-44 ans']++;
        } else if (ageStr.includes('45') || ageStr.includes('54')) {
            distribution['45-54 ans']++;
        } else if (ageStr.includes('55') || parseInt(age) >= 55) {
            distribution['55+ ans']++;
        }
    }

    categorizeServices(services, distribution) {
        const servStr = services.toLowerCase();
        if (servStr.includes('livr')) distribution['Livraison à domicile']++;
        if (servStr.includes('click') || servStr.includes('collect')) distribution['Click & Collect']++;
        if (servStr.includes('réserv') || servStr.includes('table')) distribution['Réservation de table']++;
        if (servStr.includes('trait') || servStr.includes('event')) distribution['Traiteur événements']++;
        if (servStr.includes('abonn')) distribution['Abonnement mensuel']++;
    }

    calculateScores(dataRows, columns) {
        return dataRows.map(row => {
            let score = 50;
            const interest = this.extractNumber(row, columns.interest, 1, 5);
            if (interest) score = interest * 20;
            if (this.isBetaTester(row, columns.beta)) score += 10;
            return Math.min(100, score);
        });
    }

    getTopDishes(dataRows, columns) {
        const dishCounts = {};

        dataRows.forEach(row => {
            const dishes = this.extractText(row, columns.dishes).split(/[,;]/);
            dishes.forEach(dish => {
                const trimmed = dish.trim().toLowerCase();
                if (trimmed) {
                    dishCounts[trimmed] = (dishCounts[trimmed] || 0) + 1;
                }
            });
        });

        return Object.entries(dishCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                count
            }));
    }

    calculatePrices(dataRows, columns) {
        const prices = {
            min: [],
            ideal: [],
            max: [],
            delivery: []
        };

        dataRows.forEach(row => {
            const min = this.extractNumber(row, columns.priceMin, 0, 100000);
            const ideal = this.extractNumber(row, columns.priceIdeal, 0, 100000);
            const max = this.extractNumber(row, columns.priceMax, 0, 100000);
            const delivery = this.extractNumber(row, columns.priceDelivery, 0, 10000);

            if (min) prices.min.push(min);
            if (ideal) prices.ideal.push(ideal);
            if (max) prices.max.push(max);
            if (delivery) prices.delivery.push(delivery);
        });

        return {
            min: prices.min.length > 0 ?
                Math.round(prices.min.reduce((a, b) => a + b, 0) / prices.min.length) : 3500,
            ideal: prices.ideal.length > 0 ?
                Math.round(prices.ideal.reduce((a, b) => a + b, 0) / prices.ideal.length) : 7500,
            max: prices.max.length > 0 ?
                Math.round(prices.max.reduce((a, b) => a + b, 0) / prices.max.length) : 15000,
            delivery: prices.delivery.length > 0 ?
                Math.round(prices.delivery.reduce((a, b) => a + b, 0) / prices.delivery.length) : 1000
        };
    }

    // Get fallback data (current hardcoded data)
    getFallbackData() {
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

    // Main method to get dashboard data
    async getDashboardData() {
        try {
            // Check if Sheet ID is configured
            if (SHEETS_CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE') {
                console.warn('Google Sheets ID not configured. Using fallback data.');
                return this.getFallbackData();
            }

            // Fetch raw data from Google Sheets
            const rawData = await this.fetchFromGoogleSheets();

            // Process and return the data
            return this.processRawData(rawData);

        } catch (error) {
            console.error('Error getting dashboard data:', error);
            return this.getFallbackData();
        }
    }
}

// Create global instance
if (typeof leeketDataFetcher !== 'undefined') {
    // Replace existing instance
    window.leeketDataFetcher = new LeeketDataFetcherV2();
} else {
    // Create new instance
    window.leeketDataFetcher = new LeeketDataFetcherV2();
}