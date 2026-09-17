document.addEventListener("DOMContentLoaded", () => {
    // Check authentication
    if (!Auth.protectRoute()) {
        return;
    }

    // Set up auto-logout
    Auth.setupInactivityTimer(() => {
        console.log("Auto-logout due to inactivity");
    });

    // Update user info
    const username = Auth.getUsername();
    if (username) {
        document.getElementById("currentUser").textContent = `Welcome, ${username}`;
    }

    // Setup logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to logout?")) {
                Auth.logout();
            }
        });
    }

   const API_URL = "https://inventory-production-f5f7.up.railway.app/api/items/summary";
    const tableBody = document.getElementById("summaryTableBody");
    const lastUpdatedElement = document.getElementById("lastUpdated");
    const refreshBtn = document.getElementById("refreshBtn");
    
    // Stats elements
    const totalCategoriesElement = document.getElementById("totalCategories");
    const totalItemsElement = document.getElementById("totalItems");
    const totalQuantityElement = document.getElementById("totalQuantity");
    const totalValueElement = document.getElementById("totalValue");

    // Format currency in Tanzanian Shillings
    function formatCurrency(value) {
        // Handle both string and number values
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return `Tsh ${Number(numValue || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    // Format number with commas
    function formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value);
    }

    // Update last updated timestamp
    function updateLastUpdated() {
        const now = new Date();
        lastUpdatedElement.textContent = `Last updated: ${now.toLocaleTimeString()}`;
    }

    // Fetch and display data
    async function fetchDashboardData() {
        try {
            refreshBtn.disabled = true;
            refreshBtn.textContent = "Loading...";
            tableBody.innerHTML = '<tr><td colspan="4" class="no-data">Loading data...</td></tr>';

            const response = await fetch(API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No data available. Add items to see summary.</td></tr>';
                updateStats(0, 0, 0, 0);
            } else {
                renderTable(data);
                updateStats(data);
            }
            
            updateLastUpdated();
            
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            tableBody.innerHTML = '<tr><td colspan="4" class="no-data">Error loading data. Please check if backend is running.</td></tr>';
            updateStats(0, 0, 0, 0);
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = "Refresh";
        }
    }

    // Render table with data
    function renderTable(data) {
        tableBody.innerHTML = "";
        
        data.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.category}</td>
                <td>${formatNumber(row.totalItems)}</td>
                <td>${formatNumber(row.totalQuantity)}</td>
                <td>${formatCurrency(row.totalValue)}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Update statistics cards
    function updateStats(data) {
        if (data === 0) {
            totalCategoriesElement.textContent = "0";
            totalItemsElement.textContent = "0";
            totalQuantityElement.textContent = "0";
            totalValueElement.textContent = "Tsh 0.00";
            return;
        }

        const totalCategories = data.length;
        const totalItems = data.reduce((sum, row) => sum + row.totalItems, 0);
        const totalQuantity = data.reduce((sum, row) => sum + row.totalQuantity, 0);
        const totalValue = data.reduce((sum, row) => {
            const value = typeof row.totalValue === 'string' ? parseFloat(row.totalValue) : row.totalValue;
            return sum + value;
        }, 0);

        totalCategoriesElement.textContent = formatNumber(totalCategories);
        totalItemsElement.textContent = formatNumber(totalItems);
        totalQuantityElement.textContent = formatNumber(totalQuantity);
        totalValueElement.textContent = formatCurrency(totalValue);
    }

    // Refresh button click handler
    refreshBtn.addEventListener("click", fetchDashboardData);

    // Initial data fetch
    fetchDashboardData();

    // Auto-refresh every 5 seconds for real-time updates
    setInterval(fetchDashboardData, 3600);

    // Handle visibility change - refresh when tab becomes visible
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            fetchDashboardData();
        }
    });

    // Handle online/offline status
    function updateConnectionStatus() {
        if (navigator.onLine) {
            fetchDashboardData();
        }
    }

    window.addEventListener('online', updateConnectionStatus);

    // Listen for data changes from other pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'inventoryDataChanged' || e.key === 'orderSubmitted') {
            fetchDashboardData();
        }
    });
});
