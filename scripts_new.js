// Slider Management
const sliders = {};

function initSlider(sliderId) {
    const slider = document.querySelector(`[data-slider-id="${sliderId}"]`);
    if (!slider) return;
    sliders[sliderId] = { currentSlide: 0 };
    sliders[sliderId].slideCount = slider.querySelectorAll('.slide').length;
}

function moveSlide(sliderId, direction) {
    const slider = sliders[sliderId];
    if (slider) {
        slider.currentSlide = (slider.currentSlide + direction + slider.slideCount) % slider.slideCount;
        const slides = document.querySelector(`[data-slider-id="${sliderId}"] .slides`);
        if (slides) {
            slides.style.transform = `translateX(-${slider.currentSlide * 100}%)`;
        }
    }
}

// Initialize static sliders
['dash-salon', 'booking-salon'].forEach(initSlider);

// Default Images and Placeholder
const defaultImages = [
    'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c2Fsb24lMjBpbnRlcmlvcnxlbnwwfDB8MHx8fDA%3D',
    'https://images.unsplash.com/photo-1720358787956-85c0bd0a8dbb?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8c2Fsb24lMjBpbnRlcmlvcnxlbnwwfDB8MHx8fDA%3D',
    'https://plus.unsplash.com/premium_photo-1664048713258-a1844e3d337f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8c2Fsb24lMjBpbnRlcmlvcnxlbnwwfDB8MHx8fDA%3D'
];
const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"%3E%3Crect width="300" height="200" fill="%23ddd"/%3E%3Ctext x="50%" y="50%" font-size="20" text-anchor="middle" fill="%23999" dy=".3em"%3EImage Loading...%3C/text%3E%3C/svg%3E';

// Helper to Format Time for Next Available Slot
function getNextAvailableTime(openTime, breaks = []) {
    let time = new Date(`2000-01-01T${openTime}`);
    time.setMinutes(time.getMinutes() + 30);
    const isBreak = breaks.some(b => {
        const breakStart = new Date(`2000-01-01T${b.from}`);
        const breakEnd = new Date(`2000-01-01T${b.to}`);
        return time >= breakStart && time < breakEnd;
    });
    if (isBreak) {
        time.setMinutes(time.getMinutes() + 30);
    }
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Loading Animation
function showLoadingAnimation(grid) {
    if (!grid) return () => {};
    grid.innerHTML = '<p id="loading-text" style="text-align: center; font-weight: bold; font-size: 1.2em;">loading.</p>';
    const states = ["loading.", "loading..", "loading...", "loading..", "loading.", "loading"];
    let index = 0;
    const interval = setInterval(() => {
        const loadingText = grid.querySelector('#loading-text');
        if (loadingText) {
            loadingText.textContent = states[index];
            index = (index + 1) % states.length;
        }
    }, 300);
    return () => {
        clearInterval(interval);
        grid.innerHTML = '';
    };
}

// Lazy-Load Images
function loadImagesForCard(card, images) {
    const slides = card.querySelectorAll('.slide');
    images.forEach((img, index) => {
        if (slides[index]) {
            const image = new Image();
            image.src = img;
            image.onload = () => {
                slides[index].style.backgroundImage = `url('${img}')`;
            };
            image.onerror = () => {
                slides[index].style.backgroundImage = `url('${defaultImages[index % defaultImages.length]}')`;
            };
        }
    });
}

// Track ongoing async operations
let currentAbortController = null;

// Track dashboard auto-reload
let dashboardReloadInterval = null;
let shouldScrollOnDashboard = true;

// Render Salons (Optimized)
async function renderSalons(signal) {
    const grid = document.getElementById('salon-grid');
    if (!grid) return;
    const clearLoading = showLoadingAnimation(grid);
    try {
        // Ensure salons is an array, fall back to empty array if null/undefined
        if (!Array.isArray(salons)) {
            salons = await getData("salons", { signal }) || [];
        }
        clearLoading();
        grid.innerHTML = '';
        if (salons.length === 0) {
            grid.innerHTML = '<p style="text-align: center;">No salons available. Register a salon to get started!</p>';
            return;
        }

        // Render cards with placeholders
        salons.forEach((salon, index) => {
            if(salon.status == "Active"){
                const sliderId = `salon-${index}`;
                const images = salon.salonImages?.length > 0 ? salon.salonImages : defaultImages;
                const nextAvailable = getNextAvailableTime(salon.openTime, salon.breaks);
                const card = document.createElement('div');
                card.className = 'salon-card';
                card.innerHTML = `
                    <div class="slider" data-slider-id="${sliderId}">
                        <div class="slides">
                            ${images.map(() => `<div class="slide" style="background-image: url('${placeholderImage}')"></div>`).join('')}
                        </div>
                        <button class="slider-btn prev" onclick="moveSlide('${sliderId}', -1)">❮</button>
                        <button class="slider-btn next" onclick="moveSlide('${sliderId}', 1)">❯</button>
                    </div>
                    <h3>${salon.salonName}</h3>
                    <div class="details">
                        <p style="font-size: medium; margin-bottom: -5px; margin-top: -8px;"><strong>Owner:</strong> ${salon.ownerName}</p>
                        <p class="location" style="font-size: medium; margin-bottom: -5px;"><strong>Location:</strong> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.location)}" target="_blank">${salon.location}</a></p>
                        <p style="font-size: medium; margin-bottom: -5px; margin-top: 15px;"><strong>Next Available:</strong> ${nextAvailable}</p>
                    </div>
                    <button class="btn" onclick="debounceShowSection('user-booking', '${salon.salonName}', '${salon.ownerName}', '${salon.location}')">Book Now</button>
                `;
                grid.appendChild(card);
                initSlider(sliderId);
            }
        });

        // Lazy-load images with IntersectionObserver
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const card = entry.target;
                    const index = Array.from(grid.children).indexOf(card);
                    const salon = salons[index];
                    const images = salon.salonImages?.length > 0 ? salon.salonImages : defaultImages;
                    loadImagesForCard(card, images);
                    observer.unobserve(card);
                }
            });
        }, { rootMargin: '100px' });

        grid.querySelectorAll('.salon-card').forEach(card => observer.observe(card));
    } catch (e) {
        if (e.name === 'AbortError') {
            console.log('Salon rendering aborted');
            return;
        }
        clearLoading();
        grid.innerHTML = '<p style="text-align: center; color: red;">Error loading salons. Please try again.</p>';
        console.error('Error rendering salons:', e);
    }
}

