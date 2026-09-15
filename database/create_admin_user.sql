-- Create default admin user
-- Password: admin123 (will be BCrypt encoded)
-- Run this after creating the database schema

USE fanty_inventory;

INSERT INTO users (username, email, password, role, active) 
VALUES ('admin', 'fanty@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'ADMIN', TRUE)
ON DUPLICATE KEY UPDATE username=username;