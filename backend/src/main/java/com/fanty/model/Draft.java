package com.fanty.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "drafts")
public class Draft {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Order order;

    @Lob
    @Column(name = "saved_data", nullable = false, columnDefinition = "json")
    private String savedData;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Draft() {}

    public Draft(Order order, String savedData) {
        this.order = order;
        this.savedData = savedData;
    }

    public Long getId() {
        return id;
    }

    public Order getOrder() {
        return order;
    }

    public String getSavedData() {
        return savedData;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
