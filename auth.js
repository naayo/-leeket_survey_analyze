// Authentication configuration
const AUTH_CONFIG = {
    users: {
        'amy': 'leeketdeamy',
        'coumba': 'leeketdecoumba',
        'amyb': 'leeketdemayb',
        'baila': 'leeketdebaila'
    },
    tokenExpiry: {
        normal: 60 * 60 * 1000, // 1 hour in milliseconds
        rememberMe: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    }
};

// Generate a simple token (in production, use a proper JWT library)
function generateToken(username) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return btoa(JSON.stringify({
        username: username,
        timestamp: timestamp,
        random: random
    }));
}

// Verify token validity
function verifyToken(token) {
    try {
        const decoded = JSON.parse(atob(token));
        const now = Date.now();
        const expiry = decoded.rememberMe ? AUTH_CONFIG.tokenExpiry.rememberMe : AUTH_CONFIG.tokenExpiry.normal;

        if (now - decoded.timestamp > expiry) {
            return null; // Token expired
        }

        return decoded;
    } catch (e) {
        return null; // Invalid token
    }
}

// Login function
function login(username, password, rememberMe = false) {
    // Normalize username to lowercase
    const normalizedUsername = username.toLowerCase().trim();

    // Check credentials
    if (AUTH_CONFIG.users[normalizedUsername] && AUTH_CONFIG.users[normalizedUsername] === password) {
        // Create session token
        const token = generateToken(normalizedUsername);

        // Store token and user info
        const sessionData = {
            token: token,
            username: normalizedUsername,
            timestamp: Date.now(),
            rememberMe: rememberMe
        };

        if (rememberMe) {
            // Use localStorage for persistent storage
            localStorage.setItem('leeketSession', JSON.stringify(sessionData));
        } else {
            // Use sessionStorage for session-only storage
            sessionStorage.setItem('leeketSession', JSON.stringify(sessionData));
        }

        return true;
    }

    return false;
}

// Logout function
function logout() {
    // Clear all storage
    localStorage.removeItem('leeketSession');
    sessionStorage.removeItem('leeketSession');

    // Redirect to login page
    window.location.href = 'index.html';
}

// Check if user is authenticated
function isAuthenticated() {
    // Check both storages
    let session = localStorage.getItem('leeketSession') || sessionStorage.getItem('leeketSession');

    if (!session) {
        return false;
    }

    try {
        const sessionData = JSON.parse(session);
        const decoded = verifyToken(sessionData.token);

        if (!decoded) {
            // Token expired or invalid
            logout();
            return false;
        }

        // Update token timestamp to extend session
        const now = Date.now();
        const expiry = sessionData.rememberMe ? AUTH_CONFIG.tokenExpiry.rememberMe : AUTH_CONFIG.tokenExpiry.normal;

        if (now - sessionData.timestamp > expiry) {
            logout();
            return false;
        }

        return true;
    } catch (e) {
        return false;
    }
}

// Get current user info
function getCurrentUser() {
    const session = localStorage.getItem('leeketSession') || sessionStorage.getItem('leeketSession');

    if (!session) {
        return null;
    }

    try {
        const sessionData = JSON.parse(session);
        return {
            username: sessionData.username,
            timestamp: sessionData.timestamp
        };
    } catch (e) {
        return null;
    }
}

// Check authentication on protected pages
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Initialize auth check for protected pages
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Check if this is a protected page (not the login page)
        if (window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
            requireAuth();
        }
    });
} else {
    // DOM is already loaded
    if (window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
        requireAuth();
    }
}