document.addEventListener("DOMContentLoaded", () => {
    const API_URL = "http://localhost:8080/api";
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const errorMessage = document.getElementById("errorMessage");
    const togglePassword = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    const rememberMeCheckbox = document.getElementById("rememberMe");

    // Toggle password visibility
    togglePassword.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);
        
        // Toggle icon
        togglePassword.innerHTML = type === "password" 
            ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
               </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
               </svg>`;
    });

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add("show");
        setTimeout(() => {
            errorMessage.classList.remove("show");
        }, 5000);
    }

    // Handle login form submission
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        
        if (!username || !password) {
            showError("Please fill in all fields");
            return;
        }

        // Show loading state
        loginBtn.classList.add("loading");
        loginBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Store authentication data
                const authData = {
                    token: data.token || data.sessionId,
                    username: data.username || username,
                    userId: data.userId,
                    expiresAt: data.expiresAt || (Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
                };

                if (rememberMeCheckbox.checked) {
                    localStorage.setItem("authData", JSON.stringify(authData));
                } else {
                    sessionStorage.setItem("authData", JSON.stringify(authData));
                }

                // Redirect to dashboard
                window.location.href = "dashboard.html";
            } else {
                showError(data.message || "Login failed. Please check your credentials.");
            }
        } catch (error) {
            console.error("Login error:", error);
            showError("Network error. Please check your connection and try again.");
        } finally {
            loginBtn.classList.remove("loading");
            loginBtn.disabled = false;
        }
    });

    // Check if user is already logged in
    function checkAuthStatus() {
        const localAuth = localStorage.getItem("authData");
        const sessionAuth = sessionStorage.getItem("authData");
        
        if (localAuth || sessionAuth) {
            const authData = JSON.parse(localAuth || sessionAuth);
            
            // Check if token is still valid
            if (authData.expiresAt && Date.now() < authData.expiresAt) {
                // User is logged in, redirect to dashboard
                window.location.href = "dashboard.html";
            } else {
                // Token expired, clear storage
                localStorage.removeItem("authData");
                sessionStorage.removeItem("authData");
            }
        }
    }

    // Auto-logout after inactivity (30 minutes)
    let inactivityTimer;
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            localStorage.removeItem("authData");
            sessionStorage.removeItem("authData");
            window.location.href = "login.html";
        }, 30 * 60 * 1000); // 30 minutes
    }

    // Set up inactivity tracking
    document.addEventListener("mousemove", resetInactivityTimer);
    document.addEventListener("keypress", resetInactivityTimer);
    document.addEventListener("click", resetInactivityTimer);

    // Check auth status on page load
    checkAuthStatus();
    resetInactivityTimer();
});