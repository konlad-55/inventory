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

    const API_URL = "https://inventory-production-f5f7.up.railway.app";
    const ORDER_API_URL = `${API_URL}/orders`;
    
    // DOM Elements
    const orderIdField = document.getElementById("orderId");
    const customerNameField = document.getElementById("customerName");
    const orderDateField = document.getElementById("orderDate");
    const itemSearchInput = document.getElementById("itemSearch");
    const suggestionsDropdown = document.getElementById("suggestions");
    
    // Selected item fields
    const selectedItemCode = document.getElementById("selectedItemCode");
    const selectedItemName = document.getElementById("selectedItemName");
    const selectedCategory = document.getElementById("selectedCategory");
    const selectedSellingPrice = document.getElementById("selectedSellingPrice");
    const quantityOut = document.getElementById("quantityOut");
    const subtotal = document.getElementById("subtotal");
    
    // Order items table
    const orderItemsBody = document.getElementById("orderItemsBody");
    const totalItemsElement = document.getElementById("totalItems");
    const totalValueElement = document.getElementById("totalValue");
    
    // Action buttons
    const addItemBtn = document.getElementById("addItemBtn");
    const saveDraftBtn = document.getElementById("saveDraftBtn");
    const submitOrderBtn = document.getElementById("submitOrderBtn");
    const clearOrderBtn = document.getElementById("clearOrderBtn");
    
    // Modal elements
    const editItemModal = document.getElementById("editItemModal");
    const editItemForm = document.getElementById("editItemForm");
    const closeButtons = document.querySelectorAll(".close");
    const cancelButtons = document.querySelectorAll(".cancel-btn");
    
    // Message box
    const messageBox = document.getElementById("messageBox");
    const connectionStatus = document.getElementById("connectionStatus");
    
    // Order state
    let currentOrderId = null;
    let orderItems = [];
    let selectedItem = null;
    let searchTimeout = null;

    // Initialize
    function initialize() {
        generateOrderId();
        setCurrentDate();
        restoreDraft();
        setupEventListeners();
        updateConnectionStatus();
    }

    // Generate order ID
    function generateOrderId() {
        const timestamp = Date.now().toString().slice(-10);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        currentOrderId = `ORD-${timestamp}-${random}`;
        orderIdField.value = currentOrderId;
    }

    // Set current date
    function setCurrentDate() {
        const now = new Date();
        orderDateField.value = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    }

    // Format currency in Tanzanian Shillings
    function formatCurrency(value) {
        const numericValue = Number(value) || 0;
        return `Tsh ${numericValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
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

    // Auto-suggestion functionality
    function handleSearchInput() {
        clearTimeout(searchTimeout);
        const query = itemSearchInput.value.trim();
        
        if (query.length < 2) {
            suggestionsDropdown.classList.remove('show');
            return;
        }
        
        searchTimeout = setTimeout(() => {
            fetchSuggestions(query);
        }, 300);
    }

    async function fetchSuggestions(query) {
        try {
            const response = await fetch(`${API_URL}/items/search?query=${encodeURIComponent(query)}`);
            
            if (response.ok) {
                const items = await response.json();
                displaySuggestions(items);
            }
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        }
    }

    function displaySuggestions(items) {
        if (items.length === 0) {
            suggestionsDropdown.classList.remove('show');
            return;
        }
        
        suggestionsDropdown.innerHTML = items.map(item => `
            <div class="suggestion-item" data-item-code="${item.itemCode}">
                <div class="item-name">${item.itemName}</div>
                <div class="item-details">
                    Code: ${item.itemCode} | Category: ${item.category} | Price: ${formatCurrency(item.sellingPrice)}
                </div>
            </div>
        `).join('');
        
        suggestionsDropdown.classList.add('show');
        
        // Add click listeners
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => selectItem(item.dataset.itemCode, items));
        });
    }

    function selectItem(itemCode, items) {
        selectedItem = items.find(item => item.itemCode === itemCode);
        
        if (selectedItem) {
            selectedItemCode.value = selectedItem.itemCode;
            selectedItemName.value = selectedItem.itemName;
            selectedCategory.value = selectedItem.category;
            selectedSellingPrice.value = formatCurrency(selectedItem.sellingPrice);
            quantityOut.value = 1;
            updateSubtotal();
            
            itemSearchInput.value = '';
            suggestionsDropdown.classList.remove('show');
        }
    }

    function updateSubtotal() {
        if (selectedItem && quantityOut.value) {
            const qty = parseInt(quantityOut.value);
            const price = selectedItem.sellingPrice;
            const sub = qty * price;
            subtotal.value = formatCurrency(sub);
        }
    }

    // Order items management
    function addItemToOrder() {
        if (!selectedItem) {
            showMessage("Please select an item first", "error");
            return;
        }
        
        const qty = parseInt(quantityOut.value);
        if (qty < 1) {
            showMessage("Quantity must be at least 1", "error");
            return;
        }
        
        const orderItem = {
            itemCode: selectedItem.itemCode,
            itemName: selectedItem.itemName,
            category: selectedItem.category,
            quantityOut: qty,
            sellingPrice: selectedItem.sellingPrice,
            subtotal: qty * selectedItem.sellingPrice
        };
        
        orderItems.push(orderItem);
        renderOrderItems();
        clearSelectedItem();
        showMessage("Item added to order", "success");
        saveDraftToLocalStorage();
    }

    function clearSelectedItem() {
        selectedItem = null;
        selectedItemCode.value = '';
        selectedItemName.value = '';
        selectedCategory.value = '';
        selectedSellingPrice.value = '';
        quantityOut.value = 1;
        subtotal.value = '';
    }

    function renderOrderItems() {
        if (orderItems.length === 0) {
            orderItemsBody.innerHTML = '<tr><td colspan="7" class="no-data">No items added to order yet</td></tr>';
            totalItemsElement.textContent = '0';
            totalValueElement.textContent = 'Tsh 0.00';
            return;
        }
        
        orderItemsBody.innerHTML = orderItems.map((item, index) => `
            <tr>
                <td>${item.itemCode}</td>
                <td>${item.itemName}</td>
                <td><span class="category-badge">${item.category}</span></td>
                <td>${item.quantityOut}</td>
                <td>${formatCurrency(item.sellingPrice)}</td>
                <td>${formatCurrency(item.subtotal)}</td>
                <td>
                    <button class="action-btn edit-btn" data-index="${index}">Edit</button>
                    <button class="action-btn delete-btn" data-index="${index}">Delete</button>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openEditModal(e.target.dataset.index));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteOrderItem(e.target.dataset.index));
        });
        
        updateOrderSummary();
    }

    function updateOrderSummary() {
        const totalItems = orderItems.length;
        const totalValue = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
        
        totalItemsElement.textContent = totalItems;
        totalValueElement.textContent = formatCurrency(totalValue);
    }

    function deleteOrderItem(index) {
        orderItems.splice(index, 1);
        renderOrderItems();
        saveDraftToLocalStorage();
        showMessage("Item removed from order", "info");
    }

    function openEditModal(index) {
        const item = orderItems[index];
        
        document.getElementById("editItemIndex").value = index;
        document.getElementById("editItemCode").value = item.itemCode;
        document.getElementById("editItemName").value = item.itemName;
        document.getElementById("editQuantity").value = item.quantityOut;
        document.getElementById("editPrice").value = item.sellingPrice;
        
        editItemModal.style.display = "block";
    }

    function closeEditModal() {
        editItemModal.style.display = "none";
    }

    editItemForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const index = parseInt(document.getElementById("editItemIndex").value);
        const newQuantity = parseInt(document.getElementById("editQuantity").value);
        const newPrice = parseFloat(document.getElementById("editPrice").value);
        
        if (newQuantity < 1) {
            showMessage("Quantity must be at least 1", "error");
            return;
        }
        
        if (newPrice < 0) {
            showMessage("Price must be positive", "error");
            return;
        }
        
        orderItems[index].quantityOut = newQuantity;
        orderItems[index].sellingPrice = newPrice;
        orderItems[index].subtotal = newQuantity * newPrice;
        
        renderOrderItems();
        closeEditModal();
        saveDraftToLocalStorage();
        showMessage("Item updated successfully", "success");
    });

    // Draft handling
    function saveDraftToLocalStorage() {
        const draftData = {
            orderId: currentOrderId,
            customerName: customerNameField.value,
            items: orderItems,
            timestamp: Date.now()
        };
        localStorage.setItem('orderDraft', JSON.stringify(draftData));
    }

    function restoreDraft() {
        const draftData = localStorage.getItem('orderDraft');
        if (draftData) {
            const draft = JSON.parse(draftData);
            
            // Only restore if it's recent (within 24 hours)
            const hoursSinceDraft = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
            if (hoursSinceDraft < 24) {
                currentOrderId = draft.orderId;
                orderIdField.value = currentOrderId;
                customerNameField.value = draft.customerName || '';
                orderItems = draft.items || [];
                renderOrderItems();
                showMessage("Draft restored from " + new Date(draft.timestamp).toLocaleTimeString(), "info");
            } else {
                localStorage.removeItem('orderDraft');
            }
        }
    }

    async function saveDraftToBackend() {
        try {
            const draftData = {
                orderId: currentOrderId,
                customerName: customerNameField.value,
                items: orderItems
            };
            
            const response = await fetch(`${ORDER_API_URL}/draft`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(draftData)
            });
            
            if (response.ok) {
                const savedOrder = await response.json();
                currentOrderId = savedOrder.orderId;
                orderIdField.value = currentOrderId;
                showMessage("Draft saved successfully", "success");
                saveDraftToLocalStorage();
            } else {
                showMessage(`Error saving draft: ${await getResponseMessage(response)}`, "error");
            }
        } catch (error) {
            console.error("Error saving draft:", error);
            showMessage("Backend not reachable. Draft saved locally only", "info");
        }
    }

    async function submitOrder() {
        if (orderItems.length === 0) {
            showMessage("Please add items to the order first", "error");
            return;
        }
        
        try {
            const orderData = {
                orderId: currentOrderId,
                customerName: customerNameField.value,
                items: orderItems
            };
            
            const response = await fetch(ORDER_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                const responseData = await response.json();
                
                // The new API returns { order: ..., updatedItems: [...] }
                const savedOrder = responseData.order || responseData;
                const updatedItems = responseData.updatedItems || [];
                
                showMessage("Order submitted successfully! Stock deducted.", "success");
                clearOrder();
                notifyDataChanged();
                
                // If dashboard is open in another tab, it will auto-refresh via polling
                // Also set a flag for immediate dashboard refresh
                localStorage.setItem('inventoryDataChanged', Date.now().toString());
                localStorage.setItem('orderSubmitted', 'true');
            } else {
                showMessage(`Error submitting order: ${await getResponseMessage(response)}`, "error");
            }
        } catch (error) {
            console.error("Error submitting order:", error);
            showMessage("Backend not reachable. Please check connection", "error");
        }
    }

    async function getResponseMessage(response) {
        const body = await response.text();
        return body || `HTTP ${response.status}`;
    }

    function clearOrder() {
        generateOrderId();
        customerNameField.value = '';
        orderItems = [];
        clearSelectedItem();
        renderOrderItems();
        localStorage.removeItem('orderDraft');
        setCurrentDate();
    }

    function notifyDataChanged() {
        localStorage.setItem('inventoryDataChanged', Date.now().toString());
    }

    // Event listeners
    function setupEventListeners() {
        itemSearchInput.addEventListener('input', handleSearchInput);
        
        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box')) {
                suggestionsDropdown.classList.remove('show');
            }
        });
        
        quantityOut.addEventListener('input', updateSubtotal);
        
        addItemBtn.addEventListener('click', addItemToOrder);
        saveDraftBtn.addEventListener('click', saveDraftToBackend);
        submitOrderBtn.addEventListener('click', submitOrder);
        clearOrderBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to clear the order?")) {
                clearOrder();
            }
        });
        
        // Modal event listeners
        closeButtons.forEach(btn => btn.addEventListener('click', closeEditModal));
        cancelButtons.forEach(btn => btn.addEventListener('click', closeEditModal));
        
        window.addEventListener('click', (e) => {
            if (e.target === editItemModal) {
                closeEditModal();
            }
        });
        
        // Connection status
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);
        
        // Listen for data changes from other pages
        window.addEventListener('storage', (e) => {
            if (e.key === 'inventoryDataChanged') {
                console.log('Data changed in another page');
            }
        });
        
        // Auto-save draft periodically
        setInterval(saveDraftToLocalStorage, 30000);
        
        // Warn before leaving with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (orderItems.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    // Initialize the application
    initialize();
});
