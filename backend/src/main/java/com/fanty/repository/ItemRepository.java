package com.fanty.repository;

import com.fanty.model.Item;
import com.fanty.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
    
    Optional<Item> findByItemCode(String itemCode);
    
    boolean existsByItemCode(String itemCode);
    
    List<Item> findByCategory(Category category);
    
    Optional<Item> findByItemNameAndCategory(String itemName, Category category);
    
    @Query("SELECT i.itemName FROM Item i WHERE i.itemName LIKE %:name%")
    List<String> findItemNamesByNameContaining(@Param("name") String name);
    
    @Query("SELECT DISTINCT i.itemName FROM Item i")
    List<String> findAllItemNames();
}