// Debounce utility to prevent rapid showSection calls
let lastSectionChange = 0;
function debounceShowSection(sectionId, ...args) {
    const now = Date.now();
    if (now - lastSectionChange < 100) return; // Skip if called within 100ms
    lastSectionChange = now;
    showSection(sectionId, ...args);
}

// Helper: Convert HH:MM AM/PM to minutes since midnight
function timeToMinutes(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
}

// Helper: Convert minutes since midnight to HH:MM AM/PM
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
}
// Section Toggling
async function showSection(sectionId, salonName, ownerName, location) {
    // Abort any ongoing async operations
    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    // Clear dashboard reload interval when leaving your-salon
    if (dashboardReloadInterval && sectionId !== 'your-salon') {
        clearInterval(dashboardReloadInterval);
        dashboardReloadInterval = null;
    }

    // Check if the target section is already active
    const targetSection = document.getElementById(sectionId);
    if (targetSection && targetSection.classList.contains('active')) return;

    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    if (!targetSection) return;
    targetSection.classList.add('active');
    const backBtn = document.getElementById('back-btn');
    if (sectionId === 'home') {
        backBtn.classList.remove('visible');
        await renderSalons(signal);
    } else {
        backBtn.classList.add('visible');
    }
    if (sectionId === 'your-salon') {
        // Set scroll flag for manual navigation
        shouldScrollOnDashboard = true;
        await showDashboard();
    } else if (sectionId === 'your-booked-salon') {
        // Fetch fresh bookings to ensure canceled bookings are excluded
        let bookings = await getData("bookings", { signal }) || [];
        const userBookings = bookings.filter(b => b.status === 'pending' && b.deviceId === deviceId);
        if (userBookings.length === 0) {
            const noBookingSection = document.getElementById('no-booking');
            if (noBookingSection) {
                noBookingSection.classList.add('active');
                document.getElementById('your-booked-salon').classList.remove('active');
            }
        } else {
            await renderUserBookings(userBookings);
        }
    } else if (sectionId === 'user-booking' && salonName) {
        document.getElementById('customer-name').value = "";
        document.getElementById('booking-salon-name').textContent = salonName;
        document.getElementById('booking-owner-name').textContent = `Owner: ${ownerName}`;
        document.getElementById('booking-location').innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}" target="_blank">${location}</a>`;
        
        
        const salon = salons.find(s => s.salonName === salonName);
        const serviceSelect = document.getElementById('booking-service');
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Select Service</option>';
            if (salon && salon.services) {
                salon.services.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.name;
                    option.textContent = `${service.name} (PKR ${service.price}, ${service.time} min)`;
                    serviceSelect.appendChild(option);
                });
            }
        }
        OnBookService_Choice();        
        /*
        const timeSelect = document.getElementById('booking-time');
        if (timeSelect) {
            timeSelect.innerHTML = '<option value="token">Token</option>';
            timeSelect.innerHTML = '';
            if (salon) {
                const nowTime = new Date();
                const start = new Date(`2000-01-01T${salon.openTime}`);
                const end = new Date(`2000-01-01T${salon.closeTime}`);
                const breaks = salon.breaks || [];
                while (start < end) {
                    const time = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const isBreak = breaks.some(b => {
                        const breakStart = new Date(`2000-01-01T${b.from}`);
                        const breakEnd = new Date(`2000-01-01T${b.to}`);
                        return start >= breakStart && start < breakEnd;
                    });
                    if (!isBreak) {
                        const option = document.createElement('option');
                        option.value = time;
                        option.textContent = time;
                        timeSelect.appendChild(option);
                    }
                    start.setMinutes(start.getMinutes() + 15);
                }
            }
        }
        */
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
///////////
async function OnBookService_Choice(){
    const timeSelect = document.getElementById('booking-time');
    if(document.getElementById('booking-service')?.value != ""){
        const signal = currentAbortController.signal;
        let buffer_minute = 10;
        let salon;
        const serviceSelected = document.getElementById('booking-service')?.value;
        const _salonName = document.getElementById('booking-salon-name')?.textContent
        let user_choice_service = 0;
        for (let _salon of salons) {
            if (_salon.salonName === _salonName) {
                salon = _salon;
                for (let salon_service of _salon.services) {
                    if (salon_service.name === serviceSelected) {
                        user_choice_service = salon_service.time;
                        break;
                    }
                }
                break;
            }
        }
        
        
        if (timeSelect) {
            timeSelect.innerHTML = '';
            if (salon) {
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes(); // e.g., 01:21 AM = 81 minutes
                
                const openMinutes = timeToMinutes(salon.openTime) + 20; // e.g., "09:00 AM" = 540
                const closeMinutes = timeToMinutes(salon.closeTime); // e.g., "10:00 PM" = 1320
                
                // Check if current time is before opening or after closing
                if (currentMinutes >= closeMinutes) {
                    timeSelect.innerHTML = '<option value="nothing">SALON IS CLOSED</option>';
                    return;
                }
                
                // Start time: current time or open time, rounded to next 10-minute interval
                let startMinutes = Math.max(currentMinutes, openMinutes);
                startMinutes = Math.ceil(startMinutes / 10) * 10;
                
                const breaks = salon.breaks || []; // e.g., [{from: "1:00 PM", to: "2:00 PM"}]
                let bookings = await getData("bookings", { signal }) || [];
                // const bookings = bookings || []; // e.g., [{time: "10:10 AM", service: 50}]
                
                while (startMinutes < closeMinutes) {
                    const timeStr = minutesToTime(startMinutes);

                    // Check if the time slot is during a break
                    const isBreak = breaks.some(b => {
                        const breakStart = timeToMinutes(b.from);
                        const breakEnd = timeToMinutes(b.to);
                        return startMinutes >= breakStart && startMinutes < breakEnd;
                    });

                    // Check if the time slot overlaps with an existing booking
                    let bookedSeat = 0;
                    let isBooked = false;
                    
                    for (let _booking of bookings) {
                        const bookingStart = timeToMinutes(_booking.time.substring(0, _booking.time.indexOf("s"))  );
                        const bookingEnd = bookingStart + _booking.time_take;
                        if(startMinutes >= bookingStart - user_choice_service - buffer_minute && startMinutes < bookingEnd + buffer_minute){
                            bookedSeat += 1;
                            if(bookedSeat >= salon.SeatCount){
                                isBooked = true;
                                break;
                            }
                        }
                    }
                    // console.log("Time: "+ timeStr);
                    // console.log("isBooked: "+ isBooked);
                    // console.log("bookedSeat: "+ bookedSeat);
                    // console.log("SeatCount: "+ salon.SeatCount);
                    // console.log("--------------------------");

                    // Check if the service duration fits before closing or next break/booking
                    const serviceEnd = startMinutes + user_choice_service;
                    const fitsSchedule = serviceEnd <= closeMinutes && !breaks.some(b => {
                        const breakStart = timeToMinutes(b.from);
                        const breakEnd = timeToMinutes(b.to);
                        return serviceEnd > breakStart && startMinutes < breakEnd;
                    }) && !bookings.some(booking => {
                        const bookingStart = timeToMinutes(booking.time.substring(0, booking.time.indexOf("s"))  );
                        const bookingEnd = bookingStart + booking.time_take;
                        return serviceEnd > bookingStart - buffer_minute && startMinutes < bookingEnd + buffer_minute;
                    });

                    if (!isBreak && !isBooked && fitsSchedule) {
                        const option = document.createElement('option');
                        option.value = timeStr + "s"+ (bookedSeat + 1);
                        option.textContent = timeStr + ` : Seats(${bookedSeat}/${salon.SeatCount})`;
                        timeSelect.appendChild(option);
                    }

                    startMinutes += 10; // Increment by 10 minutes
                }
            }
        }
    }else{
        timeSelect.innerHTML = '<option value="">Please first Select Service</option>';
    }
}
async function manualBook() {
    console.log("1");
    clearError('manual-dashboard-error');
    const time_take = document.getElementById('manualBooking-timeTake')?.value;
    if (time_take === "") {
        console.log("2");
        setError('manual-dashboard-error', 'Please enter how much time the service takes!');
        return;
    }
    
    console.log("3");
    const user_choice_service = parseInt(time_take);
    if (isNaN(user_choice_service) || user_choice_service <= 0) {
        console.log("4");
        setError('manual-dashboard-error', 'Please enter a valid service duration!');
        return;
    }
    
    setError('manual-dashboard-error', 'Checking availability...');
    
    let salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    let your_salons = salon_Index >= 0 && salons[salon_Index] ? salons[salon_Index] : null;
    console.log("5");
    
    if (!your_salons) {
        console.log("6");
        setError('manual-dashboard-error', 'No salon selected. Please select a salon first.');
        return;
    }
    console.log("7");

    const signal = currentAbortController.signal;
    const buffer_minute = 5;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes(); // e.g., 04:49 PM = 1009 minutes

    const openMinutes = timeToMinutes(your_salons.openTime) + 20; // e.g., "09:00 AM" = 540 + 20
    const closeMinutes = timeToMinutes(your_salons.closeTime); // e.g., "10:00 PM" = 1320

    // Check if current time is before opening or after closing
    if (currentMinutes >= closeMinutes) {
        setError('manual-dashboard-error', 'Salon is closed at this time.');
        return;
    }
    if (currentMinutes < openMinutes) {
        setError('manual-dashboard-error', 'Salon has not yet opened.');
        return;
    }

    // Round start time to next 10-minute interval
    let startMinutes = Math.ceil(currentMinutes / 10) * 10;
    const timeStr = minutesToTime(startMinutes);

    // Check if the time slot is during a break
    const breaks = your_salons.breaks || [];
    const isBreak = breaks.some(b => {
        const breakStart = timeToMinutes(b.from);
        const breakEnd = timeToMinutes(b.to);
        return startMinutes >= breakStart && startMinutes < breakEnd;
    });

    if (isBreak) {
        const breakRange = breaks.find(b => {
            const breakStart = timeToMinutes(b.from);
            return startMinutes >= breakStart && startMinutes < timeToMinutes(b.to);
        });
        setError('manual-dashboard-error', `Salon is on break from ${breakRange.from} to ${breakRange.to}.`);
        return;
    }

    // Check seat availability
    let bookings = await getData("bookings", { signal }) || [];
    let bookedSeat = 0;
    for (let booking of bookings) {
        const bookingStart = timeToMinutes(booking.time.substring(0, booking.time.indexOf("s")));
        const bookingEnd = bookingStart + booking.time_take;
        if (startMinutes >= bookingStart - user_choice_service - buffer_minute && 
            startMinutes < bookingEnd + buffer_minute) {
            bookedSeat += 1;
        }
    }
    const isBooked = bookedSeat >= your_salons.SeatCount;
    bookedSeat += 1;

    // Check if the service duration fits
    const serviceEnd = startMinutes + user_choice_service;
    const fitsSchedule = serviceEnd <= closeMinutes && 
        !breaks.some(b => {
            const breakStart = timeToMinutes(b.from);
            const breakEnd = timeToMinutes(b.to);
            return serviceEnd > breakStart && startMinutes < breakEnd;
        }) && !bookings.some(booking => {
            const bookingStart = timeToMinutes(booking.time.substring(0, booking.time.indexOf("s")));
            const bookingEnd = bookingStart + booking.time_take;
            return serviceEnd > bookingStart - buffer_minute && startMinutes < bookingEnd + buffer_minute;
        });

    if (isBooked) {
        setError('manual-dashboard-error', 'Time slot is fully booked.');
        return;
    }
    if (!fitsSchedule) {
        setError('manual-dashboard-error', 'Service duration overlaps with another booking or break. Please choose a shorter duration.');
        return;
    }

    // Create booking
    const booking = {
        salonName: your_salons.salonName,
        ownerName: your_salons.ownerName,
        location: your_salons.location,
        deviceId: 'manual',
        service: "",
        time: timeStr + "s"+ bookedSeat,
        time_take: user_choice_service,
        customerImage: '',
        customerName: 'Manual',
        customerNumber: "0000",
        code: 'BOOK' + Math.random().toString(36).substring(2, 8),
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    };

    try {
        bookings.push(booking);
        await setData("bookings", bookings);
        setError('manual-dashboard-error', 'Manual booking confirmed!');
        showDashboard();
    } catch (e) {
        setError('manual-dashboard-error', 'Failed to book appointment. Please try again.');
        console.error('Error booking appointment:', e);
    }
}

