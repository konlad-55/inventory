package com.fanty.repository;

import com.fanty.model.Order;
import com.fanty.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    Optional<Order> findByOrderId(String orderId);
    
    boolean existsByOrderId(String orderId);
    
    List<Order> findByStatus(OrderStatus status);
    
    List<Order> findByCustomerNameContainingIgnoreCase(String customerName);
    
    @Query("SELECT o FROM Order o WHERE o.status = :status ORDER BY o.createdAt DESC")
    List<Order> findByStatusOrderByCreatedAtDesc(@Param("status") OrderStatus status);
    
    @Query("SELECT o FROM Order o ORDER BY o.createdAt DESC")
    List<Order> findAllOrderByCreatedAtDesc();
}