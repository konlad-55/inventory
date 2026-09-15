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

    const itemCodeField = document.getElementById("itemCode");
    const categoryField = document.getElementById("category");
    const form = document.getElementById("itemForm");
    const excelUploadBtn = document.getElementById("excelUploadBtn");
    const excelUploadInput = document.getElementById("excelUploadInput");
    const REQUIRED_IMPORT_COLUMNS = [
        "itemName",
        "category",
        "quantity",
        "buyingPrice",
        "sellingPrice"
    ];
    const VALID_CATEGORIES = ["BOXER", "FEKON", "KINGLION", "HAUJUE", "TVS"];

    // Generate Item Code based on Category
    function generateItemCode(category) {
        const timestamp = Date.now().toString().slice(-5); // last 5 digits of time
        return category.substring(0,3).toUpperCase() + "-" + timestamp;
    }

    // Default code before category is chosen
    itemCodeField.value = "GEN-" + Date.now().toString().slice(-5);

    // Update code when category changes
    categoryField.addEventListener("change", () => {
        if (categoryField.value) {
            itemCodeField.value = generateItemCode(categoryField.value);
            saveDraft();
        }
    });

    // Restore draft from localStorage
    function restoreDraft() {
        const draft = localStorage.getItem('itemDraft');
        if (draft) {
            const draftData = JSON.parse(draft);
            document.getElementById("itemName").value = draftData.itemName || '';
            document.getElementById("category").value = draftData.category || '';
            document.getElementById("quantity").value = draftData.quantity || '';
            document.getElementById("buyingPrice").value = draftData.buyingPrice || '';
            document.getElementById("sellingPrice").value = draftData.sellingPrice || '';
            
            // Regenerate item code based on restored category
            if (draftData.category) {
                itemCodeField.value = generateItemCode(draftData.category);
            }
            
            console.log("Draft restored from localStorage");
        }
    }

    // Save draft to localStorage
    function saveDraft() {
        const draftData = {
            itemCode: itemCodeField.value,
            itemName: document.getElementById("itemName").value,
            category: document.getElementById("category").value,
            quantity: document.getElementById("quantity").value,
            buyingPrice: document.getElementById("buyingPrice").value,
            sellingPrice: document.getElementById("sellingPrice").value
        };
        localStorage.setItem('itemDraft', JSON.stringify(draftData));
    }

    // Clear draft from localStorage
    function clearDraft() {
        localStorage.removeItem('itemDraft');
    }

    // Add autosave to all form inputs
    const formInputs = form.querySelectorAll('input, select');
    formInputs.forEach(input => {
        input.addEventListener('input', saveDraft);
        input.addEventListener('change', saveDraft);
    });

    // Restore draft on page load
    restoreDraft();

    if (excelUploadBtn && excelUploadInput) {
        excelUploadBtn.addEventListener('click', () => excelUploadInput.click());
        excelUploadInput.addEventListener('change', (event) => {
            const selectedFile = event.target.files && event.target.files[0];
            if (selectedFile) {
                importExcelItems(selectedFile);
            }
        });
    }

    // Message display function
    function showMessage(message, type = 'info') {
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = message;
        messageBox.className = 'message-box ' + type;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageBox.className = 'message-box';
        }, 5000);
    }

    function normalizeHeader(value) {
        return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function parseNumberValue(value, fieldName, rowNumber, errors) {
        if (value === null || value === undefined || String(value).trim() === '') {
            errors.push(`Row ${rowNumber}: ${fieldName} is required.`);
            return null;
        }

        const numericValue = Number(String(value).trim());
        if (Number.isNaN(numericValue)) {
            errors.push(`Row ${rowNumber}: ${fieldName} must be a valid number.`);
            return null;
        }

        return numericValue;
    }

    function validateImportedItems(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error('The selected Excel file does not contain any rows to import.');
        }

        const headerMap = Object.keys(rows[0] || {}).map(header => ({
            original: header,
            normalized: normalizeHeader(header)
        }));
        const missingColumns = REQUIRED_IMPORT_COLUMNS.filter(column =>
            !headerMap.some(header => header.normalized === normalizeHeader(column))
        );

        if (missingColumns.length > 0) {
            throw new Error(`Invalid Excel columns. Required columns: ${REQUIRED_IMPORT_COLUMNS.join(', ')}.`);
        }

        const validItems = [];
        const errors = [];
        const seenCodes = new Set();

        rows.forEach((row, index) => {
            const rowNumber = index + 2;
            const normalizedRow = {};

            Object.entries(row).forEach(([header, value]) => {
                const normalizedKey = normalizeHeader(header);
                const matchedColumn = REQUIRED_IMPORT_COLUMNS.find(column => normalizeHeader(column) === normalizedKey);
                if (matchedColumn) {
                    normalizedRow[matchedColumn] = value;
                }
            });

            const itemCode = String(normalizedRow.itemCode ?? '').trim();
            const itemName = String(normalizedRow.itemName ?? '').trim();
            const category = String(normalizedRow.category ?? '').trim().toUpperCase();
            const quantity = parseNumberValue(normalizedRow.quantity, 'quantity', rowNumber, errors);
            const buyingPrice = parseNumberValue(normalizedRow.buyingPrice, 'buyingPrice', rowNumber, errors);
            const sellingPrice = parseNumberValue(normalizedRow.sellingPrice, 'sellingPrice', rowNumber, errors);

            if (itemCode && seenCodes.has(itemCode)) {
                errors.push(`Row ${rowNumber}: Duplicate itemCode '${itemCode}' found in the same Excel file.`);
            }

            if (!itemName || itemName.length < 2) {
                errors.push(`Row ${rowNumber}: itemName must be at least 2 characters long.`);
            }

            if (!VALID_CATEGORIES.includes(category)) {
                errors.push(`Row ${rowNumber}: category must be one of ${VALID_CATEGORIES.join(', ')}.`);
            }

            if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1)) {
                errors.push(`Row ${rowNumber}: quantity must be a whole number of at least 1.`);
            }

            if (buyingPrice !== null && buyingPrice < 0) {
                errors.push(`Row ${rowNumber}: buyingPrice must be 0 or greater.`);
            }

            if (sellingPrice !== null && sellingPrice < 0) {
                errors.push(`Row ${rowNumber}: sellingPrice must be 0 or greater.`);
            }

            const rowIsValid = itemName && VALID_CATEGORIES.includes(category) && quantity !== null && quantity >= 1 && buyingPrice !== null && buyingPrice >= 0 && sellingPrice !== null && sellingPrice >= 0 && (!itemCode || !seenCodes.has(itemCode));

            if (rowIsValid) {
                validItems.push({
                    itemCode: itemCode || '',
                    itemName,
                    category,
                    quantity: Number(quantity),
                    buyingPrice: Number(buyingPrice),
                    sellingPrice: Number(sellingPrice)
                });
                if (itemCode) {
                    seenCodes.add(itemCode);
                }
            }
        });

        if (errors.length > 0) {
            throw new Error(errors.slice(0, 5).join(' | ') + (errors.length > 5 ? ' ...' : ''));
        }

        return validItems;
    }

    async function importExcelItems(file) {
        if (!file) {
            showMessage('Please select an Excel file first.', 'error');
            return;
        }

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(extension)) {
            showMessage('Only Excel (.xlsx, .xls) or CSV files are allowed.', 'error');
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
            const validItems = validateImportedItems(rows);

            const response = await fetch('http://localhost:8080/api/items/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(validItems)
            });

            const resultText = await response.text();
            let result;
            try {
                result = JSON.parse(resultText);
            } catch (error) {
                result = { message: resultText };
            }

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Excel import failed.');
            }

            showMessage(`${result.message || 'Items imported successfully.'} (${result.successCount || validItems.length} item(s))`, 'success');
            form.reset();
            clearDraft();
            itemCodeField.value = 'GEN-' + Date.now().toString().slice(-5);
            notifyDataChanged();
        } catch (error) {
            console.error('Import failed:', error);
            showMessage(error.message || 'Unable to import Excel file.', 'error');
        } finally {
            excelUploadInput.value = '';
        }
    }

    // Notify other pages that data has changed
    function notifyDataChanged() {
        localStorage.setItem('inventoryDataChanged', Date.now().toString());
    }


    // Handle form submission
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Validate form data
        const itemName = document.getElementById("itemName").value.trim();
        const category = document.getElementById("category").value;
        const quantity = parseInt(document.getElementById("quantity").value);
        const buyingPrice = parseFloat(document.getElementById("buyingPrice").value);
        const sellingPrice = parseFloat(document.getElementById("sellingPrice").value);

        // Validation checks
        if (!itemName || itemName.length < 2) {
            showMessage("Item name must be at least 2 characters long.", "error");
            return;
        }

        if (!category) {
            showMessage("Please select a category.", "error");
            return;
        }

        if (quantity < 1 || isNaN(quantity)) {
            showMessage("Quantity must be at least 1.", "error");
            return;
        }

        if (buyingPrice < 0 || isNaN(buyingPrice)) {
            showMessage("Buying price must be a valid positive number.", "error");
            return;
        }

        if (sellingPrice < 0 || isNaN(sellingPrice)) {
            showMessage("Selling price must be a valid positive number.", "error");
            return;
        }

        // Collect form data
        const itemData = {
            itemCode: itemCodeField.value,
            itemName: itemName,
            category: category,
            quantity: quantity,
            buyingPrice: buyingPrice,
            sellingPrice: sellingPrice
        };

        try {
            // Send to backend API
            const response = await fetch("http://localhost:8080/api/items", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(itemData)
            });

            if (response.ok) {
                showMessage("Item saved successfully!", "success");
                form.reset();
                clearDraft();
                // regenerate new code for next item
                itemCodeField.value = "GEN-" + Date.now().toString().slice(-5);
                notifyDataChanged(); // Notify other pages
            } else {
                showMessage("Error saving item. Please try again.", "error");
            }
        } catch (error) {
            console.error("Error:", error);
            // Save to offline drafts if connection fails
            saveOfflineDraft(itemData);
            showMessage("Backend not reachable. Item saved as offline draft and will sync when connection is restored.", "info");
        }
    });

    // Save offline draft to localStorage
    function saveOfflineDraft(itemData) {
        let offlineDrafts = JSON.parse(localStorage.getItem('offlineDrafts') || '[]');
        offlineDrafts.push(itemData);
        localStorage.setItem('offlineDrafts', JSON.stringify(offlineDrafts));
    }

    // Sync offline drafts when connection is restored
    async function syncOfflineDrafts() {
        const offlineDrafts = JSON.parse(localStorage.getItem('offlineDrafts') || '[]');
        
        if (offlineDrafts.length > 0) {
            try {
                const response = await fetch("http://localhost:8080/api/sync-drafts", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(offlineDrafts)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log("Sync result:", result);
                    localStorage.removeItem('offlineDrafts');
                    showMessage(`Synced ${result.successCount} items successfully. ${result.failureCount} items failed (duplicates).`, "success");
                    notifyDataChanged(); // Notify other pages
                }
            } catch (error) {
                console.error("Sync failed:", error);
            }
        }
    }

    // Connection status monitoring
    function updateConnectionStatus() {
        const isOnline = navigator.onLine;
        const statusIndicator = document.getElementById('connectionStatus');
        
        if (statusIndicator) {
            statusIndicator.textContent = isOnline ? 'Online' : 'Offline';
            statusIndicator.className = isOnline ? 'online' : 'offline';
        }

        if (isOnline) {
            syncOfflineDrafts();
        }
    }

    // Listen for connection changes
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);

    // Listen for data changes from other pages
    window.addEventListener('storage', (e) => {
        if (e.key === 'inventoryDataChanged') {
            console.log('Data changed in another page, current form data preserved');
        }
    });

    // Initial connection status check
    updateConnectionStatus();
});
