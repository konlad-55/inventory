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

    const API_URL = "http://localhost:8080/api/orders";
    const ordersTableBody = document.getElementById("ordersTableBody");
    const messageBox = document.getElementById("messageBox");
    const connectionStatus = document.getElementById("connectionStatus");
    
    // Filter elements
    const statusFilter = document.getElementById("statusFilter");
    const dateFilter = document.getElementById("dateFilter");
    const searchFilter = document.getElementById("searchFilter");
    const refreshBtn = document.getElementById("refreshBtn");
    
    // Stats elements
    const totalOrdersElement = document.getElementById("totalOrders");
    const completedOrdersElement = document.getElementById("completedOrders");
    const draftOrdersElement = document.getElementById("draftOrders");
    const totalValueElement = document.getElementById("totalValue");
    
    // Modal elements
    const orderDetailsModal = document.getElementById("orderDetailsModal");
    const deleteModal = document.getElementById("deleteModal");
    const closeButtons = document.querySelectorAll(".close");
    const cancelButtons = document.querySelectorAll(".cancel-btn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const editDraftBtn = document.getElementById("editDraftBtn");
    
    let allOrders = [];
    let orderToDelete = null;
    let currentOrderDetails = null;

    // Format currency in Tanzanian Shillings
    function formatCurrency(value) {
        const numericValue = Number(value) || 0;
        return `Tsh ${numericValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    // Format date
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    // Show message
    function showMessage(message, type = 'info') {
        messageBox.textContent = message;
        messageBox.className = 'message-box ' + type;
        
        setTimeout(() => {
            messageBox.className = 'message-box';
        }, 5000);
    }

    // Update connection status
    function updateConnectionStatus() {
        const isOnline = navigator.onLine;
        connectionStatus.textContent = isOnline ? 'Online' : 'Offline';
        connectionStatus.className = isOnline ? 'connection-status online' : 'connection-status offline';
    }

    // Fetch all orders
    async function fetchOrders() {
        try {
            refreshBtn.disabled = true;
            refreshBtn.textContent = "Loading...";
            ordersTableBody.innerHTML = '<tr><td colspan="7" class="no-data">Loading orders...</td></tr>';

            const response = await fetch(API_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            allOrders = await response.json();
            filterAndRenderOrders();
            updateStats();
            
        } catch (error) {
            console.error("Error fetching orders:", error);
            ordersTableBody.innerHTML = '<tr><td colspan="7" class="no-data">Error loading orders. Please check if backend is running.</td></tr>';
            showMessage("Error loading orders", "error");
        } finally {
            refreshBtn.disabled = false;
            refreshBtn.textContent = "Refresh";
        }
    }

    // Filter and render orders
    function filterAndRenderOrders() {
        const statusValue = statusFilter.value;
        const dateValue = dateFilter.value;
        const searchValue = searchFilter.value.toLowerCase();

        const filteredOrders = allOrders.filter(order => {
            const matchesStatus = !statusValue || order.status === statusValue;
            const matchesDate = !dateValue || order.createdAt.startsWith(dateValue);
            const matchesSearch = !searchValue || 
                                 order.orderId.toLowerCase().includes(searchValue) ||
                                 (order.customerName && order.customerName.toLowerCase().includes(searchValue));
            return matchesStatus && matchesDate && matchesSearch;
        });

        renderOrders(filteredOrders);
    }

    // Render orders table
    function renderOrders(orders) {
        if (orders.length === 0) {
            ordersTableBody.innerHTML = '<tr><td colspan="7" class="no-data">No orders found</td></tr>';
            return;
        }

        ordersTableBody.innerHTML = "";
        
        orders.forEach(order => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${order.orderId}</strong></td>
                <td>${order.customerName || 'N/A'}</td>
                <td>${formatDate(order.createdAt)}</td>
                <td><span class="status-badge ${order.status}">${order.status}</span></td>
                <td>${order.totalItems}</td>
                <td>${formatCurrency(order.totalValue)}</td>
                <td>
                    <button class="action-btn view-btn" data-id="${order.id}">View</button>
                    ${order.status === 'DRAFT' ? `
                        <button class="action-btn edit-btn" data-id="${order.id}">Edit</button>
                    ` : ''}
                    <button class="action-btn delete-btn" data-id="${order.id}">Delete</button>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => viewOrderDetails(e.target.dataset.id));
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => editDraftOrder(e.target.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openDeleteModal(e.target.dataset.id));
        });
    }

    // Update statistics
    function updateStats() {
        const totalOrders = allOrders.length;
        const completedOrders = allOrders.filter(o => o.status === 'COMPLETED').length;
        const draftOrders = allOrders.filter(o => o.status === 'DRAFT').length;
        const totalValue = allOrders.reduce((sum, order) => {
            const value = typeof order.totalValue === 'string' ? parseFloat(order.totalValue) : order.totalValue;
            return sum + (value || 0);
        }, 0);

        totalOrdersElement.textContent = totalOrders;
        completedOrdersElement.textContent = completedOrders;
        draftOrdersElement.textContent = draftOrders;
        totalValueElement.textContent = formatCurrency(totalValue);
    }

    // View order details
    async function viewOrderDetails(orderId) {
        try {
            const response = await fetch(`${API_URL}/${orderId}`);
            
            if (response.ok) {
                const order = await response.json();
                currentOrderDetails = order;
                
                document.getElementById("detailOrderId").textContent = order.orderId;
                document.getElementById("detailCustomer").textContent = order.customerName || 'N/A';
                document.getElementById("detailStatus").textContent = order.status;
                document.getElementById("detailDate").textContent = formatDate(order.createdAt);
                
                // Render order items
                const orderItemsBody = document.getElementById("orderItemsBody");
                if (order.orderItems && order.orderItems.length > 0) {
                    orderItemsBody.innerHTML = order.orderItems.map(item => `
                        <tr>
                            <td>${item.itemCode}</td>
                            <td>${item.itemName}</td>
                            <td>${item.quantityOut}</td>
                            <td>${formatCurrency(item.sellingPrice)}</td>
                            <td>${formatCurrency(item.subtotal)}</td>
                        </tr>
                    `).join('');
                } else {
                    orderItemsBody.innerHTML = '<tr><td colspan="5" class="no-data">No items in this order</td></tr>';
                }
                
                document.getElementById("detailTotalItems").textContent = order.totalItems;
                document.getElementById("detailTotalValue").textContent = formatCurrency(order.totalValue);
                
                // Show edit button for draft orders
                editDraftBtn.style.display = order.status === 'DRAFT' ? 'inline-block' : 'none';
                editDraftBtn.onclick = () => {
                    closeModals();
                    editDraftOrder(order.id);
                };
                
                orderDetailsModal.style.display = "block";
            } else {
                showMessage("Error fetching order details", "error");
            }
        } catch (error) {
            console.error("Error fetching order details:", error);
            showMessage("Error fetching order details", "error");
        }
    }

    // Edit draft order
    async function editDraftOrder(orderId) {
        const summary = allOrders.find(o => o.id == orderId);
        if (!summary || summary.status !== 'DRAFT') {
            showMessage("Only draft orders can be edited", "error");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${orderId}`);
            if (!response.ok) throw new Error('Draft could not be loaded');
            const order = await response.json();
            const draftData = {
                orderId: order.orderId,
                customerName: order.customerName,
                items: (order.orderItems || []).map(item => ({
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    category: item.category || '',
                    quantityOut: item.quantityOut,
                    sellingPrice: item.sellingPrice,
                    subtotal: item.subtotal
                })),
                timestamp: Date.now()
            };
            localStorage.setItem('orderDraft', JSON.stringify(draftData));
            window.location.href = 'order-creation.html';
        } catch (error) {
            console.error("Error loading draft:", error);
            showMessage("Error loading draft for editing", "error");
        }
    }

    // Open delete modal
    function openDeleteModal(orderId) {
        const order = allOrders.find(o => o.id == orderId);
        if (order) {
            orderToDelete = orderId;
            document.getElementById("deleteOrderId").textContent = order.orderId;
            deleteModal.style.display = "block";
        }
    }

    // Handle delete confirmation
    confirmDeleteBtn.addEventListener("click", async () => {
        if (!orderToDelete) return;

        try {
            const response = await fetch(`${API_URL}/${orderToDelete}`, {
                method: "DELETE"
            });

            if (response.ok) {
                showMessage("Order deleted successfully!", "success");
                closeModals();
                fetchOrders(); // Refresh the table
                notifyDataChanged();
            } else {
                showMessage("Error deleting order. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error:", error);
            showMessage("Backend not reachable. Please check connection.", "error");
        }
    });

    // Close modals
    function closeModals() {
        orderDetailsModal.style.display = "none";
        deleteModal.style.display = "none";
        orderToDelete = null;
        currentOrderDetails = null;
    }

    // Event listeners for modals
    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    cancelButtons.forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    window.addEventListener('click', (e) => {
        if (e.target === orderDetailsModal || e.target === deleteModal) {
            closeModals();
        }
    });

    // Filter event listeners
    statusFilter.addEventListener('change', filterAndRenderOrders);
    dateFilter.addEventListener('change', filterAndRenderOrders);
    searchFilter.addEventListener('input', filterAndRenderOrders);
    refreshBtn.addEventListener('click', fetchOrders);

    // Connection status monitoring
    window.addEventListener('online', () => {
        updateConnectionStatus();
        fetchOrders();
    });
    window.addEventListener('offline', updateConnectionStatus);

    // Listen for data changes from other pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'inventoryDataChanged') {
            fetchOrders();
        }
    });

    // Notify data changed
    function notifyDataChanged() {
        localStorage.setItem('inventoryDataChanged', Date.now().toString());
    }

    // Initial load
    updateConnectionStatus();
    fetchOrders();

    // Auto-refresh every 30 seconds for real-time updates
    setInterval(fetchOrders, 30000);

    // Handle visibility change - refresh when tab becomes visible
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            fetchOrders();
        }
    });
});