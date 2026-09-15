// Authentication utility functions

const Auth = {
    // Get authentication data from localStorage or sessionStorage
    getAuthData() {
        const localAuth = localStorage.getItem("authData");
        const sessionAuth = sessionStorage.getItem("authData");
        
        if (localAuth) {
            return JSON.parse(localAuth);
        } else if (sessionAuth) {
            return JSON.parse(sessionAuth);
        }
        return null;
    },

    // Check if user is authenticated
    isAuthenticated() {
        const authData = this.getAuthData();
        if (!authData) return false;
        
        // Check if token is still valid
        if (authData.expiresAt && Date.now() >= authData.expiresAt) {
            this.logout();
            return false;
        }
        
        return true;
    },

    // Get JWT token
    getToken() {
        const authData = this.getAuthData();
        return authData ? authData.token : null;
    },

    // Get current username
    getUsername() {
        const authData = this.getAuthData();
        return authData ? authData.username : null;
    },

    // Logout user
    logout() {
        localStorage.removeItem("authData");
        sessionStorage.removeItem("authData");
        window.location.href = "login.html";
    },

    // Make authenticated API request
    async authenticatedFetch(url, options = {}) {
        const token = this.getToken();
        
        if (!token) {
            this.logout();
            throw new Error("Not authenticated");
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Handle 401 Unauthorized
            if (response.status === 401) {
                this.logout();
                throw new Error("Session expired");
            }

            return response;
        } catch (error) {
            console.error("Authenticated fetch error:", error);
            throw error;
        }
    },

    // Protect route - redirect to login if not authenticated
    protectRoute() {
        if (!this.isAuthenticated()) {
            window.location.href = "login.html";
            return false;
        }
        return true;
    },

    // Auto-logout after inactivity
    setupInactivityTimer(callback, timeout = 30 * 60 * 1000) {
        let inactivityTimer;
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                this.logout();
                if (callback) callback();
            }, timeout);
        };

        // Set up event listeners
        document.addEventListener("mousemove", resetTimer);
        document.addEventListener("keypress", resetTimer);
        document.addEventListener("click", resetTimer);
        document.addEventListener("scroll", resetTimer);

        // Initial timer setup
        resetTimer();

        // Return cleanup function
        return () => {
            clearTimeout(inactivityTimer);
            document.removeEventListener("mousemove", resetTimer);
            document.removeEventListener("keypress", resetTimer);
            document.removeEventListener("click", resetTimer);
            document.removeEventListener("scroll", resetTimer);
        };
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}