function showForm(formId) {
    const forms = ['salon-login', 'salon-register', 'salon-dashboard', 'salon-settings'];
    forms.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = id === formId ? 'block' : 'none';
        }
    });
    if (formId === 'salon-settings' && salon_Index >= 0) {
        populateSettings();
    }
}

// Mock Data
let deviceId = "";
let your_salons = null;
let salons = [];
let bookings = [];
let salon_Index = -1;

// Initialize Data (Reset)
async function resetData() {
    salons = [
        {
            ownerName: 'Ali Khan',
            salonName: 'Style Haven',
            password: 'password123',
            location: 'Karachi',
            openTime: '09:00',
            closeTime: '18:00',
            status: "Active",
            breaks: [{ from: '12:00', to: '13:00' }],
            services: [
                { name: 'Haircut', price: 1000, time: 30 },
                { name: 'Coloring', price: 3000, time: 60 }
            ],
            ownerImage: '',
            salonImages: defaultImages
        },
        {
            ownerName: 'Sara Ahmed',
            salonName: 'Elegance Salon',
            password: 'password123',
            location: 'Lahore',
            openTime: '10:00',
            closeTime: '19:00',
            status: "DeActive",
            breaks: [{ from: '13:00', to: '14:00' }],
            services: [
                { name: 'Haircut', price: 1200, time: 45 },
                { name: 'Manicure', price: 1500, time: 30 }
            ],
            ownerImage: '',
            salonImages: defaultImages
        }
    ];
    bookings = [];
    salon_Index = -1;
    try {
        await setData('salons', salons);
        await setData('bookings', bookings);
        localStorage.setItem('salon_Index', salon_Index);
    } catch (e) {
        console.error('Error saving to Firebase:', e);
    }
}

