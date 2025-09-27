/**
 * Leeket Survey Data Processor v2
 * Robust data processing with intelligent column mapping
 */

class LeeketDataProcessor {
    constructor() {
        // Define all possible column name variations
        this.columnMappings = {
            location: [
                'Pays (Diaspora, Local)',
                'Pays (Diaspora',
                'Statut',
                'Type Utilisateur',
                'Quartier/Zone',
                'Zone',
                'Localisation',
                'Location'
            ],
            betaTester: [
                'Beta testeur',
                'Beta Testeur',
                'Testeur Beta',
                'Beta',
                'Testeur'
            ],
            phone: [
                'Téléphone',
                'Telephone',
                'Phone',
                'Tel',
                'Numéro'
            ],
            email: [
                'Email',
                'E-mail',
                'Mail',
                'Courriel'
            ],
            interest: [
                'Intérêt (1-5)',
                'Intérêt',
                'Interest',
                'Niveau intérêt',
                'Note'
            ],
            age: [
                "Tranche d'âge",
                'Tranche d\'âge',
                'Age',
                'Âge',
                'Groupe âge'
            ],
            dishes: [
                'Plats sénégalais préférés',
                'Plats préférés',
                'Plats',
                'Dishes',
                'Préférences culinaires'
            ],
            services: [
                'Services Souhaités',
                'Service préféré',
                'Services',
                'Service'
            ],
            priceMin: [
                'Prix min',
                'Prix minimum',
                'Prix Min',
                'Budget min'
            ],
            priceIdeal: [
                'Prix idéal',
                'Prix ideal',
                'Budget idéal'
            ],
            priceMax: [
                'Prix max acceptable',
                'Prix max',
                'Prix maximum',
                'Budget max'
            ],
            deliveryPrice: [
                'Prix livraison max',
                'Frais livraison',
                'Prix livraison',
                'Livraison'
            ],
            name: [
                'Prénom',
                'Nom',
                'Name'
            ]
        };

        // Keywords for diaspora detection
        this.diasporaKeywords = [
            'diaspora',
            'france',
            'états-unis',
            'etats-unis',
            'usa',
            'canada',
            'belgique',
            'suisse',
            'europe',
            'étranger',
            'expatrié',
            'italie',
            'espagne',
            'allemagne',
            'angleterre',
            'uk',
            'maroc',
            'côte d\'ivoire',
            'gabon',
            'dubai',
            'arabie'
        ];

        // Keywords for Senegal/Local detection
        this.localKeywords = [
            'local',
            'sénégal',
            'senegal',
            'dakar',
            'pikine',
            'rufisque',
            'thiès',
            'thies',
            'kaolack',
            'saint-louis',
            'ziguinchor',
            'touba',
            'mbour',
            'diourbel'
        ];
    }

    /**
     * Find the actual column name in the data that matches our mapping
     */
    findColumn(headers, mappingKey) {
        const possibleNames = this.columnMappings[mappingKey] || [];

        for (const possibleName of possibleNames) {
            // Try exact match first
            if (headers.includes(possibleName)) {
                console.log(`✅ Found exact match for ${mappingKey}: "${possibleName}"`);
                return possibleName;
            }

            // Try case-insensitive partial match
            const found = headers.find(header =>
                header.toLowerCase().includes(possibleName.toLowerCase())
            );

            if (found) {
                console.log(`✅ Found partial match for ${mappingKey}: "${found}"`);
                return found;
            }
        }

        console.warn(`⚠️ No column found for ${mappingKey}`);
        return null;
    }

    /**
     * Safely get value from row
     */
    getValue(row, columnName) {
        if (!columnName || !row) return null;
        const value = row[columnName];
        return value !== undefined && value !== null ? String(value).trim() : '';
    }

    /**
     * Determine if user is diaspora or local based on location field
     */
    categorizeLocation(locationValue) {
        if (!locationValue || locationValue === '') {
            return 'unknown';
        }

        const lowerValue = locationValue.toLowerCase();

        // Check for explicit diaspora keywords
        for (const keyword of this.diasporaKeywords) {
            if (lowerValue.includes(keyword)) {
                return 'diaspora';
            }
        }

        // Check for explicit local keywords
        for (const keyword of this.localKeywords) {
            if (lowerValue.includes(keyword)) {
                return 'local';
            }
        }

        // If no match, default to local (most respondents in Senegal)
        return 'local';
    }

