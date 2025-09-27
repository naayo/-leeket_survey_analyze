// Data Fetcher Module for Google Sheets Integration

class LeeketDataFetcher {
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

    // Parse Google Sheets JSON response
    parseGoogleSheetsJSON(jsonString) {
        try {
            // Remove the Google Sheets JSON wrapper
            const match = jsonString.match(/google\.visualization\.Query\.setResponse\((.*)\);?$/);
            if (match && match[1]) {
                const data = JSON.parse(match[1]);
                return this.extractDataFromGoogleFormat(data);
            }
            return null;
        } catch (error) {
            console.error('Error parsing Google Sheets JSON:', error);
            return null;
        }
    }

    // Extract data from Google's visualization format
    extractDataFromGoogleFormat(data) {
        if (!data.table || !data.table.rows) return [];

        const rows = data.table.rows;
        const cols = data.table.cols;

        // Get headers from first row or column labels
        const headers = cols.map(col => col.label || '');

        // Convert rows to objects
        const result = rows.map(row => {
            const obj = {};
            row.c.forEach((cell, index) => {
                const value = cell ? (cell.v !== null ? cell.v : '') : '';
                obj[headers[index] || `col${index}`] = value;
            });
            return obj;
        });

        return result;
    }

    // Fetch data from Google Sheets
    async fetchFromGoogleSheets() {
        if (this.isCacheValid()) {
            return this.cache;
        }

        if (this.isLoading) {
            // Wait for ongoing fetch to complete
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
            const url = getPublicJSONURL();
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const jsonText = await response.text();
            const data = this.parseGoogleSheetsJSON(jsonText);

            if (data) {
                this.cache = data;
                this.cacheTimestamp = Date.now();
                return data;
            }

            // Fallback to alternative method if JSON parse fails
            return await this.fetchUsingAlternativeMethod();

        } catch (error) {
            console.error('Error fetching from Google Sheets:', error);

            // Try alternative fetch method
            try {
                return await this.fetchUsingAlternativeMethod();
            } catch (fallbackError) {
                console.error('Fallback fetch also failed:', fallbackError);
                return this.getFallbackData();
            }
        } finally {
            this.isLoading = false;
        }
    }

    // Alternative fetch method using CORS proxy
    async fetchUsingAlternativeMethod() {
        const sheetId = SHEETS_CONFIG.SHEET_ID;
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

        // Use CORS proxy for development
        const corsProxy = 'https://cors-anywhere.herokuapp.com/';
        const proxiedUrl = corsProxy + url;

        try {
            const response = await fetch(proxiedUrl, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const jsonText = await response.text();
            const data = this.parseGoogleSheetsJSON(jsonText);

            if (data) {
                this.cache = data;
                this.cacheTimestamp = Date.now();
                return data;
            }
        } catch (error) {
            console.error('Alternative fetch method failed:', error);
            throw error;
        }
    }

    // Process raw data into dashboard format
    processRawData(rawData) {
        if (!rawData || rawData.length === 0) {
            return this.getFallbackData();
        }

        // Skip header row if present
        const dataRows = rawData[0]['Timestamp'] ? rawData : rawData.slice(1);

        // Calculate statistics
        const totalRespondents = dataRows.length;

        // Interest levels
        const interestLevels = dataRows.map(row => parseInt(row['Niveau d\'intérêt'] || row['Interest'] || 3));
        const avgInterest = interestLevels.reduce((a, b) => a + b, 0) / interestLevels.length;

        // Interest distribution
        const interestDistribution = [0, 0, 0, 0, 0];
        interestLevels.forEach(level => {
            if (level >= 1 && level <= 5) {
                interestDistribution[level - 1]++;
            }
        });

        // Location analysis
        const locations = dataRows.map(row => row['Localisation'] || row['Location'] || '');
        const diasporaKeywords = ['france', 'usa', 'états-unis', 'canada', 'europe', 'étranger'];
        const diasporaCount = locations.filter(loc =>
            diasporaKeywords.some(keyword => loc.toLowerCase().includes(keyword))
        ).length;
        const senegalCount = totalRespondents - diasporaCount;

        // Age distribution
        const ageGroups = {
            '18-24 ans': 0,
            '25-34 ans': 0,
            '35-44 ans': 0,
            '45-54 ans': 0,
            '55+ ans': 0
        };

        dataRows.forEach(row => {
            const age = row['Âge'] || row['Age'] || '25-34 ans';
            if (ageGroups.hasOwnProperty(age)) {
                ageGroups[age]++;
            }
        });

        // Beta testers
        const betaTesters = dataRows.filter(row =>
            (row['Beta Tester'] || row['Souhaitez-vous être bêta-testeur'] || '').toLowerCase().includes('oui')
        ).length;

        // Services preferences
        const services = {
            'Livraison à domicile': 0,
            'Click & Collect': 0,
            'Réservation de table': 0,
            'Traiteur événements': 0,
            'Abonnement mensuel': 0
        };

        dataRows.forEach(row => {
            const serviceList = (row['Services souhaités'] || row['Services'] || '').split(',');
            serviceList.forEach(service => {
                const trimmed = service.trim();
                Object.keys(services).forEach(key => {
                    if (trimmed.toLowerCase().includes(key.toLowerCase().substring(0, 10))) {
                        services[key]++;
                    }
                });
            });
        });

        // Top dishes
        const dishCounts = {};
        dataRows.forEach(row => {
            const dishes = (row['Plats préférés'] || row['Dishes'] || '').split(',');
            dishes.forEach(dish => {
                const trimmed = dish.trim().toLowerCase();
                if (trimmed) {
                    dishCounts[trimmed] = (dishCounts[trimmed] || 0) + 1;
                }
            });
        });

        const topDishes = Object.entries(dishCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }));