// Load Data
async function loadData() {
    // await resetData();
    try {
        deviceId = localStorage.getItem("Device_Id");
        if (!deviceId) {
            deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            localStorage.setItem("Device_Id", deviceId);
        }
        
        salons = await getData("salons");
        if (!salons || !Array.isArray(salons)) {
            // salons = [];
            console.warn('Salons data is empty or invalid, resetting to mock data');
            await resetData();
            salons = await getData("salons") || [];
        }
        bookings = await getData("bookings") || [];
        salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
        
        if (salon_Index >= 0 && salons[salon_Index]) {
            your_salons = salons[salon_Index];
        } else {
            salon_Index = -1;
            your_salons = null;
            localStorage.setItem('salon_Index', salon_Index);
        }
    } catch (e) {
        console.error('Error loading from Firebase:', e);
        await resetData();
        salons = await getData("salons") || [];
    }
}

// Validation Helpers
function validateTimeRange(from, to) {
    if (!from || !to) return false;
    return new Date(`2000-01-01T${from}`) < new Date(`2000-01-01T${to}`);
}

function clearError(errorId) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.classList.remove('visible');
        errorElement.textContent = '';
    }
}

function setError(errorId, message) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('visible');
    }
}

// Login
async function loginSalon() {
    clearError('login-error');
    const salonName = document.getElementById('login-salon-name')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    if (!salonName || !password) {
        setError('login-error', 'Please fill all required fields.');
        return;
    }
    
    salons = await getData("salons") || [];
    salon_Index = salons.findIndex(s => s.salonName === salonName && s.password === password);
    
    if (salon_Index >= 0) {
        your_salons = salons[salon_Index];
        localStorage.setItem('salon_Index', salon_Index);
        showDashboard();
    } else {
        salon_Index = -1;
        localStorage.setItem('salon_Index', salon_Index);
        setError('login-error', 'Invalid salon name or password.');
    }
}

