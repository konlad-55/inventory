package com.fanty.controller;

import com.fanty.model.User;
import com.fanty.repository.UserRepository;
import com.fanty.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> registrationData) {
        try {
            String username = registrationData.get("username");
            String email = registrationData.get("email");
            String password = registrationData.get("password");

            // Validate input
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Username is required"));
            }
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Password is required"));
            }

            // Check if user already exists
            if (userRepository.existsByUsername(username)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
            }
            if (userRepository.existsByEmail(email)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
            }

            // Create new user
            User user = new User();
            user.setUsername(username.trim());
            user.setEmail(email.trim());
            user.setPassword(passwordEncoder.encode(password));
            user.setRole("USER");
            user.setActive(true);

            User savedUser = userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                "message", "User registered successfully",
                "userId", savedUser.getId(),
                "username", savedUser.getUsername()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
        try {
            String username = loginData.get("username");
            String password = loginData.get("password");

            // Validate input
            if (username == null || username.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Username is required"));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Password is required"));
            }

            // Find user
            User user = userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Check if user is active
            if (!user.getActive()) {
                return ResponseEntity.status(403).body(Map.of("message", "Account is deactivated"));
            }

            // Verify password
            if (!passwordEncoder.matches(password, user.getPassword())) {
                return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
            }

            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            // Generate JWT token
            String token = jwtUtil.generateToken(user.getUsername(), user.getRole());

            return ResponseEntity.ok(Map.of(
                "message", "Login successful",
                "token", token,
                "username", user.getUsername(),
                "userId", user.getId(),
                "role", user.getRole(),
                "expiresAt", System.currentTimeMillis() + 24 * 60 * 60 * 1000 // 24 hours
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Login failed: " + e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        // In a stateless JWT setup, logout is handled client-side by removing the token
        // This endpoint can be used for any server-side cleanup if needed
        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String username = jwtUtil.extractUsername(token);
                
                if (username != null && jwtUtil.validateToken(token, username)) {
                    User user = userRepository.findByUsername(username)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                    
                    return ResponseEntity.ok(Map.of(
                        "valid", true,
                        "username", user.getUsername(),
                        "role", user.getRole()
                    ));
                }
            }
            
            return ResponseEntity.status(401).body(Map.of("valid", false, "message", "Invalid token"));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("valid", false, "message", "Token validation failed"));
        }
    }
}