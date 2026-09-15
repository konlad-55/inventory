package com.fanty.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "offline_drafts")
public class OfflineDraft {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "item_code", nullable = false, length = 50)
    private String itemCode;
    
    @Column(name = "item_name", nullable = false)
    private String itemName;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private Category category;
    
    @Column(name = "quantity", nullable = false)
    private Integer quantity;
    
    @Column(name = "buying_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal buyingPrice;
    
    @Column(name = "selling_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal sellingPrice;
    
    @Column(name = "device_id", length = 255)
    private String deviceId;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "synced_at")
    private LocalDateTime syncedAt;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private DraftStatus status;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = DraftStatus.PENDING;
        }
    }
    
    public OfflineDraft() {}
    
    public OfflineDraft(String itemCode, String itemName, Category category, Integer quantity,
                        BigDecimal buyingPrice, BigDecimal sellingPrice, String deviceId) {
        this.itemCode = itemCode;
        this.itemName = itemName;
        this.category = category;
        this.quantity = quantity;
        this.buyingPrice = buyingPrice;
        this.sellingPrice = sellingPrice;
        this.deviceId = deviceId;
        this.status = DraftStatus.PENDING;
    }
    
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
    
    public Category getCategory() {
        return category;
    }
    
    public void setCategory(Category category) {
        this.category = category;
    }
    
    public Integer getQuantity() {
        return quantity;
    }
    
    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
    
    public BigDecimal getBuyingPrice() {
        return buyingPrice;
    }
    
    public void setBuyingPrice(BigDecimal buyingPrice) {
        this.buyingPrice = buyingPrice;
    }
    
    public BigDecimal getSellingPrice() {
        return sellingPrice;
    }
    
    public void setSellingPrice(BigDecimal sellingPrice) {
        this.sellingPrice = sellingPrice;
    }
    
    public String getDeviceId() {
        return deviceId;
    }
    
    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getSyncedAt() {
        return syncedAt;
    }
    
    public void setSyncedAt(LocalDateTime syncedAt) {
        this.syncedAt = syncedAt;
    }
    
    public DraftStatus getStatus() {
        return status;
    }
    
    public void setStatus(DraftStatus status) {
        this.status = status;
    }
}