        // Price analysis
        const prices = {
            min: dataRows.map(row => parseInt(row['Prix minimum'] || 0)).filter(p => p > 0),
            ideal: dataRows.map(row => parseInt(row['Prix idéal'] || 0)).filter(p => p > 0),
            max: dataRows.map(row => parseInt(row['Prix maximum'] || 0)).filter(p => p > 0),
            delivery: dataRows.map(row => parseInt(row['Prix livraison'] || 0)).filter(p => p > 0)
        };

        const avgPrices = {
            min: prices.min.length > 0 ? prices.min.reduce((a, b) => a + b, 0) / prices.min.length : 3500,
            ideal: prices.ideal.length > 0 ? prices.ideal.reduce((a, b) => a + b, 0) / prices.ideal.length : 7500,
            max: prices.max.length > 0 ? prices.max.reduce((a, b) => a + b, 0) / prices.max.length : 15000,
            delivery: prices.delivery.length > 0 ? prices.delivery.reduce((a, b) => a + b, 0) / prices.delivery.length : 1000
        };

        // Score calculation (simplified)
        const scores = dataRows.map(row => {
            const interest = parseInt(row['Niveau d\'intérêt'] || 3);
            const isBetaTester = (row['Beta Tester'] || '').toLowerCase().includes('oui');
            const frequency = row['Fréquence de commande'] || '';

            let score = interest * 20;
            if (isBetaTester) score += 10;
            if (frequency.includes('Plusieurs fois par semaine')) score += 10;
            else if (frequency.includes('Une fois par semaine')) score += 5;

            return Math.min(100, score);
        });

        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Score distribution
        const scoreRanges = [0, 0, 0, 0, 0];
        scores.forEach(score => {
            if (score <= 20) scoreRanges[0]++;
            else if (score <= 40) scoreRanges[1]++;
            else if (score <= 60) scoreRanges[2]++;
            else if (score <= 80) scoreRanges[3]++;
            else scoreRanges[4]++;
        });

        // Segment prospects
        const hotLeads = scores.filter(s => s > 80).length;
        const warmLeads = scores.filter(s => s > 50 && s <= 80).length;
        const coldLeads = scores.filter(s => s <= 50).length;

        return {
            totalRespondents,
            avgInterest: avgInterest.toFixed(2),
            betaTestersCount: betaTesters,
            diasporaCount,
            senegalCount,
            avgScore: avgScore.toFixed(1),
            phoneCount: dataRows.filter(row => row['Téléphone'] || row['Phone']).length,
            hotLeads,
            warmLeads,
            coldLeads,
            interestDistribution,
            ageDistribution: ageGroups,
            services,
            topDishes,
            scoreDistribution: scoreRanges,
            avgPriceMin: Math.round(avgPrices.min),
            avgPriceIdeal: Math.round(avgPrices.ideal),
            avgPriceMax: Math.round(avgPrices.max),
            avgDeliveryPrice: Math.round(avgPrices.delivery),
            lastUpdate: new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
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
const leeketDataFetcher = new LeeketDataFetcher();