    /**
     * Process survey data with intelligent mapping
     */
    processSurveyData(rawData) {
        console.log('🔄 Processing survey data...');

        if (!rawData || rawData.length === 0) {
            console.error('❌ No data to process');
            return this.getEmptyDataStructure();
        }

        // Get headers from first row
        const headers = Object.keys(rawData[0]);
        console.log('📋 Headers found:', headers.length, 'columns');

        // Find actual column names
        const columns = {
            location: this.findColumn(headers, 'location'),
            betaTester: this.findColumn(headers, 'betaTester'),
            phone: this.findColumn(headers, 'phone'),
            email: this.findColumn(headers, 'email'),
            interest: this.findColumn(headers, 'interest'),
            age: this.findColumn(headers, 'age'),
            dishes: this.findColumn(headers, 'dishes'),
            services: this.findColumn(headers, 'services'),
            priceMin: this.findColumn(headers, 'priceMin'),
            priceIdeal: this.findColumn(headers, 'priceIdeal'),
            priceMax: this.findColumn(headers, 'priceMax'),
            deliveryPrice: this.findColumn(headers, 'deliveryPrice'),
            name: this.findColumn(headers, 'name')
        };

        // Initialize counters
        const stats = {
            total: rawData.length,
            diaspora: 0,
            local: 0,
            unknown: 0,
            betaTesters: 0,
            withPhone: 0,
            withEmail: 0,
            interests: [],
            scores: [],
            ageGroups: {
                '18-24 ans': 0,
                '25-34 ans': 0,
                '35-44 ans': 0,
                '45-54 ans': 0,
                '55+ ans': 0
            },
            services: {},
            dishes: {},
            prices: {
                min: [],
                ideal: [],
                max: [],
                delivery: []
            }
        };

        // Process each row
        rawData.forEach((row, index) => {
            // Location categorization
            const locationValue = this.getValue(row, columns.location);
            const category = this.categorizeLocation(locationValue);

            if (category === 'diaspora') {
                stats.diaspora++;
            } else if (category === 'local') {
                stats.local++;
            } else {
                stats.unknown++;
            }

            // Beta tester
            const betaValue = this.getValue(row, columns.betaTester);
            if (betaValue && (betaValue.toLowerCase().includes('oui') || betaValue.toLowerCase() === 'yes')) {
                stats.betaTesters++;
            }

            // Contact info
            const phoneValue = this.getValue(row, columns.phone);
            if (phoneValue && phoneValue.length > 5) {
                stats.withPhone++;
            }

            const emailValue = this.getValue(row, columns.email);
            if (emailValue && emailValue.includes('@')) {
                stats.withEmail++;
            }

            // Interest level
            const interestValue = this.getValue(row, columns.interest);
            if (interestValue) {
                const interestNum = parseInt(interestValue);
                if (interestNum >= 1 && interestNum <= 5) {
                    stats.interests.push(interestNum);
                }
            }

            // Age group
            const ageValue = this.getValue(row, columns.age);
            if (ageValue) {
                this.categorizeAge(ageValue, stats.ageGroups);
            }

            // Services
            const servicesValue = this.getValue(row, columns.services);
            if (servicesValue) {
                this.extractServices(servicesValue, stats.services);
            }

            // Dishes
            const dishesValue = this.getValue(row, columns.dishes);
            if (dishesValue) {
                this.extractDishes(dishesValue, stats.dishes);
            }

            // Prices
            const priceMinValue = this.getValue(row, columns.priceMin);
            if (priceMinValue) {
                const price = this.parsePrice(priceMinValue);
                if (price > 0) stats.prices.min.push(price);
            }

            const priceIdealValue = this.getValue(row, columns.priceIdeal);
            if (priceIdealValue) {
                const price = this.parsePrice(priceIdealValue);
                if (price > 0) stats.prices.ideal.push(price);
            }

            const priceMaxValue = this.getValue(row, columns.priceMax);
            if (priceMaxValue) {
                const price = this.parsePrice(priceMaxValue);
                if (price > 0) stats.prices.max.push(price);
            }

            const deliveryPriceValue = this.getValue(row, columns.deliveryPrice);
            if (deliveryPriceValue) {
                const price = this.parsePrice(deliveryPriceValue);
                if (price > 0) stats.prices.delivery.push(price);
            }

            // Calculate score for this respondent
            let score = 50; // Base score
            if (stats.interests.length > 0) {
                const lastInterest = stats.interests[stats.interests.length - 1];
                score = lastInterest * 20;
            }
            if (betaValue && betaValue.toLowerCase().includes('oui')) {
                score += 10;
            }
            stats.scores.push(Math.min(100, score));
        });

        // Log results for debugging
        console.log('📊 Processing Results:');
        console.log(`Total: ${stats.total}`);
        console.log(`Diaspora: ${stats.diaspora} (${Math.round(stats.diaspora / stats.total * 100)}%)`);
        console.log(`Local: ${stats.local} (${Math.round(stats.local / stats.total * 100)}%)`);
        console.log(`Unknown: ${stats.unknown}`);
        console.log(`Beta Testers: ${stats.betaTesters}`);
        console.log(`With Phone: ${stats.withPhone}`);

        // Convert to dashboard format
        return this.formatForDashboard(stats);
    }

