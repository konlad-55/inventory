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

    const API_URL = "http://localhost:8080/api/items";
    const tableBody = document.getElementById("itemsTableBody");
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const refreshBtn = document.getElementById("refreshBtn");
    const messageBox = document.getElementById("messageBox");
    const connectionStatus = document.getElementById("connectionStatus");

    // Modal elements
    const editModal = document.getElementById("editModal");
    const deleteModal = document.getElementById("deleteModal");
    const editForm = document.getElementById("editForm");
    const closeButtons = document.querySelectorAll(".close");
    const cancelButtons = document.querySelectorAll(".cancel-btn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

    let allItems = [];
    let itemToDelete = null;

    // Format currency in Tanzanian Shillings
    function formatCurrency(value) {
        const numericValue = Number(value) || 0;
        return `Tsh ${numericValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    // Format number with commas
    function formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value);
    }

    // Show message
    function showMessage(message, type = 'info') {
        messageBox.textContent = message;
        messageBox.className = 'message-box ' + type;
        
        setTimeout(() => {
            messageBox.className = 'message-box';
        }, 5000);
    }

    // Notify other pages that data has changed
    function notifyDataChanged() {
        localStorage.setItem('inventoryDataChanged', Date.now().toString());
    }

    // Update connection status
    function updateConnectionStatus() {
        const isOnline = navigator.onLine;
        connectionStatus.textContent = isOnline ? 'Online' : 'Offline';
        connectionStatus.className = isOnline ? 'connection-status online' : 'connection-status offline';
    }

    // Fetch all items
    async function fetchItems() {
        try {
            refreshBtn.disabled = true;
            refreshBtn.textContent = "Loading...";
            tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Loading items...</td></tr>';

            const response = await fetch(API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            allItems = await response.json();
            filterAndRenderItems();
            
        } catch (error) {
            console.error("Error fetching items:", error);
            tableBody.innerHTML = '<tr><td colspan="7" class="no-data">Error loading items. Please check if backend is running.</td></tr>';
            showMessage("Error loading items", "error");
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = "Refresh";
        }
    }

    // Filter and render items
    function filterAndRenderItems() {
        const searchTerm = searchInput.value.toLowerCase();
        const categoryValue = categoryFilter.value;

        const filteredItems = allItems.filter(item => {
            const matchesSearch = item.itemName.toLowerCase().includes(searchTerm) || 
                                 item.itemCode.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryValue || item.category === categoryValue;
            return matchesSearch && matchesCategory;
        });

        renderItems(filteredItems);
    }

    // Render items table
    function renderItems(items) {
        if (items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="no-data">No items found. Add items to see them here.</td></tr>';
            return;
        }

        tableBody.innerHTML = "";
        
        items.forEach(item => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${item.itemCode}</strong></td>
                <td>${item.itemName}</td>
                <td><span class="category-badge">${item.category}</span></td>
                <td>${formatNumber(item.quantity)}</td>
                <td>${formatCurrency(item.buyingPrice)}</td>
                <td>${formatCurrency(item.sellingPrice)}</td>
                <td>
                    <button class="action-btn edit-btn" data-id="${item.id}">Edit</button>
                    <button class="action-btn delete-btn" data-id="${item.id}">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openDeleteModal(e.target.dataset.id));
        });
    }

    // Open edit modal
    function openEditModal(itemId) {
        const item = allItems.find(i => i.id == itemId);
        if (!item) return;

        document.getElementById("editItemId").value = item.id;
        document.getElementById("editItemCode").value = item.itemCode;
        document.getElementById("editItemName").value = item.itemName;
        document.getElementById("editCategory").value = item.category;
        document.getElementById("editQuantity").value = item.quantity;
        document.getElementById("editBuyingPrice").value = item.buyingPrice;
        document.getElementById("editSellingPrice").value = item.sellingPrice;

        editModal.style.display = "block";
    }

    // Open delete modal
    function openDeleteModal(itemId) {
        const item = allItems.find(i => i.id == itemId);
        if (!item) return;

        itemToDelete = itemId;
        document.getElementById("deleteItemName").textContent = `${item.itemCode} - ${item.itemName}`;
        deleteModal.style.display = "block";
    }

    // Close modals
    function closeModals() {
        editModal.style.display = "none";
        deleteModal.style.display = "none";
        itemToDelete = null;
    }

    // Handle edit form submission
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const itemId = document.getElementById("editItemId").value;
        const itemData = {
            itemName: document.getElementById("editItemName").value.trim(),
            category: document.getElementById("editCategory").value,
            quantity: parseInt(document.getElementById("editQuantity").value),
            buyingPrice: parseFloat(document.getElementById("editBuyingPrice").value),
            sellingPrice: parseFloat(document.getElementById("editSellingPrice").value)
        };

        // Validation
        if (!itemData.itemName || itemData.itemName.length < 2) {
            showMessage("Item name must be at least 2 characters long", "error");
            return;
        }

        if (!itemData.category) {
            showMessage("Please select a category", "error");
            return;
        }

        if (itemData.quantity < 1 || isNaN(itemData.quantity)) {
            showMessage("Quantity must be at least 1", "error");
            return;
        }

        if (itemData.buyingPrice < 0 || isNaN(itemData.buyingPrice)) {
            showMessage("Buying price must be a valid positive number", "error");
            return;
        }

        if (itemData.sellingPrice < 0 || isNaN(itemData.sellingPrice)) {
            showMessage("Selling price must be a valid positive number", "error");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${itemId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(itemData)
            });

            if (response.ok) {
                showMessage("Item updated successfully!", "success");
                closeModals();
                fetchItems(); // Refresh the table
                notifyDataChanged(); // Notify other pages
            } else {
                showMessage("Error updating item. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error:", error);
            showMessage("Backend not reachable. Please check connection.", "error");
        }
    });

    // Handle delete confirmation
    confirmDeleteBtn.addEventListener("click", async () => {
        if (!itemToDelete) return;

        try {
            const response = await fetch(`${API_URL}/${itemToDelete}`, {
                method: "DELETE"
            });

            if (response.ok) {
                showMessage("Item deleted successfully!", "success");
                closeModals();
                fetchItems(); // Refresh the table
            } else {
                showMessage("Error deleting item. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error:", error);
            showMessage("Backend not reachable. Please check connection.", "error");
        }
    });

    // Event listeners for modals
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    cancelButtons.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    window.addEventListener('click', (e) => {
        if (e.target === editModal || e.target === deleteModal) {
            closeModals();
        }
    });

    // Search and filter event listeners
    searchInput.addEventListener('input', filterAndRenderItems);
    categoryFilter.addEventListener('change', filterAndRenderItems);
    refreshBtn.addEventListener('click', fetchItems);

    // Connection status monitoring
    window.addEventListener('online', () => {
        updateConnectionStatus();
        fetchItems();
    });
    window.addEventListener('offline', updateConnectionStatus);

    // Listen for data changes from other pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'inventoryDataChanged') {
            fetchItems();
        }
    });

    // Initial load
    updateConnectionStatus();
    fetchItems();

    // Auto-refresh every 30 seconds for real-time updates
    setInterval(fetchItems, 30000);

    // Handle visibility change - refresh when tab becomes visible
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            fetchItems();
        }
    });
});