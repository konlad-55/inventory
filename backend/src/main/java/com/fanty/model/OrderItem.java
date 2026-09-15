package com.fanty.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
public class OrderItem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "item_code", nullable = false, length = 50)
    private String itemCode;
    
    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "category", length = 50)
    private String category;
    
    @Column(name = "quantity_out", nullable = false)
    private Integer quantityOut;
    
    @Column(name = "selling_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal sellingPrice;
    
    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Order order;
    
    @PrePersist
    @PreUpdate
    protected void calculateSubtotal() {
        if (quantityOut != null && sellingPrice != null) {
            this.subtotal = sellingPrice.multiply(new BigDecimal(quantityOut));
        }
    }
    
    public OrderItem() {}
    
    public OrderItem(String itemCode, String itemName, Integer quantityOut, BigDecimal sellingPrice) {
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.quantityOut = quantityOut;
        this.sellingPrice = sellingPrice;
        calculateSubtotal();
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getItemCode() {
        return itemCode;
    }
    
    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }
    
    public String getItemName() {
        return itemName;
    }
    
    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
    
    public Integer getQuantityOut() {
        return quantityOut;
    }
    
    public void setQuantityOut(Integer quantityOut) {
        this.quantityOut = quantityOut;
    }
    
    public BigDecimal getSellingPrice() {
        return sellingPrice;
    }
    
    public void setSellingPrice(BigDecimal sellingPrice) {
        this.sellingPrice = sellingPrice;
    }
    
    public BigDecimal getSubtotal() {
        return subtotal;
    }
    
    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }
    
    public Order getOrder() {
        return order;
    }
    
    public void setOrder(Order order) {
        this.order = order;
    }
}