// Register
async function registerSalon() {
    clearError('register-error');
    const per_code = document.getElementById('reg-permission-code')?.value.trim();
    if (!per_code) {
        setError('register-error', 'Please fill the Permission Code.');
        return;
    }
    let code = await getData("Permission Code");
    if (code != per_code) {
        setError('register-error', 'Incorrect Code.');
        return;
    }
    const ownerName = document.getElementById('reg-owner-name')?.value.trim();
    const salonName = document.getElementById('reg-salon-name')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const location = document.getElementById('reg-location')?.value.trim();
    const openTime = document.getElementById('reg-open-time')?.value;
    const closeTime = document.getElementById('reg-close-time')?.value;
    if (!ownerName || !salonName || !password || !location || !openTime || !closeTime) {
        setError('register-error', 'Please fill all required fields.');
        return;
    }
    if (!validateTimeRange(openTime, closeTime)) {
        setError('register-error', 'Opening time must be before closing time.');
        return;
    }
    const breaks = Array.from(document.querySelectorAll('#break-list .list-item')).map(item => ({
        from: item.querySelector('.break-from')?.value,
        to: item.querySelector('.break-to')?.value
    })).filter(b => b.from && b.to && validateTimeRange(b.from, b.to));
    if (breaks.some(b => !validateTimeRange(b.from, b.to))) {
        setError('register-error', 'All break times must have valid from-to ranges.');
        return;
    }
    const services = Array.from(document.querySelectorAll('#service-list .list-item')).map(item => ({
        name: item.querySelector('.service-name')?.value.trim(),
        price: parseFloat(item.querySelector('.service-price')?.value) || 0,
        time: parseInt(item.querySelector('.service-time')?.value) || 0
    })).filter(s => s.name && s.price > 0 && s.time > 0);
    if (services.length === 0) {
        setError('register-error', 'At least one valid service is required.');
        return;
    }
    if(document.getElementById('reg-seatCount')?.value == ""){
        setError('register-error', 'Please fill all required fields.');
    }
    const seatCount = parseInt( document.getElementById('reg-seatCount')?.value );
    
    salons = await getData("salons") || [];
    if (salons.find(s => s.salonName === salonName)) {
        setError('register-error', 'Salon name already exists.');
        return;
    }
    const salon = {
        ownerName,
        salonName,
        password,
        location,
        openTime,
        closeTime,
        SeatCount: seatCount,
        breaks,
        services,
        status: "Active",
        ownerImage: document.getElementById('reg-owner-image')?.files[0]?.name || '',
        salonImages: Array.from(document.getElementById('reg-salon-image')?.files || []).map(f => f.name).length > 0 ?
            Array.from(document.getElementById('reg-salon-image').files).map(f => f.name) : defaultImages
    };
    salons.push(salon);
    try {
        await setData("salons", salons);
        salon_Index = salons.length - 1;
        your_salons = salon;
        localStorage.setItem('salon_Index', salon_Index);
        setError('register-error', 'Salon registered successfully!');
        showDashboard();
    } catch (e) {
        setError('register-error', 'Failed to register salon. Please try again.');
        console.error('Error registering salon:', e);
    }
}

// Populate Settings
async function populateSettings() {
    clearError('settings-error');
    salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0 || !salons[salon_Index]) {
        setError('settings-error', 'No salon selected. Please log in.');
        return;
    }
    your_salons = salons[salon_Index];
    const setOwnerName = document.getElementById('set-owner-name');
    const setSalonName = document.getElementById('set-salon-name');
    const setPassword = document.getElementById('set-password');
    const setLocation = document.getElementById('set-location');
    const setOpenTime = document.getElementById('set-open-time');
    const setCloseTime = document.getElementById('set-close-time');
    const setSeatCount = document.getElementById('set-seatCount');
    if (setOwnerName) setOwnerName.value = your_salons.ownerName || '';
    if (setSalonName) setSalonName.value = your_salons.salonName || '';
    if (setPassword) setPassword.value = your_salons.password || '';
    if (setLocation) setLocation.value = your_salons.location || '';
    if (setSeatCount) setSeatCount.value = your_salons.SeatCount || '';
    if (setOpenTime) setOpenTime.value = your_salons.openTime || '';
    if (setCloseTime) setCloseTime.value = your_salons.closeTime || '';
    const breakList = document.getElementById('set-break-list');
    if (breakList) {
        breakList.innerHTML = '<h3>Break Times</h3>';
        (your_salons.breaks || []).forEach(breakTime => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <label>Break Time Range</label>
                <input type="time" class="break-from" value="${breakTime.from}" placeholder="From">
                <input type="time" class="break-to" value="${breakTime.to}" placeholder="To">
                <button class="btn" onclick="removeListItem(this)">Remove</button>
            `;
            breakList.appendChild(item);
        });
    }
    const serviceList = document.getElementById('set-service-list');
    if (serviceList) {
        serviceList.innerHTML = '<h3>Services</h3>';
        (your_salons.services || []).forEach(service => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <label>Service Details</label>
                <input type="text" class="service-name" value="${service.name}" placeholder="Service Name">
                <input type="number" class="service-price" value="${service.price}" placeholder="Price (PKR)">
                <input type="number" class="service-time" value="${service.time}" placeholder="Time (min)">
                <button class="btn" onclick="removeListItem(this)">Remove</button>
            `;
            serviceList.appendChild(item);
        });
    }
}

// Save Settings
async function saveSettings() {
    clearError('settings-error');
    salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('settings-error', 'No salon selected. Please log in.');
        return;
    }
    const ownerName = document.getElementById('set-owner-name')?.value.trim();
    const salonName = document.getElementById('set-salon-name')?.value.trim();
    const password = document.getElementById('set-password')?.value;
    const location = document.getElementById('set-location')?.value.trim();
    const setSeatCount = document.getElementById('set-seatCount')?.value;
    const openTime = document.getElementById('set-open-time')?.value;
    const closeTime = document.getElementById('set-close-time')?.value;
    if (!ownerName || !salonName || !password || !location || !setSeatCount || !openTime || !closeTime) {
        setError('settings-error', 'Please fill all required fields.');
        return;
    }
    if (!validateTimeRange(openTime, closeTime)) {
        setError('settings-error', 'Opening time must be before closing time.');
        return;
    }
    const breaks = Array.from(document.querySelectorAll('#set-break-list .list-item')).map(item => ({
        from: item.querySelector('.break-from')?.value,
        to: item.querySelector('.break-to')?.value
    })).filter(b => b.from && b.to && validateTimeRange(b.from, b.to));
    if (breaks.some(b => !validateTimeRange(b.from, b.to))) {
        setError('settings-error', 'All break times must have valid from-to ranges.');
        return;
    }
    const services = Array.from(document.querySelectorAll('#set-service-list .list-item')).map(item => ({
        name: item.querySelector('.service-name')?.value.trim(),
        price: parseFloat(item.querySelector('.service-price')?.value) || 0,
        time: parseInt(item.querySelector('.service-time')?.value) || 0
    })).filter(s => s.name && s.price > 0 && s.time > 0);
    if (services.length === 0) {
        setError('settings-error', 'At least one valid service is required.');
        return;
    }
    const updatedSalon = {
        ownerName,
        salonName,
        password,
        location,
        openTime,
        closeTime,
        SeatCount : setSeatCount,
        breaks,
        services,
        status:"Active",
        ownerImage: document.getElementById('set-owner-image')?.files[0]?.name || your_salons.ownerImage,
        salonImages: document.getElementById('set-salon-image')?.files.length > 0 ? 
            Array.from(document.getElementById('set-salon-image').files).map(f => f.name) : 
            your_salons.salonImages
    };
    
    try {
        salons[salon_Index] = updatedSalon;
        await setData("salons", salons);
        your_salons = updatedSalon;
        setError('settings-error', 'Settings saved successfully!');
        showDashboard();
    } catch (e) {
        setError('settings-error', 'Failed to save settings. Please try again.');
        console.error('Error saving settings:', e);
    }
}

