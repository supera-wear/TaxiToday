/**
 * TaxiToday.nl - Authentication Management
 * This file handles user login, registration, and authentication state management.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth module loaded');
    
    // Initialize authentication UI
    initAuthUI();
    
    // Setup form submit event listeners
    setupFormListeners();
    
    // Handle tab switching (login/register)
    setupTabSwitching();
});

/**
 * Initialize authentication UI based on current auth state
 */
function initAuthUI() {
    // Check if user is logged in
    const token = getCookie('token') || localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        console.log('User is logged in');
        updateAuthStatus(true);
        
        // Check if redirected from login page
        const urlParams = new URLSearchParams(window.location.search);
        const redirectUrl = urlParams.get('redirect');
        
        if (redirectUrl) {
            // Redirect to the original requested page
            window.location.href = redirectUrl;
        }
    } else {
        console.log('User is not logged in');
        updateAuthStatus(false);
    }
}

/**
 * Setup login and registration form listeners
 */
function setupFormListeners() {
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Show loading state
            const submitButton = loginForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Inloggen...';
            submitButton.disabled = true;
            
            // Hide any previous error
            hideError();
            
            // Call login API
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store auth token and user data
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userData', JSON.stringify(data.user));
                    
                    // Get redirect URL if any
                    const urlParams = new URLSearchParams(window.location.search);
                    const redirectUrl = urlParams.get('redirect') || 'index.html';
                    
                    // Update UI with success message before redirect
                    showSuccess('Login succesvol! U wordt doorgestuurd...');
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = redirectUrl;
                    }, 1000);
                } else {
                    // Show error message
                    showError(data.message || 'Inloggen mislukt. Controleer uw gegevens.');
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                showError('Er is een fout opgetreden. Probeer het later opnieuw.');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            });
        });
    }
    
    // Register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            // Validate passwords match
            if (password !== confirmPassword) {
                showError('Wachtwoorden komen niet overeen.');
                return;
            }
            
            // Show loading state
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Registreren...';
            submitButton.disabled = true;
            
            // Hide any previous error
            hideError();
            
            // Call register API
            fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password }),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store auth token and user data
                    localStorage.setItem('authToken', data.token);
                    localStorage.setItem('userData', JSON.stringify(data.user));
                    
                    // Update UI with success message before redirect
                    showSuccess('Registratie succesvol! U wordt doorgestuurd...');
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = 'profile.html';
                    }, 1000);
                } else {
                    // Show error message
                    showError(data.message || 'Registratie mislukt.');
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                showError('Er is een fout opgetreden. Probeer het later opnieuw.');
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            });
        });
    }
}

/**
 * Setup tab switching between login and register forms
 */
function setupTabSwitching() {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginContent = document.getElementById('loginContent');
    const registerContent = document.getElementById('registerContent');
    
    if (loginTab && registerTab && loginContent && registerContent) {
        loginTab.addEventListener('click', function() {
            loginTab.classList.add('active', 'border-b-2', 'border-blue-500');
            loginTab.classList.remove('text-gray-500', 'border-transparent');
            registerTab.classList.remove('active', 'border-blue-500');
            registerTab.classList.add('text-gray-500', 'border-transparent');
            
            loginContent.classList.remove('hidden');
            registerContent.classList.add('hidden');
            
            hideError();
        });
        
        registerTab.addEventListener('click', function() {
            registerTab.classList.add('active', 'border-b-2', 'border-blue-500');
            registerTab.classList.remove('text-gray-500', 'border-transparent');
            loginTab.classList.remove('active', 'border-blue-500');
            loginTab.classList.add('text-gray-500', 'border-transparent');
            
            registerContent.classList.remove('hidden');
            loginContent.classList.add('hidden');
            
            hideError();
        });
    }
}

/**
 * Update authentication state UI elements 
 * @param {boolean} isLoggedIn - Whether user is authenticated
 */
function updateAuthStatus(isLoggedIn) {
    // Get all auth-related elements
    const loginBtns = document.querySelectorAll('.login-btn');
    const profileBtns = document.querySelectorAll('.profile-btn');
    const logoutBtns = document.querySelectorAll('.logout-btn');
    
    if (isLoggedIn) {
        // User is logged in - show profile/logout, hide login
        loginBtns.forEach(btn => btn.classList.add('hidden'));
        profileBtns.forEach(btn => btn.classList.remove('hidden'));
        logoutBtns.forEach(btn => btn.classList.remove('hidden'));
        
        // Add logout event listeners
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', handleLogout);
        });
        
        // Update user name if applicable
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(element => {
            if (userData.name) {
                element.textContent = userData.name;
            }
        });
    } else {
        // User is not logged in - show login, hide profile/logout
        loginBtns.forEach(btn => btn.classList.remove('hidden'));
        profileBtns.forEach(btn => btn.classList.add('hidden'));
        logoutBtns.forEach(btn => btn.classList.add('hidden'));
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    // Call logout API to invalidate server-side session
    fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(() => {
        // Clear local storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // Clear cookie (though the server should have done this)
        document.cookie = 'token=; Max-Age=0; path=/; domain=' + window.location.hostname;
        
        // Update UI
        updateAuthStatus(false);
        
        // Redirect to home page
        window.location.href = 'index.html';
    })
    .catch(error => {
        console.error('Logout error:', error);
        // Even if API fails, clear local storage and redirect
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'index.html';
    });
}

/**
 * Show error message in the error container
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorContainer = document.getElementById('errorMessage');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
    }
}

/**
 * Show success message in the error container (but styled as success)
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    const errorContainer = document.getElementById('errorMessage');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden', 'bg-red-100', 'text-red-700');
        errorContainer.classList.add('bg-green-100', 'text-green-700');
    }
}

/**
 * Hide the error/success message container
 */
function hideError() {
    const errorContainer = document.getElementById('errorMessage');
    if (errorContainer) {
        errorContainer.classList.add('hidden');
        errorContainer.classList.remove('bg-green-100', 'text-green-700');
        errorContainer.classList.add('bg-red-100', 'text-red-700');
    }
}

/**
 * Get a cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
 */
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}