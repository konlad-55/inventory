package com.fanty.model;

import java.math.BigDecimal;

public class CategorySummary {
    private String category;
    private Long totalItems;
    private Integer totalQuantity;
    private BigDecimal totalValue;

    public CategorySummary() {}

    public CategorySummary(String category, Long totalItems, Integer totalQuantity, BigDecimal totalValue) {
        this.category = category;
        this.totalItems = totalItems;
        this.totalQuantity = totalQuantity;
        this.totalValue = totalValue;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Long getTotalItems() {
        return totalItems;
    }

    public void setTotalItems(Long totalItems) {
        this.totalItems = totalItems;
    }

    public Integer getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(Integer totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public BigDecimal getTotalValue() {
        return totalValue;
    }

    public void setTotalValue(BigDecimal totalValue) {
        this.totalValue = totalValue;
    }
}