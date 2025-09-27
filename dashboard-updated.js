// Dashboard initialization with Google Sheets integration

// Global variable to store dashboard data
let dashboardData = null;
let dataSource = 'loading';
let chartsInitialized = false;

// Ensure we have the data fetcher instance
if (typeof leeketDataFetcher === 'undefined') {
    window.leeketDataFetcher = new LeeketDataFetcherV2();
}

// === AUTHENTICATION CHECK ===
window.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    if (!requireAuth()) {
        return; // User will be redirected to login
    }

    // Display current user
    const user = getCurrentUser();
    if (user) {
        document.getElementById('currentUser').textContent = user.username;
    }

    // Load data and initialize dashboard
    await loadDashboardData();
});

// Function to load data from Google Sheets or fallback
async function loadDashboardData() {
    showLoading(true);
    hideError();

    try {
        // Fetch data from Google Sheets
        dashboardData = await getDashboardData();

        // Check if we're using live data or fallback based on actual data source
        if (dashboardData._dataSource === 'live') {
            dataSource = 'live';
            updateDataSourceIndicator('live');
            console.log('✅ Using live data from Google Sheets');
        } else {
            dataSource = 'fallback';
            updateDataSourceIndicator('fallback');
            console.warn('⚠️ Using fallback data:', dashboardData._reason);
        }

        // Update the UI with new data
        updateUIWithData();

        // Initialize or update charts
        if (!chartsInitialized) {
            initializeDashboard();
            chartsInitialized = true;
        } else {
            updateCharts();
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showError('Impossible de charger les données. Utilisation des données de secours.');

        // Use fallback data
        const fallbackData = getFallbackData();
        fallbackData._dataSource = 'fallback';
        fallbackData._reason = 'Connection error';
        dashboardData = fallbackData;
        dataSource = 'fallback';
        updateDataSourceIndicator('fallback');

        updateUIWithData();

        if (!chartsInitialized) {
            initializeDashboard();
            chartsInitialized = true;
        } else {
            updateCharts();
        }
    } finally {
        showLoading(false);
    }
}

// Function to refresh data
async function refreshData() {
    await loadDashboardData();
}

// Function to show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// Function to show/hide error banner
function showError(message) {
    const banner = document.getElementById('errorBanner');
    const messageEl = document.getElementById('errorMessage');
    messageEl.textContent = message;
    banner.classList.add('show');
}

function hideError() {
    const banner = document.getElementById('errorBanner');
    banner.classList.remove('show');
}

// Function to update data source indicator
function updateDataSourceIndicator(source) {
    const indicator = document.getElementById('dataSourceIndicator');
    const text = document.getElementById('dataSourceText');

    if (source === 'live') {
        indicator.className = 'data-source-indicator live';
        text.innerHTML = '🟢 Source: Google Sheets (En direct)';
    } else {
        indicator.className = 'data-source-indicator fallback';
        text.innerHTML = '🟠 Source: Données locales (Mode hors-ligne)';
    }
}

// Function to update UI with data
function updateUIWithData() {
    if (!dashboardData) return;

    // Update stats cards - need to wait for DOM to be ready
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 4) {
        statCards[0].querySelector('.stat-value').textContent = dashboardData.totalRespondents;
        statCards[1].querySelector('.stat-value').textContent = dashboardData.avgInterest + '⭐';
        statCards[2].querySelector('.stat-value').textContent = dashboardData.betaTestersCount;
        statCards[3].querySelector('.stat-value').textContent = dashboardData.phoneCount + '📱';
    }

    // Update last update info
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        lastUpdateEl.textContent =
            `📅 ${dashboardData.totalRespondents} répondants • Mise à jour du ${dashboardData.lastUpdate}`;
    }
}

// Store chart instances globally for updates
let chartInstances = {};

// Function to update existing charts with new data
function updateCharts() {
    if (!dashboardData) return;

    // Update each chart's data
    if (chartInstances.segments) {
        chartInstances.segments.data.datasets[0].data = [
            dashboardData.hotLeads,
            dashboardData.warmLeads,
            dashboardData.coldLeads
        ];
        chartInstances.segments.update();
    }

    if (chartInstances.scores) {
        chartInstances.scores.data.datasets[0].data = dashboardData.scoreDistribution;
        chartInstances.scores.update();
    }

    if (chartInstances.users) {
        chartInstances.users.data.datasets[0].data = [
            dashboardData.diasporaCount,
            dashboardData.senegalCount
        ];
        chartInstances.users.update();
    }

    if (chartInstances.age) {
        chartInstances.age.data.datasets[0].data = Object.values(dashboardData.ageDistribution);
        chartInstances.age.update();
    }

    if (chartInstances.interest) {
        chartInstances.interest.data.datasets[0].data = dashboardData.interestDistribution;
        chartInstances.interest.update();
    }

    if (chartInstances.services) {
        chartInstances.services.data.datasets[0].data = Object.values(dashboardData.services);
        chartInstances.services.update();
    }

    if (chartInstances.plats) {
        chartInstances.plats.data.labels = dashboardData.topDishes.map(d => d.name);
        chartInstances.plats.data.datasets[0].data = dashboardData.topDishes.map(d => d.count);
        chartInstances.plats.update();
    }

    if (chartInstances.price) {
        chartInstances.price.data.datasets[0].data = [
            dashboardData.avgPriceMin,
            dashboardData.avgPriceIdeal,
            dashboardData.avgPriceMax
        ];
        chartInstances.price.update();
    }
}