// Add/Remove List Items (Breaks and Services)
function addBreakTime(listId = 'break-list') {
    const breakList = document.getElementById(listId);
    if (!breakList) return;
    const newBreak = document.createElement('div');
    newBreak.className = 'list-item';
    newBreak.innerHTML = `
        <label>Break Time Range</label>
        <input type="time" class="break-from" placeholder="From">
        <input type="time" class="break-to" placeholder="To">
        <button class="btn" onclick="removeListItem(this)">Remove</button>
    `;
    breakList.appendChild(newBreak);
}

function addService(listId = 'service-list') {
    const serviceList = document.getElementById(listId);
    if (!serviceList) return;
    const newService = document.createElement('div');
    newService.className = 'list-item';
    newService.innerHTML = `
        <label>Service Details</label>
        <input type="text" class="service-name" placeholder="Service Name">
        <input type="number" class="service-price" placeholder="Price (PKR)">
        <input type="number" class="service-time" placeholder="Time (min)">
        <button class="btn" onclick="removeListItem(this)">Remove</button>
    `;
    serviceList.appendChild(newService);
}

function removeListItem(button) {
    if (button.parentElement) {
        button.parentElement.remove();
    }
}

// Show Dashboard
async function showDashboard() {
    salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index >= 0 && salons[salon_Index]) {
        your_salons = salons[salon_Index];
        bookings = await getData("bookings") || [];
        debounceShowSection('your-salon');
        showForm('salon-dashboard');

        const dashSalonName = document.getElementById('dash-salon-name');
        const dashOwnerName = document.getElementById('dash-owner-name');
        const dashLocation = document.getElementById('dash-location');
        const dashHours = document.getElementById('dash-hours');
        const dashBreaks = document.getElementById('dash-breaks');
        const dashServices = document.getElementById('dash-services');
        if (dashSalonName) dashSalonName.textContent = your_salons.salonName || 'N/A';
        if (dashOwnerName) dashOwnerName.textContent = your_salons.ownerName || 'N/A';
        if (dashLocation) dashLocation.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(your_salons.location)}" target="_blank">${your_salons.location || 'N/A'}</a>`;
        if (dashHours) dashHours.textContent = `${your_salons.openTime || 'N/A'} - ${your_salons.closeTime || 'N/A'}`;
        if (dashBreaks) dashBreaks.textContent = your_salons.breaks?.length > 0 ? your_salons.breaks.map(b => `${b.from} - ${b.to}`).join(', ') : 'None';
        if (dashServices) dashServices.textContent = your_salons.services?.length > 0 ? your_salons.services.map(s => s.name).join(', ') : 'None';

        const pending = bookings.filter(b => b.status === 'pending' && b.salonName === your_salons.salonName);
        const completed = bookings.filter(b => b.status === 'completed' && b.salonName === your_salons.salonName);

        const totalBookings = document.getElementById('total-bookings');
        const pendingBookings = document.getElementById('pending-bookings');
        if (totalBookings) totalBookings.textContent = completed.length;
        if (pendingBookings) pendingBookings.textContent = pending.length;

        renderBookings(pending, 'pending-bookings-grid');
        renderBookings(completed, 'completed-bookings-grid');

        // Start 10-second auto-reload for dashboard if logged in
        if (!dashboardReloadInterval) {
            dashboardReloadInterval = setInterval(async () => {
                if (salon_Index >= 0 && salons[salon_Index] && document.getElementById('your-salon').classList.contains('active')) {
                    shouldScrollOnDashboard = false; // Prevent scroll on auto-reload
                    your_salons = salons[salon_Index];
                    bookings = await getData("bookings") || [];

                    // Update dashboard data only
                    if (dashSalonName) dashSalonName.textContent = your_salons.salonName || 'N/A';
                    if (dashOwnerName) dashOwnerName.textContent = your_salons.ownerName || 'N/A';
                    if (dashLocation) dashLocation.innerHTML = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(your_salons.location)}" target="_blank">${your_salons.location || 'N/A'}</a>`;
                    if (dashHours) dashHours.textContent = `${your_salons.openTime || 'N/A'} - ${your_salons.closeTime || 'N/A'}`;
                    if (dashBreaks) dashBreaks.textContent = your_salons.breaks?.length > 0 ? your_salons.breaks.map(b => `${b.from} - ${b.to}`).join(', ') : 'None';
                    if (dashServices) dashServices.textContent = your_salons.services?.length > 0 ? your_salons.services.map(s => s.name).join(', ') : 'None';

                    const pending = bookings.filter(b => b.status === 'pending' && b.salonName === your_salons.salonName);
                    const completed = bookings.filter(b => b.status === 'completed' && b.salonName === your_salons.salonName);
                    const canceled = bookings.filter(b => b.status === 'canceled' && b.salonName === your_salons.salonName);

                    if (totalBookings) totalBookings.textContent = completed.length;
                    if (pendingBookings) pendingBookings.textContent = pending.length;

                    renderBookings(pending, 'pending-bookings-grid');
                    renderBookings(completed, 'completed-bookings-grid');
                    renderBookings(canceled, 'canceled-bookings-grid');
                }
            }, 10000);
        }

        // Scroll to top only if manually navigated
        if (shouldScrollOnDashboard) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } else {
        // Clear interval if user is not logged in
        if (dashboardReloadInterval) {
            clearInterval(dashboardReloadInterval);
            dashboardReloadInterval = null;
        }
        debounceShowSection('your-salon');
        showForm('salon-login');
    }
}
function renderBookings(bookings, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const clearLoading = showLoadingAnimation(grid);
    try {
        clearLoading();
        grid.innerHTML = '';

        // Get current time in minutes since midnight
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes(); // e.g., 05:10 PM = 1010 minutes

        // Sort bookings by closeness to current time
        const sortedBookings = bookings.sort((a, b) => {
            const timeA = timeToMinutes(a.time);
            const timeB = timeToMinutes(b.time);
            return Math.abs(timeA - currentMinutes) - Math.abs(timeB - currentMinutes);
        });

        let index = 0;
        sortedBookings.forEach(booking => {
            const card = document.createElement('div');
            card.className = 'booking-card';
            card.innerHTML = `
                ${booking.status === 'pending' && index === 0 ? "<h4>Your Next Customer</h4>" : ""}
                <p>Name: ${booking.customerName}</p>
                <p>Code: ${booking.code}</p>
                <p>Service: ${booking.service}</p>
                <p>Date: ${booking.date}</p>
                <p>Time Taken: ${booking.time_take}</p>
                <p>Time: ${booking.time.substring(0, booking.time.indexOf("s"))} - ${minutesToTime(timeToMinutes(booking.time) + booking.time_take)}</p>
                <p>Seat: ${booking.time.substring(booking.time.indexOf("s") + 1)}</p>
                <button class="btn" onclick="dash_cancelBooking('${booking.code}')">Cancel This Booking</button>
            `;
            
            grid.appendChild(card);
            index += 1;
        });
    } catch (e) {
        clearLoading();
        grid.innerHTML = '<p style="text-align: center; color: red;">Error loading bookings. Please try again.</p>';
        console.error('Error rendering bookings:', e);
    }
}

