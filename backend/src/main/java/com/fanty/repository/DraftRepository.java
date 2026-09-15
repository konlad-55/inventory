package com.fanty.repository;

import com.fanty.model.Draft;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DraftRepository extends JpaRepository<Draft, Long> {
}