    /**
     * Categorize age into groups
     */
    categorizeAge(ageValue, ageGroups) {
        const lower = ageValue.toLowerCase();

        if (lower.includes('18') || lower.includes('24') || lower.includes('18-24')) {
            ageGroups['18-24 ans']++;
        } else if (lower.includes('25') || lower.includes('34') || lower.includes('25-34')) {
            ageGroups['25-34 ans']++;
        } else if (lower.includes('35') || lower.includes('44') || lower.includes('35-44')) {
            ageGroups['35-44 ans']++;
        } else if (lower.includes('45') || lower.includes('54') || lower.includes('45-54')) {
            ageGroups['45-54 ans']++;
        } else if (lower.includes('55') || lower.includes('+') || lower.includes('plus')) {
            ageGroups['55+ ans']++;
        } else {
            // Try to parse as number
            const num = parseInt(ageValue);
            if (num >= 18 && num <= 24) ageGroups['18-24 ans']++;
            else if (num >= 25 && num <= 34) ageGroups['25-34 ans']++;
            else if (num >= 35 && num <= 44) ageGroups['35-44 ans']++;
            else if (num >= 45 && num <= 54) ageGroups['45-54 ans']++;
            else if (num >= 55) ageGroups['55+ ans']++;
        }
    }

    /**
     * Extract services from text
     */
    extractServices(servicesText, servicesCount) {
        const commonServices = [
            'livraison',
            'click & collect',
            'réservation',
            'traiteur',
            'abonnement'
        ];

        const lower = servicesText.toLowerCase();
        commonServices.forEach(service => {
            if (lower.includes(service)) {
                servicesCount[service] = (servicesCount[service] || 0) + 1;
            }
        });
    }

    /**
     * Extract dishes from text
     */
    extractDishes(dishesText, dishesCount) {
        const dishes = dishesText.split(/[,;]/);
        dishes.forEach(dish => {
            const cleaned = dish.trim().toLowerCase();
            if (cleaned && cleaned.length > 2) {
                dishesCount[cleaned] = (dishesCount[cleaned] || 0) + 1;
            }
        });
    }

    /**
     * Parse price value
     */
    parsePrice(priceText) {
        // Remove non-numeric characters except comma and period
        const cleaned = priceText.replace(/[^\d,.-]/g, '');
        // Replace comma with period for decimal
        const normalized = cleaned.replace(',', '.');
        const num = parseFloat(normalized);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Calculate average safely
     */
    average(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    /**
     * Format data for dashboard
     */
    formatForDashboard(stats) {
        // Calculate distributions
        const interestDistribution = [0, 0, 0, 0, 0];
        stats.interests.forEach(level => {
            if (level >= 1 && level <= 5) {
                interestDistribution[level - 1]++;
            }
        });

        // Score distribution
        const scoreDistribution = [0, 0, 0, 0, 0];
        let hotLeads = 0, warmLeads = 0, coldLeads = 0;

        stats.scores.forEach(score => {
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
        const topDishes = Object.entries(stats.dishes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                count
            }));

        // Services summary
        const services = {
            'Livraison à domicile': stats.services.livraison || 0,
            'Click & Collect': stats.services['click & collect'] || 0,
            'Réservation de table': stats.services.réservation || 0,
            'Traiteur événements': stats.services.traiteur || 0,
            'Abonnement mensuel': stats.services.abonnement || 0
        };

        return {
            totalRespondents: stats.total,
            diasporaCount: stats.diaspora,
            senegalCount: stats.local,
            unknownCount: stats.unknown,
            betaTestersCount: stats.betaTesters,
            phoneCount: stats.withPhone,
            avgInterest: stats.interests.length > 0
                ? (this.average(stats.interests)).toFixed(2)
                : '3.0',
            avgScore: stats.scores.length > 0
                ? (this.average(stats.scores)).toFixed(1)
                : '50.0',
            hotLeads,
            warmLeads,
            coldLeads,
            interestDistribution,
            ageDistribution: stats.ageGroups,
            services,
            topDishes,
            scoreDistribution,
            avgPriceMin: Math.round(this.average(stats.prices.min)) || 3500,
            avgPriceIdeal: Math.round(this.average(stats.prices.ideal)) || 7500,
            avgPriceMax: Math.round(this.average(stats.prices.max)) || 15000,
            avgDeliveryPrice: Math.round(this.average(stats.prices.delivery)) || 1000,
            lastUpdate: new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
        };
    }

    /**
     * Get empty data structure
     */
    getEmptyDataStructure() {
        return {
            totalRespondents: 0,
            diasporaCount: 0,
            senegalCount: 0,
            unknownCount: 0,
            betaTestersCount: 0,
            phoneCount: 0,
            avgInterest: '0',
            avgScore: '0',
            hotLeads: 0,
            warmLeads: 0,
            coldLeads: 0,
            interestDistribution: [0, 0, 0, 0, 0],
            ageDistribution: {
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
            scoreDistribution: [0, 0, 0, 0, 0],
            avgPriceMin: 0,
            avgPriceIdeal: 0,
            avgPriceMax: 0,
            avgDeliveryPrice: 0,
            lastUpdate: new Date().toLocaleDateString('fr-FR')
        };
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.LeeketDataProcessor = LeeketDataProcessor;
}