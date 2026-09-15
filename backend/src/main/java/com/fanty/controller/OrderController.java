package com.fanty.controller;

import com.fanty.model.Order;
import com.fanty.model.OrderItem;
import com.fanty.model.OrderStatus;
import com.fanty.model.Item;
import com.fanty.repository.OrderRepository;
import com.fanty.repository.OrderItemRepository;
import com.fanty.repository.ItemRepository;
import com.fanty.repository.DraftRepository;
import com.fanty.model.Draft;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private OrderItemRepository orderItemRepository;
    
    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private DraftRepository draftRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // Generate unique order ID
    private String generateOrderId() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String random = String.format("%04d", new Random().nextInt(10000));
        return "ORD-" + timestamp + "-" + random;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> orderData) {
        try {
            String requestedOrderId = (String) orderData.get("orderId");
            Order order = requestedOrderId == null ? new Order() :
                orderRepository.findByOrderId(requestedOrderId).orElse(new Order());
            if (order.getOrderId() == null) {
                order.setOrderId(generateOrderId());
            }
            order.setCustomerName((String) orderData.get("customerName"));
            order.setStatus(OrderStatus.COMPLETED);
            order.setTotalItems(0);
            order.setTotalValue(BigDecimal.ZERO);
            order.getOrderItems().clear();
            
            List<Item> updatedItems = new ArrayList<>();
            
            // Process order items if provided
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> itemsData = (List<Map<String, Object>>) orderData.get("items");
            if (itemsData != null && !itemsData.isEmpty()) {
                for (Map<String, Object> itemData : itemsData) {
                    String itemCode = (String) itemData.get("itemCode");
                    Integer quantityOut = ((Number) itemData.get("quantityOut")).intValue();
                    
                    // Find the item and deduct quantity
                    Optional<Item> itemOpt = itemRepository.findByItemCode(itemCode);
                    if (itemOpt.isPresent()) {
                        Item item = itemOpt.get();
                        
                        // Check if sufficient quantity
                        if (item.getQuantity() < quantityOut) {
                            throw new RuntimeException("Insufficient quantity for item " + itemCode + 
                                ". Available: " + item.getQuantity() + ", Requested: " + quantityOut);
                        }
                        
                        // Deduct quantity
                        item.setQuantity(item.getQuantity() - quantityOut);
                        Item updatedItem = itemRepository.save(item);
                        updatedItems.add(updatedItem);
                        
                        // Create order item
                        OrderItem orderItem = new OrderItem();
                        orderItem.setItemCode(itemCode);
                        orderItem.setItemName((String) itemData.get("itemName"));
                        orderItem.setCategory((String) itemData.get("category"));
                        orderItem.setQuantityOut(quantityOut);
                        orderItem.setSellingPrice(new BigDecimal(itemData.get("sellingPrice").toString()));
                        order.addOrderItem(orderItem);
                    } else {
                        throw new RuntimeException("Item not found: " + itemCode);
                    }
                }
                updateOrderTotals(order);
            }
            
            Order savedOrder = orderRepository.save(order);
            
            // Return order with updated items
            Map<String, Object> response = new HashMap<>();
            response.put("order", savedOrder);
            response.put("updatedItems", updatedItems);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Transaction will automatically rollback due to @Transactional
            return ResponseEntity.internalServerError().body("Error creating order: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateOrder(@PathVariable Long id, @RequestBody Map<String, Object> orderData) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(id);
            if (!orderOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Order order = orderOpt.get();
            
            // Update order fields
            if (orderData.containsKey("customerName")) {
                order.setCustomerName((String) orderData.get("customerName"));
            }
            if (orderData.containsKey("status")) {
                String statusStr = (String) orderData.get("status");
                order.setStatus(OrderStatus.valueOf(statusStr.toUpperCase()));
            }
            
            // Update order items if provided
            if (orderData.containsKey("items")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> itemsData = (List<Map<String, Object>>) orderData.get("items");
                
                // Remove existing items
                order.getOrderItems().clear();
                
                // Add new items
                for (Map<String, Object> itemData : itemsData) {
                    OrderItem orderItem = new OrderItem();
                    orderItem.setItemCode((String) itemData.get("itemCode"));
                    orderItem.setItemName((String) itemData.get("itemName"));
                    orderItem.setCategory((String) itemData.get("category"));
                    orderItem.setQuantityOut(((Number) itemData.get("quantityOut")).intValue());
                    orderItem.setSellingPrice(new BigDecimal(itemData.get("sellingPrice").toString()));
                    order.addOrderItem(orderItem);
                }
                updateOrderTotals(order);
            }
            
            Order savedOrder = orderRepository.save(order);
            return ResponseEntity.ok(savedOrder);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error updating order: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOrder(@PathVariable Long id) {
        try {
            if (orderRepository.existsById(id)) {
                orderRepository.deleteById(id);
                return ResponseEntity.ok().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error deleting order: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id) {
        try {
            Optional<Order> order = orderRepository.findById(id);
            if (order.isPresent()) {
                return ResponseEntity.ok(order.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching order: " + e.getMessage());
        }
    }

    @GetMapping("/order-id/{orderId}")
    public ResponseEntity<?> getOrderByOrderId(@PathVariable String orderId) {
        try {
            Optional<Order> order = orderRepository.findByOrderId(orderId);
            if (order.isPresent()) {
                return ResponseEntity.ok(order.get());
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching order: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllOrders() {
        try {
            List<Order> orders = orderRepository.findAllOrderByCreatedAtDesc();
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching orders: " + e.getMessage());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getOrderHistory() {
        try {
            List<Order> orders = orderRepository.findAllOrderByCreatedAtDesc();
            
            List<Map<String, Object>> orderSummaries = orders.stream()
                .map(order -> {
                    Map<String, Object> summary = new HashMap<>();
                    summary.put("id", order.getId());
                    summary.put("orderId", order.getOrderId());
                    summary.put("customerName", order.getCustomerName());
                    summary.put("status", order.getStatus().name());
                    summary.put("totalItems", order.getTotalItems());
                    summary.put("totalValue", order.getTotalValue());
                    summary.put("createdAt", order.getCreatedAt());
                    summary.put("updatedAt", order.getUpdatedAt());
                    return summary;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(orderSummaries);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching order history: " + e.getMessage());
        }
    }

    @GetMapping("/drafts")
    public ResponseEntity<?> getDraftOrders() {
        try {
            List<Order> draftOrders = orderRepository.findByStatusOrderByCreatedAtDesc(OrderStatus.DRAFT);
            return ResponseEntity.ok(draftOrders);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error fetching draft orders: " + e.getMessage());
        }
    }

    @PostMapping("/draft")
    public ResponseEntity<?> saveDraft(@RequestBody Map<String, Object> draftData) {
        try {
            String orderId = (String) draftData.get("orderId");
            
            Order order;
            if (orderId != null && !orderId.isEmpty()) {
                // Update existing draft
                Optional<Order> existingOrder = orderRepository.findByOrderId(orderId);
                if (existingOrder.isPresent()) {
                    order = existingOrder.get();
                } else {
                    // Create new draft
                    order = new Order();
                    order.setOrderId(generateOrderId());
                }
            } else {
                // Create new draft
                order = new Order();
                order.setOrderId(generateOrderId());
            }
            
            order.setCustomerName((String) draftData.get("customerName"));
            order.setStatus(OrderStatus.DRAFT);
            
            // Update order items
            if (draftData.containsKey("items")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> itemsData = (List<Map<String, Object>>) draftData.get("items");
                
                order.getOrderItems().clear();
                
                for (Map<String, Object> itemData : itemsData) {
                    OrderItem orderItem = new OrderItem();
                    orderItem.setItemCode((String) itemData.get("itemCode"));
                    orderItem.setItemName((String) itemData.get("itemName"));
                    orderItem.setCategory((String) itemData.get("category"));
                    orderItem.setQuantityOut(((Number) itemData.get("quantityOut")).intValue());
                    orderItem.setSellingPrice(new BigDecimal(itemData.get("sellingPrice").toString()));
                    order.addOrderItem(orderItem);
                }
                updateOrderTotals(order);
            }
            
            Order savedOrder = orderRepository.save(order);
            draftRepository.save(new Draft(savedOrder, objectMapper.writeValueAsString(draftData)));
            return ResponseEntity.ok(savedOrder);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error saving draft: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/complete")
    @Transactional
    public ResponseEntity<?> completeOrder(@PathVariable Long id) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(id);
            if (!orderOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            
            Order order = orderOpt.get();
            
            // Only deduct quantities if order is not already completed
            if (order.getStatus() != OrderStatus.COMPLETED) {
                List<Item> updatedItems = new ArrayList<>();
                
                for (OrderItem orderItem : order.getOrderItems()) {
                    String itemCode = orderItem.getItemCode();
                    Integer quantityOut = orderItem.getQuantityOut();
                    
                    // Find the item and deduct quantity
                    Optional<Item> itemOpt = itemRepository.findByItemCode(itemCode);
                    if (itemOpt.isPresent()) {
                        Item item = itemOpt.get();
                        
                        // Check if sufficient quantity
                        if (item.getQuantity() < quantityOut) {
                            throw new RuntimeException("Insufficient quantity for item " + itemCode + 
                                ". Available: " + item.getQuantity() + ", Requested: " + quantityOut);
                        }
                        
                        // Deduct quantity
                        item.setQuantity(item.getQuantity() - quantityOut);
                        Item updatedItem = itemRepository.save(item);
                        updatedItems.add(updatedItem);
                    } else {
                        throw new RuntimeException("Item not found: " + itemCode);
                    }
                }
                
                order.setStatus(OrderStatus.COMPLETED);
                Order savedOrder = orderRepository.save(order);
                
                // Return order with updated items
                Map<String, Object> response = new HashMap<>();
                response.put("order", savedOrder);
                response.put("updatedItems", updatedItems);
                
                return ResponseEntity.ok(response);
            } else {
                // Order already completed, just return it
                Map<String, Object> response = new HashMap<>();
                response.put("order", order);
                response.put("updatedItems", new ArrayList<>());
                
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            // Transaction will automatically rollback due to @Transactional
            return ResponseEntity.internalServerError().body("Error completing order: " + e.getMessage());
        }
    }

    private void updateOrderTotals(Order order) {
        int totalItems = order.getOrderItems().size();
        BigDecimal totalValue = order.getOrderItems().stream()
            .map(item -> {
                BigDecimal subtotal = item.getSellingPrice()
                    .multiply(BigDecimal.valueOf(item.getQuantityOut()));
                item.setSubtotal(subtotal);
                return subtotal;
            })
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        order.setTotalItems(totalItems);
        order.setTotalValue(totalValue);
    }
}