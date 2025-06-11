document.addEventListener('DOMContentLoaded', function() {
    window.scrollTo({ top: 0, behavior: 'auto' });
    console.log('TaxiToday Website Loaded!');

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Initialize global Mapbox variables
    const mapboxToken = 'pk.eyJ1IjoidWx0cmFvbmUiLCJhIjoiY21hMnltM3pvMWZvbTJrc2hsY2xhNG1maSJ9.SPMu8e7QcnGyhoLWhmeYtw';
    let mapboxScriptLoaded = false;
    let pickupMarker, destMarker;
    let routeSource;
    let routeCoordinates = [];
    let distanceInKm = 0;
    const baseFare = 2.95; // Base fare in euros
    const pricePerKm = 2.50; // Price per kilometer
    
    // Map and input elements
    const mapElement = document.getElementById('map');
    const pickupInput = document.getElementById('pickup');
    const destinationInput = document.getElementById('destination');
    const headerSearchInput = document.getElementById('header-search');
    let map;
    
    // Initialize Mapbox directly since scripts are now included in HTML
    const loadMapboxScripts = () => {
        console.log('Initializing Mapbox...');
        // Scripts are already loaded in HTML, so just initialize
        mapboxScriptLoaded = true;
        initializeMapbox();
    };
    
    // Initialize Mapbox Map and Geocoder
    const initializeMapbox = () => {
        // Set access token
        mapboxgl.accessToken = mapboxToken;
        console.log('Mapbox initialized with token');
        
        // Initialize map if it exists on the page
        if (mapElement) {
            console.log('Creating map...');
            // Create the map
            map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [4.8952, 52.3702], // Amsterdam
                zoom: 9
            });
            
            // Add navigation controls
            map.addControl(new mapboxgl.NavigationControl());
            
            // Setup geocoders for the booking form
            setupBookingFormGeocoders();
        }
        
        // Setup header search regardless of map presence
        setupHeaderSearch();
    };
    
    // Setup the booking form geocoders
    const setupBookingFormGeocoders = () => {
        if (!pickupInput || !destinationInput) return;
        console.log('Setting up booking form geocoders...');
        
        // Create geocoders for pickup and destination
        const pickupGeocoder = new MapboxGeocoder({
            accessToken: mapboxToken,
            mapboxgl: mapboxgl,
            marker: false,
            placeholder: 'Ophaaladres',
            countries: 'nl',
            language: 'nl',
            minLength: 2,
            limit: 5,
            flyTo: false,
        });
        
        const destGeocoder = new MapboxGeocoder({
            accessToken: mapboxToken,
            mapboxgl: mapboxgl,
            marker: false,
            placeholder: 'Bestemmingsadres',
            countries: 'nl',
            language: 'nl',
            minLength: 2,
            limit: 5,
            flyTo: false,
        });
        
        // Create geocoder containers
        const pickupContainer = document.createElement('div');
        pickupContainer.className = 'geocoder-container';
        pickupInput.insertAdjacentElement('beforebegin', pickupContainer);
        pickupGeocoder.addTo(pickupContainer);
        
        const destContainer = document.createElement('div');
        destContainer.className = 'geocoder-container';
        destinationInput.insertAdjacentElement('beforebegin', destContainer);
        destGeocoder.addTo(destContainer);
        
        // Hide original inputs but keep them in the DOM for form submissions
        pickupInput.style.opacity = '0';
        pickupInput.style.height = '0';
        pickupInput.style.padding = '0';
        pickupInput.style.margin = '0';
        pickupInput.style.position = 'absolute';
        pickupInput.style.pointerEvents = 'none';
        
        destinationInput.style.opacity = '0';
        destinationInput.style.height = '0';
        destinationInput.style.padding = '0';
        destinationInput.style.margin = '0';
        destinationInput.style.position = 'absolute';
        destinationInput.style.pointerEvents = 'none';
        
        // Handle pickup selection
        pickupGeocoder.on('result', (e) => {
            const result = e.result;
            pickupInput.value = result.place_name;
            console.log('Pickup location selected:', result.place_name);
            
            // Remove old marker if exists
            if (pickupMarker) pickupMarker.remove();
            
            // Add new marker
            pickupMarker = new mapboxgl.Marker({ color: '#3b82f6' })
                .setLngLat(result.geometry.coordinates)
                .addTo(map);
            
            // Update map view
            updateMapView();
        });
        
        // Handle destination selection
        destGeocoder.on('result', (e) => {
            const result = e.result;
            destinationInput.value = result.place_name;
            console.log('Destination location selected:', result.place_name);
            
            // Remove old marker if exists
            if (destMarker) destMarker.remove();
            
            // Add new marker
            destMarker = new mapboxgl.Marker({ color: '#ef4444' })
                .setLngLat(result.geometry.coordinates)
                .addTo(map);
            
            // Update map view
            updateMapView();
        });
    };
    
    // Setup the header search
    const setupHeaderSearch = () => {
        if (!headerSearchInput) return;
        console.log('Setting up header search...');
        
        // Create and add the geocoder
        const headerGeocoder = new MapboxGeocoder({
            accessToken: mapboxToken,
            mapboxgl: mapboxgl,
            marker: false,
            placeholder: 'Zoek locatie...',
            countries: 'nl',
            language: 'nl',
            minLength: 2,
            limit: 5,
        });
        
        // Create custom container for header search
        const headerSearchContainer = document.createElement('div');
        headerSearchContainer.className = 'w-full';
        headerSearchInput.parentNode.replaceChild(headerSearchContainer, headerSearchInput);
        headerGeocoder.addTo(headerSearchContainer);
        
        // Handle search selection
        headerGeocoder.on('result', (e) => {
            const result = e.result;
            console.log('Header search location selected:', result.place_name);
            
            // If on a page with booking form, fill pickup address
            if (pickupInput) {
                pickupInput.value = result.place_name;
                
                // If using a visual geocoder, update it
                const mbgInput = document.querySelector('.mapboxgl-ctrl-geocoder input');
                if (mbgInput) mbgInput.value = result.place_name;
                
                // Scroll to booking section
                const bookingSection = document.getElementById('booking');
                if (bookingSection) bookingSection.scrollIntoView({ behavior: 'smooth' });
                
                // If map exists, update the marker and view
                if (map) {
                    if (pickupMarker) pickupMarker.remove();
                    
                    pickupMarker = new mapboxgl.Marker({ color: '#3b82f6' })
                        .setLngLat(result.geometry.coordinates)
                        .addTo(map);
                    
                    updateMapView();
                }
            }
        });
    };
    
    // Helper function to update map view based on markers
    const updateMapView = () => {
        if (!map) return;
        
        if (pickupMarker && destMarker) {
            // If both markers exist, fit bounds to show both
            const bounds = new mapboxgl.LngLatBounds()
                .extend(pickupMarker.getLngLat())
                .extend(destMarker.getLngLat());
            
            // Draw a route between the markers
            getRoute(pickupMarker.getLngLat(), destMarker.getLngLat());
            
            map.fitBounds(bounds, {
                padding: 50,
                maxZoom: 15
            });
        } else if (pickupMarker) {
            // Only pickup marker exists
            map.flyTo({
                center: pickupMarker.getLngLat(),
                zoom: 12
            });
        } else if (destMarker) {
            // Only destination marker exists
            map.flyTo({
                center: destMarker.getLngLat(),
                zoom: 12
            });
        }
    };
    
    // Get route between two points and draw on map
    const getRoute = (start, end) => {
        // Make a request to the Mapbox Directions API
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&access_token=${mapboxToken}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    routeCoordinates = route.geometry.coordinates;
                    
                    // Calculate distance in kilometers
                    distanceInKm = route.distance / 1000;
                    console.log(`Route distance: ${distanceInKm.toFixed(2)} km`);
                    
                    // Check if the route source already exists
                    if (!map.getSource('route')) {
                        // Initialize the route layer and source
                        map.on('load', () => {
                            addRouteToMap();
                        });
                        
                        // If the map is already loaded
                        if (map.loaded()) {
                            addRouteToMap();
                        }
                    } else {
                        // Update the existing route
                        map.getSource('route').setData({
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                                'type': 'LineString',
                                'coordinates': routeCoordinates
                            }
                        });
                    }
                }
            })
            .catch(error => console.error('Error fetching route:', error));
    };
    
    // Add route source and layer to map
    const addRouteToMap = () => {
        map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': routeCoordinates
                }
            }
        });
        
        map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#3b82f6',
                'line-width': 5,
                'line-opacity': 0.75
            }
        }, 'waterway-label');
    };
    
    // Load Mapbox scripts
    if (mapElement || headerSearchInput) {
        loadMapboxScripts();
    }

    // Booking preset functionality
    const presetLinks = document.querySelectorAll('.book-preset');
    // Reuse the existing pickupInput variable
    const destInput = destinationInput; // Use existing destinationInput variable
    
    presetLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (pickupInput && destInput) {
                pickupInput.value = this.getAttribute('data-from');
                destInput.value = this.getAttribute('data-to');
                
                // Scroll to booking form
                document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Vehicle type selection
    const vehicleButtons = document.querySelectorAll('.booking-type-btn');
    vehicleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            vehicleButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
        });
    });

    // Add contact fields to the booking form
    const bookingFormContactFields = () => {
        const bookingForm = document.getElementById('bookingForm');
        const calculateBtn = document.getElementById('calculateBtn');
        
        if (bookingForm && calculateBtn) {
            // Create contact fields container
            const contactFieldsContainer = document.createElement('div');
            contactFieldsContainer.id = 'contact-fields';
            contactFieldsContainer.className = 'mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100 hidden';
            contactFieldsContainer.innerHTML = `
                <h4 class="font-bold mb-3 text-blue-800">Vul uw gegevens in om de prijs te bekijken</h4>
                <div class="space-y-3">
                    <div>
                        <label for="booking-email" class="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
                        <input type="email" id="booking-email" class="block w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="uw@email.nl" required>
                    </div>
                    <div>
                        <label for="booking-phone" class="block text-sm font-medium text-gray-700 mb-1">Telefoonnummer</label>
                        <input type="tel" id="booking-phone" class="block w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="06 12345678" required>
                    </div>
                    <button type="button" id="showPriceBtn" class="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-300">
                        <i class="fas fa-eye mr-2"></i> Bekijk Prijs
                    </button>
                </div>
            `;
            
            // Insert before the price summary
            const priceSummary = document.getElementById('price-summary');
            if (priceSummary) {
                priceSummary.parentNode.insertBefore(contactFieldsContainer, priceSummary);
            }
        }
    };
    
    // Call the function to add contact fields
    bookingFormContactFields();
    
    // Calculate price button
    const calculateBtn = document.getElementById('calculateBtn');
    const contactFields = document.getElementById('contact-fields');
    const priceSummary = document.getElementById('price-summary');
    const bookBtn = document.getElementById('bookBtn');
    const showPriceBtn = document.getElementById('showPriceBtn');
    
    // Calculate fare based on distance
    const calculateFare = () => {
        if (!distanceInKm) return null;
        
        // Calculate the fare components
        const rideFare = baseFare + (distanceInKm * pricePerKm);
        const serviceFee = 5.00; // Fixed service fee
        const subtotal = rideFare + serviceFee;
        const vat = subtotal * 0.09; // 9% VAT
        const total = subtotal + vat;
        
        return {
            rideFare: rideFare.toFixed(2),
            serviceFee: serviceFee.toFixed(2),
            vat: vat.toFixed(2),
            total: total.toFixed(2),
            distance: distanceInKm.toFixed(2)
        };
    };
    
    // Update the price summary display
    const updatePriceSummary = () => {
        const fare = calculateFare();
        if (!fare) return;
        
        // Update the price summary elements
        const summary = document.getElementById('price-summary');
        if (summary) {
            summary.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-700">Rijtarief (${fare.distance} km)</span>
                    <span>€${fare.rideFare}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-700">Servicekosten</span>
                    <span>€${fare.serviceFee}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-gray-700">BTW (9%)</span>
                    <span>€${fare.vat}</span>
                </div>
                <div class="border-t border-blue-200 my-2 pt-2 flex justify-between items-center font-bold">
                    <span>Totaal</span>
                    <span class="text-blue-600 text-xl">€${fare.total}</span>
                </div>
            `;
        }
    };
    
    if (calculateBtn && contactFields) {
        calculateBtn.addEventListener('click', function() {
            // Verify that we have both pickup and destination
            if (!pickupMarker || !destMarker) {
                alert('Vul alstublieft zowel ophaaladres als bestemmingsadres in.');
                return;
            }
            
            // Show contact fields first
            contactFields.classList.remove('hidden');
        });
    }
    
    if (showPriceBtn && priceSummary && bookBtn) {
        showPriceBtn.addEventListener('click', function() {
            const email = document.getElementById('booking-email').value;
            const phone = document.getElementById('booking-phone').value;
            
            // Validate email and phone
            if (email && phone) {
                // Gather all booking data
                const bookingData = {
                    pickup: document.getElementById('pickup').value,
                    destination: document.getElementById('destination').value,
                    date: document.getElementById('date').value,
                    time: document.getElementById('time').value,
                    passengers: document.getElementById('passengers').value,
                    luggage: document.getElementById('luggage').value,
                    vehicleType: document.querySelector('.booking-type-btn.active').getAttribute('data-vehicle'),
                    email: email,
                    phone: phone,
                    distance: distanceInKm
                };
                
                // Store booking data for price details page
                localStorage.setItem('priceCalculation', JSON.stringify(bookingData));
                
                // Redirect to price details page
                window.location.href = 'price-details.html';
            } else {
                alert('Vul alstublieft zowel e-mailadres als telefoonnummer in.');
            }
        });
    }

    // Auth-related functions
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }
    
    function isLoggedIn() {
        return !!getCookie('token') || !!localStorage.getItem('authToken');
    }
    
    // Check login status and update UI accordingly
    function updateAuthUI() {
        const loginButtons = document.querySelectorAll('.login-btn');
        const profileButtons = document.querySelectorAll('.profile-btn');
        const logoutButtons = document.querySelectorAll('.logout-btn');
        
        if (isLoggedIn()) {
            loginButtons.forEach(btn => btn.classList.add('hidden'));
            profileButtons.forEach(btn => btn.classList.remove('hidden'));
            logoutButtons.forEach(btn => btn.classList.remove('hidden'));
        } else {
            loginButtons.forEach(btn => btn.classList.remove('hidden'));
            profileButtons.forEach(btn => btn.classList.add('hidden'));
            logoutButtons.forEach(btn => btn.classList.add('hidden'));
        }
    }
    
    // Call this function on page load
    updateAuthUI();
    
    // Add event listener for logout buttons
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Call logout endpoint
            fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    localStorage.removeItem('authToken');
                    updateAuthUI();
                    // Redirect to home page
                    window.location.href = '/';
                }
            })
            .catch(error => {
                console.error('Logout error:', error);
            });
        });
    });
    
    // Booking form submission
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Gather form data
            const formData = {
                pickup: document.getElementById('pickup').value,
                destination: document.getElementById('destination').value,
                date: document.getElementById('date').value,
                time: document.getElementById('time').value,
                passengers: document.getElementById('passengers').value,
                luggage: document.getElementById('luggage').value,
                vehicleType: document.querySelector('.booking-type-btn.active').getAttribute('data-vehicle')
            };
            
            // Send booking to API
            fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store booking info for confirmation page
                    localStorage.setItem('lastBooking', JSON.stringify({
                        ...formData,
                        bookingId: data.bookingId,
                        estimatedPickup: data.estimatedPickup
                    }));
                    
                    // Redirect to confirmation page
                    window.location.href = 'booking-confirmation.html';
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Booking error:', error);
                alert('Error submitting booking. Please try again.');
            });
        });
    }

    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Gather form data
            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value
            };
            
            // Send contact form to API
            fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store contact info for confirmation page
                    localStorage.setItem('lastContact', JSON.stringify({
                        ...formData,
                        contactId: data.contactId
                    }));
                    
                    // Redirect to confirmation page
                    window.location.href = 'contact-confirmation.html';
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Contact form error:', error);
                alert('Error submitting contact form. Please try again.');
            });
        });
    }

    // ElevenLabs Convai agent integration is handled by the embed script
    // No additional JavaScript needed for the chat functionality
});