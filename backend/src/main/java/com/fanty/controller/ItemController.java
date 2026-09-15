package com.fanty.controller;

import com.fanty.model.Item;
import com.fanty.model.Category;
import com.fanty.model.CategorySummary;
import com.fanty.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ItemController {

    @Autowired
    private ItemRepository itemRepository;

    @PostMapping("/items")
    public ResponseEntity<?> addItem(@RequestBody Item item) {
        try {
            // Check if item code already exists
            if (itemRepository.existsByItemCode(item.getItemCode())) {
                return ResponseEntity.badRequest().body("Item code already exists");
            }
            
            // Check if item with same name and category already exists
            Optional<Item> existingItem = itemRepository.findByItemNameAndCategory(item.getItemName(), item.getCategory());
            if (existingItem.isPresent()) {
                // Update existing item quantity instead of creating duplicate
                Item itemToUpdate = existingItem.get();
                itemToUpdate.setQuantity(itemToUpdate.getQuantity() + item.getQuantity());
                // Update prices if provided
                if (item.getBuyingPrice() != null && item.getBuyingPrice().compareTo(BigDecimal.ZERO) > 0) {
                    itemToUpdate.setBuyingPrice(item.getBuyingPrice());
                }
                if (item.getSellingPrice() != null && item.getSellingPrice().compareTo(BigDecimal.ZERO) > 0) {
                    itemToUpdate.setSellingPrice(item.getSellingPrice());
                }
                Item savedItem = itemRepository.save(itemToUpdate);
                return ResponseEntity.ok(savedItem);
            }
            
            // Create new item if no duplicate found
            Item savedItem = itemRepository.save(item);
            return ResponseEntity.ok(savedItem);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error saving item: " + e.getMessage());
        }
    }

    @PostMapping("/items/import")
    public ResponseEntity<?> importItems(@RequestBody List<Map<String, Object>> importedItems) {
        try {
            if (importedItems == null || importedItems.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "No items found in the uploaded file."));
            }

            List<Item> itemsToSave = new ArrayList<>();
            List<Item> itemsToUpdate = new ArrayList<>();
            List<String> validationErrors = new ArrayList<>();
            Set<String> seenCodes = new HashSet<>();
            int updatedCount = 0;

            for (int index = 0; index < importedItems.size(); index++) {
                Map<String, Object> itemData = importedItems.get(index);
                if (itemData == null) {
                    validationErrors.add("Row " + (index + 2) + ": empty row.");
                    continue;
                }

                String rawItemCode = getString(itemData, "itemCode");
                String rawItemName = getString(itemData, "itemName");
                String rawCategory = getString(itemData, "category");
                Integer quantity = getInteger(itemData, "quantity");
                BigDecimal buyingPrice = getBigDecimal(itemData, "buyingPrice");
                BigDecimal sellingPrice = getBigDecimal(itemData, "sellingPrice");

                String itemCode = rawItemCode == null ? null : rawItemCode.trim();
                String itemName = rawItemName == null ? null : rawItemName.trim();
                String categoryRaw = rawCategory == null ? null : rawCategory.trim();

                if (itemCode != null && !itemCode.isEmpty() && seenCodes.contains(itemCode)) {
                    validationErrors.add("Row " + (index + 2) + ": duplicate itemCode '" + itemCode + "' found in the uploaded file.");
                }

                if (itemName == null || itemName.length() < 2) {
                    validationErrors.add("Row " + (index + 2) + ": itemName must contain at least 2 characters.");
                }

                Category category = null;
                if (categoryRaw == null || categoryRaw.isEmpty()) {
                    validationErrors.add("Row " + (index + 2) + ": category is required.");
                } else {
                    try {
                        category = Category.fromString(categoryRaw);
                    } catch (Exception e) {
                        validationErrors.add("Row " + (index + 2) + ": category must be one of BOXER, FEKON, KINGLION, HAUJUE, TVS.");
                    }
                }

                if (quantity == null || quantity < 1) {
                    validationErrors.add("Row " + (index + 2) + ": quantity must be at least 1.");
                }

                if (buyingPrice == null || buyingPrice.compareTo(BigDecimal.ZERO) < 0) {
                    validationErrors.add("Row " + (index + 2) + ": buyingPrice must be 0 or greater.");
                }

                if (sellingPrice == null || sellingPrice.compareTo(BigDecimal.ZERO) < 0) {
                    validationErrors.add("Row " + (index + 2) + ": sellingPrice must be 0 or greater.");
                }

                boolean validRow = itemName != null && itemName.length() >= 2
                        && category != null
                        && quantity != null && quantity >= 1
                        && buyingPrice != null && buyingPrice.compareTo(BigDecimal.ZERO) >= 0
                        && sellingPrice != null && sellingPrice.compareTo(BigDecimal.ZERO) >= 0;

                if (validRow) {
                    // Check if item with same name and category already exists
                    Optional<Item> existingItem = itemRepository.findByItemNameAndCategory(itemName, category);
                    
                    if (existingItem.isPresent()) {
                        // Update existing item quantity instead of creating duplicate
                        Item itemToUpdate = existingItem.get();
                        itemToUpdate.setQuantity(itemToUpdate.getQuantity() + quantity);
                        // Update prices if provided
                        if (buyingPrice != null && buyingPrice.compareTo(BigDecimal.ZERO) > 0) {
                            itemToUpdate.setBuyingPrice(buyingPrice);
                        }
                        if (sellingPrice != null && sellingPrice.compareTo(BigDecimal.ZERO) > 0) {
                            itemToUpdate.setSellingPrice(sellingPrice);
                        }
                        itemsToUpdate.add(itemToUpdate);
                        updatedCount++;
                    } else {
                        // Check for duplicate item code
                        if (itemCode != null && !itemCode.isEmpty()) {
                            if (itemRepository.existsByItemCode(itemCode)) {
                                validationErrors.add("Row " + (index + 2) + ": itemCode '" + itemCode + "' already exists in the system.");
                                continue;
                            }
                            if (seenCodes.contains(itemCode)) {
                                validationErrors.add("Row " + (index + 2) + ": duplicate itemCode '" + itemCode + "' found in the uploaded file.");
                                continue;
                            }
                            seenCodes.add(itemCode);
                        }

                        String generatedItemCode = itemCode != null && !itemCode.isEmpty() ? itemCode : generateAutoItemCode(category.name());
                        while (itemRepository.existsByItemCode(generatedItemCode)) {
                            generatedItemCode = generateAutoItemCode(category.name());
                        }

                        itemsToSave.add(new Item(generatedItemCode, itemName, category, quantity, buyingPrice, sellingPrice));
                    }
                }
            }

            if (!validationErrors.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "Excel import validation failed.",
                    "errors", validationErrors.subList(0, Math.min(validationErrors.size(), 10))
                ));
            }

            // Save new items and update existing ones
            itemRepository.saveAll(itemsToSave);
            itemRepository.saveAll(itemsToUpdate);
            
            return ResponseEntity.ok(Map.of(
                "message", "Items imported successfully.",
                "successCount", itemsToSave.size(),
                "updatedCount", updatedCount
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "message", "Error importing items: " + e.getMessage()
            ));
        }
    }

    private String generateAutoItemCode(String category) {
        String prefix = category == null || category.isBlank() ? "GEN" : category.substring(0, Math.min(3, category.length())).toUpperCase();
        long suffix = System.currentTimeMillis() % 100000L;
        return prefix + "-" + String.format("%05d", suffix);
    }

    private String getString(Map<String, Object> itemData, String key) {
        Object value = itemData.get(key);
        return value == null ? null : value.toString();
    }

    private Integer getInteger(Map<String, Object> itemData, String key) {
        Object value = itemData.get(key);
        if (value == null) {
            return null;
        }

        try {
            if (value instanceof Number) {
                return ((Number) value).intValue();
            }
            return Integer.parseInt(value.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private BigDecimal getBigDecimal(Map<String, Object> itemData, String key) {
        Object value = itemData.get(key);
        if (value == null) {
            return null;
        }

        try {
            if (value instanceof Number) {
                return new BigDecimal(value.toString());
            }
            return new BigDecimal(value.toString().trim());
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories() {
        try {
            Map<String, String> categories = new HashMap<>();
            categories.put("BOXER", "BOXER");
            categories.put("FEKON", "FEKON");
            categories.put("KINGLION", "KINGLION");
            categories.put("HAUJUE", "HAUJUE");
            categories.put("TVS", "TVS");
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching categories: " + e.getMessage());
        }
    }

    @GetMapping("/items")
    public ResponseEntity<?> getItems() {
        try {
            List<Item> items = itemRepository.findAll();
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching items: " + e.getMessage());
        }
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<?> getItemById(@PathVariable Long id) {
        try {
            Optional<Item> item = itemRepository.findById(id);
            if (item.isPresent()) {
                return ResponseEntity.ok(item.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching item: " + e.getMessage());
        }
    }

    @GetMapping("/items/code/{itemCode}")
    public ResponseEntity<?> getItemByCode(@PathVariable String itemCode) {
        try {
            Optional<Item> item = itemRepository.findByItemCode(itemCode);
            if (item.isPresent()) {
                return ResponseEntity.ok(item.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching item: " + e.getMessage());
        }
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<?> updateItem(@PathVariable Long id, @RequestBody Map<String, Object> itemData) {
        try {
            Optional<Item> existingItem = itemRepository.findById(id);
            if (existingItem.isPresent()) {
                Item updatedItem = existingItem.get();
                
                // Update fields
                if (itemData.containsKey("itemName")) {
                    updatedItem.setItemName((String) itemData.get("itemName"));
                }
                if (itemData.containsKey("category")) {
                    String categoryStr = (String) itemData.get("category");
                    updatedItem.setCategory(Category.fromString(categoryStr));
                }
                if (itemData.containsKey("quantity")) {
                    updatedItem.setQuantity(((Number) itemData.get("quantity")).intValue());
                }
                if (itemData.containsKey("buyingPrice")) {
                    updatedItem.setBuyingPrice(new BigDecimal(itemData.get("buyingPrice").toString()));
                }
                if (itemData.containsKey("sellingPrice")) {
                    updatedItem.setSellingPrice(new BigDecimal(itemData.get("sellingPrice").toString()));
                }
                
                // Save updated item
                Item savedItem = itemRepository.save(updatedItem);
                return ResponseEntity.ok(savedItem);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error updating item: " + e.getMessage());
        }
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Long id) {
        try {
            if (itemRepository.existsById(id)) {
                itemRepository.deleteById(id);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error deleting item: " + e.getMessage());
        }
    }

    @PostMapping("/sync-drafts")
    public ResponseEntity<?> syncDrafts(@RequestBody List<Item> drafts) {
        try {
            int successCount = 0;
            int updatedCount = 0;
            int failureCount = 0;
            Map<String, Object> result = new HashMap<>();
            
            for (Item draft : drafts) {
                // Check if item with same name and category already exists
                Optional<Item> existingItem = itemRepository.findByItemNameAndCategory(draft.getItemName(), draft.getCategory());
                
                if (existingItem.isPresent()) {
                    // Update existing item quantity instead of creating duplicate
                    Item itemToUpdate = existingItem.get();
                    itemToUpdate.setQuantity(itemToUpdate.getQuantity() + draft.getQuantity());
                    // Update prices if provided
                    if (draft.getBuyingPrice() != null && draft.getBuyingPrice().compareTo(BigDecimal.ZERO) > 0) {
                        itemToUpdate.setBuyingPrice(draft.getBuyingPrice());
                    }
                    if (draft.getSellingPrice() != null && draft.getSellingPrice().compareTo(BigDecimal.ZERO) > 0) {
                        itemToUpdate.setSellingPrice(draft.getSellingPrice());
                    }
                    itemRepository.save(itemToUpdate);
                    updatedCount++;
                } else if (!itemRepository.existsByItemCode(draft.getItemCode())) {
                    itemRepository.save(draft);
                    successCount++;
                } else {
                    failureCount++;
                }
            }
            
            result.put("successCount", successCount);
            result.put("updatedCount", updatedCount);
            result.put("failureCount", failureCount);
            result.put("message", "Sync completed");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error syncing drafts: " + e.getMessage());
        }
    }

    @GetMapping("/items/summary")
    public ResponseEntity<?> getCategorySummary() {
        try {
            List<Item> allItems = itemRepository.findAll();
            
            if (allItems.isEmpty()) {
                return ResponseEntity.ok(new ArrayList<CategorySummary>());
            }
            
            // Group items by category and calculate summaries
            Map<String, List<Item>> itemsByCategory = allItems.stream()
                .collect(Collectors.groupingBy(item -> item.getCategory().name()));
            
            List<CategorySummary> summaries = new ArrayList<>();
            
            for (Map.Entry<String, List<Item>> entry : itemsByCategory.entrySet()) {
                String category = entry.getKey();
                List<Item> items = entry.getValue();
                
                long totalItems = items.size();
                int totalQuantity = items.stream().mapToInt(Item::getQuantity).sum();
                BigDecimal totalValue = items.stream()
                    .map(item -> item.getSellingPrice().multiply(new BigDecimal(item.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                
                summaries.add(new CategorySummary(
                    category,
                    totalItems,
                    totalQuantity,
                    totalValue
                ));
            }
            
            // Sort by category name
            summaries.sort(Comparator.comparing(CategorySummary::getCategory));
            
            return ResponseEntity.ok(summaries);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching category summary: " + e.getMessage());
        }
    }

    @GetMapping("/items/search")
    public ResponseEntity<?> searchItems(@RequestParam String query) {
        try {
            List<Item> allItems = itemRepository.findAll();
            String searchQuery = query.toLowerCase();
            
            List<Item> filteredItems = allItems.stream()
                .filter(item -> item.getItemName().toLowerCase().contains(searchQuery) || 
                             item.getItemCode().toLowerCase().contains(searchQuery) ||
                             item.getCategory().name().toLowerCase().contains(searchQuery))
                .limit(10) // Limit results for better performance
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(filteredItems);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error searching items: " + e.getMessage());
        }
    }
}