// Render User Bookings (for Your Booked Salon)
async function renderUserBookings(bookings) {
    const grid = document.getElementById('bookings-grid');
    if (!grid) return;
    const clearLoading = showLoadingAnimation(grid);
    try {
        const userBookings = bookings.filter(booking => booking.deviceId === deviceId);
        clearLoading();
        grid.innerHTML = '';
        const groupedBookings = userBookings.reduce((acc, booking) => {
            if (!acc[booking.salonName]) {
                acc[booking.salonName] = {
                    ownerName: booking.ownerName,
                    location: booking.location,
                    bookings: []
                };
            }
            acc[booking.salonName].bookings.push(booking);
            return acc;
        }, {});
        Object.keys(groupedBookings).forEach((salonName, index) => {
            const { ownerName, location, bookings: salonBookings } = groupedBookings[salonName];
            const sliderId = `booked-salon-${salonName}-${index}`;
            const card = document.createElement('div');
            card.className = 'booking-card';
                const bookingDetails = salonBookings.map((booking, idx) => `
                <div class="bookedSalon_userCard">
                    <h3 style="margin-left: 10px;">Booking ${idx + 1}:</h3>
                    <hr>
                    <p>Name: ${booking.customerName}</p>
                    <p>Phone Number: ${booking.customerNumber}</p>
                    <p>Service: ${booking.service}</p>
                    <p>Time Taken: ${booking.time_take} </p>
                    <p>Time: ${booking.time.substring(0, booking.time.indexOf("s"))} - ${minutesToTime(timeToMinutes(booking.time) + booking.time_take)} </p>
                    <p>Seat: ${booking.time.substring(booking.time.indexOf("s") + 1)}</p>
                    <button class="btn" onclick="cancelBooking('${booking.code}')">Cancel This Booking</button>
                </div>
                <br>
            `).join('');
            card.innerHTML = `
                <h3>${salonBookings.length > 1 ? 'Bookings for ' : ''}${salonName}</h3>
                <p>Owner: ${ownerName}</p>
                <p>Location: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}" target="_blank">${location}</a></p>
                <div class="slider" data-slider-id="${sliderId}">
                    <div class="slides">
                        <div class="slide" style="background-image: url('${placeholderImage}')"></div>
                        <div class="slide" style="background-image: url('${placeholderImage}')"></div>
                        <div class="slide" style="background-image: url('${placeholderImage}')"></div>
                    </div>
                    <button class="slider-btn prev" onclick="moveSlide('${sliderId}', -1)">❮</button>
                    <button class="slider-btn next" onclick="moveSlide('${sliderId}', 1)">❯</button>
                </div>
                <br>
                ${bookingDetails}
            `;
            grid.appendChild(card);
            initSlider(sliderId);
            // Lazy-load images for booked salon cards
            loadImagesForCard(card, defaultImages);
        });
    } catch (e) {
        clearLoading();
        grid.innerHTML = '<p style="text-align: center; color: red;">Error loading bookings. Please try again.</p>';
        console.error('Error rendering user bookings:', e);
    }
}

// Book Appointment
async function bookAppointment() {
    clearError('booking-error');
    const service = document.getElementById('booking-service')?.value;
    const time = document.getElementById('booking-time')?.value;
    const customerName = document.getElementById('customer-name')?.value.trim();
    const customerNumber = document.getElementById('customer-number')?.value.trim();
    const _salonName = document.getElementById('booking-salon-name')?.textContent || '';
    if (!customerNumber) {
        setError('booking-error', 'Please add your Phone Number.');
        return;
    }
    if (!service) {
        setError('booking-error', 'Please select a service.');
        return;
    }
    let time_take = 0;
    for (let salon of salons) {
        if (salon.salonName === _salonName) {
            for (let salon_service of salon.services) {
                if (salon_service.name === service) {
                    time_take = salon_service.time;
                    break;
                }
            }
            break;
        }
    }

    const booking = {
        salonName: _salonName,
        ownerName: document.getElementById('booking-owner-name')?.textContent.replace('Owner: ', '') || '',
        location: document.getElementById('booking-location')?.textContent || '',
        deviceId: localStorage.getItem("Device_Id") || '',
        service,
        time,
        time_take,
        token: time === 'token' ? 'T' + Math.random().toString(36).substring(2, 8) : null,
        customerImage: '',
        customerName: customerName || 'User_' + Math.random().toString(36).substring(2, 8),
        customerNumber: customerNumber,
        code: 'BOOK' + Math.random().toString(36).substring(2, 8),
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    };
    bookings = await getData("bookings") || [];
    bookings.push(booking);
    try {
        await setData("bookings", bookings);
        setError('your_booking-error', 'Booking confirmed!');
        showSection('your-booked-salon')
        // showDashboard(); 
    } catch (e) {
        setError('booking-error', 'Failed to book appointment. Please try again.');
        console.error('Error booking appointment:', e);
    }
}

// Cancel Booking
async function cancelBooking(code) {
    clearError('your_booking-error');
    setError('your_booking-error', 'Canceling booking...');
    try {
        bookings = await getData("bookings") || [];
        const bookingIndex = bookings.findIndex(b => b.code === code && b.deviceId === deviceId);
        if (bookingIndex === -1) {
            setError('your_booking-error', 'Booking not found or already canceled.');
            return;
        }
        bookings.splice(bookingIndex, 1); // Remove the booking
        await setData("bookings", bookings);
        setError('your_booking-error', 'Booking canceled successfully.');
        // Refresh the bookings view
        const userBookings = bookings.filter(b => b.status === 'pending' && b.deviceId === deviceId);
        if (userBookings.length === 0) {
            const noBookingSection = document.getElementById('no-booking');
            if (noBookingSection) {
                noBookingSection.classList.add('active');
                document.getElementById('your-booked-salon').classList.remove('active');
            }
        } else {
            await renderUserBookings(userBookings);
        }
    } catch (e) {
        setError('your_booking-error', 'Failed to cancel booking. Please try again.');
        console.error('Error canceling booking:', e);
    }
}
async function dash_cancelBooking(code) {
    clearError('dashboard-error');
    setError('dashboard-error', 'Canceling booking...');
    try {
        bookings = await getData("bookings") || [];
        const bookingIndex = bookings.findIndex(b => b.code === code && b.deviceId === deviceId);
        if (bookingIndex === -1) {
            setError('dashboard-error', 'Booking not found or already canceled.');
            return;
        }
        bookings.splice(bookingIndex, 1); // Remove the booking
        await setData("bookings", bookings);
        setError('dashboard-error', 'Booking canceled successfully.');
        showDashboard();
    } catch (e) {
        setError('dashboard-error', 'Failed to cancel booking. Please try again.');
        console.error('Error canceling booking:', e);
    }
}
/////
// Manual Book, Next Customer, Cancel All
async function Complete_Currect_Customer() {
    const salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }
    const bookings = await getData("bookings") || [];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes(); // e.g., 05:29 PM = 1049 minutes

    // Find the first pending booking for the current salon at or before the current time
    const currentBookingIndex = bookings.findIndex(b => 
        b.status === 'pending' && 
        b.salonName === your_salons.salonName && 
        timeToMinutes(b.time) <= currentMinutes
    );

    if (currentBookingIndex >= 0) {
        bookings[currentBookingIndex].status = 'completed';
        try {
            await setData("bookings", bookings);
            setError('dashboard-error', 'Set to Completed.');
            showDashboard();
        } catch (e) {
            setError('dashboard-error', 'Failed to update booking status. Please try again.');
            console.error('Error updating booking status:', e);
        }
    } else {
        setError('dashboard-error', 'No pending bookings at or before the current time.');
    }
}
async function Cancel_Currect_Customer() {
    const salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }
    const bookings = await getData("bookings") || [];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes(); // e.g., 05:29 PM = 1049 minutes

    // Find the first pending booking for the current salon at or before the current time
    const currentBookingIndex = bookings.findIndex(b => 
        b.status === 'pending' && 
        b.salonName === your_salons.salonName && 
        timeToMinutes(b.time) <= currentMinutes
    );

    if (currentBookingIndex >= 0) {
        bookings[currentBookingIndex].status = 'canceled';
        try {
            await setData("bookings", bookings);
            setError('dashboard-error', 'Set to Completed.');
            showDashboard();
        } catch (e) {
            setError('dashboard-error', 'Failed to update booking status. Please try again.');
            console.error('Error updating booking status:', e);
        }
    } else {
        setError('dashboard-error', 'No pending bookings at or before the current time.');
    }
}

async function cancelAllBookings() {
    salon_Index = parseInt(localStorage.getItem('salon_Index')) || -1;
    if (salon_Index < 0) {
        setError('dashboard-error', 'Please log in to manage bookings.');
        return;
    }
    bookings = await getData("bookings") || [];
    bookings = bookings.filter(b => b.salonName !== your_salons.salonName && b.status !== 'completed');
    try {
        await setData("bookings", bookings);
        setError('dashboard-error', 'All bookings canceled.');
        showDashboard();
    } catch (e) {
        setError('dashboard-error', 'Failed to cancel bookings. Please try again.');
        console.error('Error canceling bookings:', e);
    }
}

// Initialize
async function init() {
    const grid = document.getElementById('salon-grid');
    const clearLoading = grid ? showLoadingAnimation(grid) : () => {};
    try {
        await loadData();
        currentAbortController = new AbortController();
        await renderSalons(currentAbortController.signal);
        // Ensure salons render on slow networks by re-rendering after a delay
        setTimeout(async () => {
            if (grid && (!grid.children.length || grid.innerHTML.includes('No salons available'))) {
                console.log('Retrying salon render after delay');
                await renderSalons(currentAbortController.signal);
            }
        }, 500);
        debounceShowSection('home');
    } catch (e) {
        console.error('Error in init:', e);
        grid.innerHTML = '<p style="text-align: center; color: red;">Error loading page. Please refresh.</p>';
    } finally {
        clearLoading();
    }
}

// Run initialization
init();

// Initialize listener directly (safe way)
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById('booking-service')?.addEventListener('change', OnBookService_Choice);
});