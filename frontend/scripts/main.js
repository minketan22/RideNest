const PLACEHOLDER_IMAGE =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
            <rect width="1200" height="700" fill="#1f1f1f" />
            <circle cx="300" cy="170" r="90" fill="#4CAF50" opacity="0.22" />
            <circle cx="980" cy="120" r="120" fill="#ffffff" opacity="0.08" />
            <rect x="180" y="290" width="840" height="180" rx="28" fill="#2a2a2a" />
            <text x="600" y="350" text-anchor="middle" fill="#ffffff" font-size="48" font-family="Arial, sans-serif">
                RideNest
            </text>
            <text x="600" y="408" text-anchor="middle" fill="#b3b3b3" font-size="28" font-family="Arial, sans-serif">
                Vehicle image unavailable
            </text>
        </svg>
    `);

const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-IN')}`;
const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const isUpcomingBooking = (booking) => new Date(booking.startDate) >= new Date(new Date().toDateString());
const isPastBooking = (booking) => new Date(booking.endDate) < new Date(new Date().toDateString());
const formatMonthKey = (value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
const getVehicleAvailabilityText = (vehicle) =>
    vehicle.isBooked && vehicle.bookedByDateRange
        ? `Booked until ${formatDate(vehicle.bookedByDateRange.endDate)}`
        : 'Available now';
const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
const renderDistributionRows = (items, formatter) =>
    items
        .map((item) => {
            const width = Math.max(8, Math.min(100, Number(item.valuePercent || 0)));
            return `
                <div class="distribution-row">
                    <div class="distribution-head">
                        <strong>${escapeHtml(item.label)}</strong>
                        <span>${formatter(item)}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${width}%"></div>
                    </div>
                </div>
            `;
        })
        .join('');
const renderBarRows = (items, formatter) =>
    items
        .map((item) => {
            const width = Math.max(8, Math.min(100, Number(item.valuePercent || 0)));
            return `
                <div class="bar-row">
                    <span class="bar-label">${escapeHtml(item.label)}</span>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${width}%"></div>
                    </div>
                    <span class="bar-value">${formatter(item)}</span>
                </div>
            `;
        })
        .join('');
const getProfileStorageKey = (role, key) => `ridenest_${role}_${key}`;
const setProfileStatus = (element, message) => {
    if (!element) return;
    element.textContent = message;
};

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('fade-in');

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    const setupNavbar = () => {
        const navLinks = document.getElementById('nav-links');
        if (!navLinks) return;

        if (token && role === 'user') {
            navLinks.innerHTML = `
                <li><a href="index.html">Find a Vehicle</a></li>
                <li><a href="dashboard-user.html">My Bookings</a></li>
                <li><a href="#" id="logout-btn" class="btn-primary">Logout</a></li>
            `;
            return;
        }

        if (token && role === 'agency') {
            navLinks.innerHTML = `
                <li><a href="dashboard-agency.html">My Dashboard</a></li>
                <li><a href="#" id="logout-btn" class="btn-primary">Logout</a></li>
            `;
            return;
        }

        navLinks.innerHTML = `
            <li><a href="login.html">Login</a></li>
            <li><a href="register.html" class="btn-primary">Register</a></li>
        `;
    };

    const attachLogoutHandler = () => {
        const logoutBtn = document.getElementById('logout-btn');
        if (!logoutBtn) return;

        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('tempBooking');
            window.location.href = 'index.html';
        });
    };

    const handleApiFailure = async (res, fallbackMessage) => {
        let message = fallbackMessage;
        try {
            const data = await res.json();
            if (data && data.msg) {
                message = data.msg;
            }
        } catch (err) {
            console.error('Failed to parse error response:', err);
        }
        throw new Error(message);
    };

    setupNavbar();
    attachLogoutHandler();

    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();

            if (!token) {
                alert('Please log in to search for vehicles.');
                window.location.href = 'login.html';
                return;
            }

            const location = encodeURIComponent(document.getElementById('location').value.trim());
            const vehicleType = encodeURIComponent(document.getElementById('vehicle-type').value);
            window.location.href = `search.html?location=${location}&type=${vehicleType}`;
        });
    }

    const vehicleListContainer = document.getElementById('vehicle-list-container');
    if (vehicleListContainer) {
        if (!token || role !== 'user') {
            alert('Please log in as a user to browse vehicles.');
            window.location.href = 'login.html';
            return;
        }

        const fetchVehicles = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const location = params.get('location') || '';
                const type = params.get('type') || '';
                const res = await fetch(
                    `${API_BASE_URL}/api/vehicles?location=${encodeURIComponent(location)}&type=${encodeURIComponent(type)}`
                );

                if (!res.ok) {
                    await handleApiFailure(res, 'Failed to load vehicles');
                }

                const vehicles = await res.json();
                vehicleListContainer.innerHTML = '';

                if (vehicles.length === 0) {
                    vehicleListContainer.innerHTML = `
                        <div class="empty-list-message">
                            <h3>No Vehicles Found</h3>
                            <p>No vehicles matched "${type || 'All Types'}" in "${location || 'All Locations'}".</p>
                        </div>
                    `;
                    return;
                }

                vehicles.forEach((vehicle) => {
                    const availabilityClass = vehicle.isBooked ? 'status-pending' : 'status-confirmed';
                    vehicleListContainer.innerHTML += `
                        <div class="card">
                            <img src="${vehicle.image || PLACEHOLDER_IMAGE}" alt="${vehicle.modelName}" class="card-image">
                            <div class="card-content">
                                <h4>${vehicle.modelName}</h4>
                                <p>Type: ${vehicle.type}</p>
                                <p>Location: ${vehicle.location || 'Not specified'}</p>
                                <p>Agency: ${vehicle.agencyId ? vehicle.agencyId.agencyName : 'N/A'}</p>
                                ${vehicle.description ? `<p>${vehicle.description}</p>` : ''}
                                <div class="status-badge ${availabilityClass}">${escapeHtml(getVehicleAvailabilityText(vehicle))}</div>
                                <p class="price">${formatCurrency(vehicle.pricePerDay)} / day</p>
                                ${
                                    vehicle.isBooked
                                        ? `<span class="btn-secondary">Currently Booked</span>`
                                        : `<a href="vehicle-details.html?id=${vehicle._id}" class="btn-primary">Book Now</a>`
                                }
                            </div>
                        </div>
                    `;
                });
            } catch (err) {
                console.error('Error fetching vehicles:', err);
                vehicleListContainer.innerHTML = `
                    <div class="empty-list-message">
                        <h3>Could not load vehicles</h3>
                        <p>${err.message}</p>
                    </div>
                `;
            }
        };

        fetchVehicles();
    }

    const userBookingList = document.getElementById('booking-list-container');
    if (userBookingList) {
        if (!token || role !== 'user') {
            window.location.href = 'login.html';
            return;
        }

        const userBookingFilter = document.getElementById('user-booking-filter');
        const userBookingSearch = document.getElementById('user-booking-search');
        const userTotalBookings = document.getElementById('user-total-bookings');
        const userUpcomingBookings = document.getElementById('user-upcoming-bookings');
        const userConfirmedBookings = document.getElementById('user-confirmed-bookings');
        const userTotalSpend = document.getElementById('user-total-spend');
        const userNextBooking = document.getElementById('user-next-booking');
        const userFavoriteType = document.getElementById('user-favorite-type');
        const userTypeDistribution = document.getElementById('user-type-distribution');
        const userMonthlyChart = document.getElementById('user-monthly-chart');
        const userActivityTimeline = document.getElementById('user-activity-timeline');
        const userProfileForm = document.getElementById('user-profile-form');
        const userDisplayNameInput = document.getElementById('user-display-name');
        const userTravelNoteInput = document.getElementById('user-travel-note');
        const userProfileStatus = document.getElementById('user-profile-status');
        let allUserBookings = [];

        const loadUserProfile = () => {
            if (userDisplayNameInput) {
                userDisplayNameInput.value = localStorage.getItem(getProfileStorageKey('user', 'display_name')) || '';
            }
            if (userTravelNoteInput) {
                userTravelNoteInput.value = localStorage.getItem(getProfileStorageKey('user', 'travel_note')) || '';
            }
        };

        const renderUserSummary = (bookings) => {
            const upcomingBookings = bookings.filter(isUpcomingBooking);
            const confirmedBookings = bookings.filter((booking) => booking.status === 'Confirmed');
            const totalSpend = bookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);

            userTotalBookings.textContent = bookings.length;
            userUpcomingBookings.textContent = upcomingBookings.length;
            userConfirmedBookings.textContent = confirmedBookings.length;
            userTotalSpend.textContent = formatCurrency(totalSpend);

            const favoriteTypeCounts = bookings.reduce((acc, booking) => {
                const type = booking.vehicleId?.type;
                if (!type) return acc;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            const favoriteTypeEntry = Object.entries(favoriteTypeCounts).sort((a, b) => b[1] - a[1])[0];
            userFavoriteType.textContent = favoriteTypeEntry
                ? `${favoriteTypeEntry[0]} is your top vehicle type`
                : 'No favorite type yet';

            const nextBooking = [...bookings]
                .filter((booking) => !isPastBooking(booking))
                .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

            if (!nextBooking) {
                userNextBooking.innerHTML = `<p class="placeholder-copy">You do not have an upcoming booking yet. Use the search button above to plan your next ride.</p>`;
                return;
            }

                userNextBooking.innerHTML = `
                <p class="eyebrow">Next Booking</p>
                <h4>${escapeHtml(nextBooking.vehicleId?.modelName || 'Vehicle Removed')}</h4>
                <p>Agency: ${escapeHtml(nextBooking.agencyId?.agencyName || 'N/A')}</p>
                <p>Pickup window: ${formatDate(nextBooking.startDate)} to ${formatDate(nextBooking.endDate)}</p>
                <p>Pickup time: ${escapeHtml(nextBooking.pickupTime || 'N/A')}</p>
                <div class="status-badge ${nextBooking.status === 'Confirmed' ? 'status-confirmed' : nextBooking.status === 'Pending' ? 'status-pending' : 'status-cancelled'}">${escapeHtml(nextBooking.status)}</div>
                <p class="price">${formatCurrency(nextBooking.totalPrice)}</p>
                <div class="summary-chips">
                    <span class="summary-chip">Status: ${escapeHtml(nextBooking.status)}</span>
                    <span class="summary-chip">Type: ${escapeHtml(nextBooking.vehicleId?.type || 'Unknown')}</span>
                </div>
            `;
        };

        const renderUserInsights = (bookings) => {
            const typeCounts = bookings.reduce((acc, booking) => {
                const type = booking.vehicleId?.type || 'Unknown';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
            const maxTypeCount = typeEntries[0]?.[1] || 1;

            userTypeDistribution.innerHTML = typeEntries.length
                ? renderDistributionRows(
                      typeEntries.map(([label, count]) => ({
                          label,
                          count,
                          valuePercent: (count / maxTypeCount) * 100
                      })),
                      (item) => `${item.count} booking${item.count === 1 ? '' : 's'}`
                  )
                : `<p class="inline-empty">Your booking mix will appear here once you have trips.</p>`;

            const monthlyCounts = bookings.reduce((acc, booking) => {
                const key = formatMonthKey(booking.createdAt || booking.startDate);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const monthlyEntries = Object.entries(monthlyCounts).slice(-6);
            const maxMonthlyCount = Math.max(...monthlyEntries.map(([, count]) => count), 1);

            userMonthlyChart.innerHTML = monthlyEntries.length
                ? renderBarRows(
                      monthlyEntries.map(([label, count]) => ({
                          label,
                          count,
                          valuePercent: (count / maxMonthlyCount) * 100
                      })),
                      (item) => `${item.count}`
                  )
                : `<p class="inline-empty">Monthly activity will appear here once you have bookings.</p>`;

            const recentActivity = [...bookings]
                .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
                .slice(0, 4);

            userActivityTimeline.innerHTML = recentActivity.length
                ? recentActivity
                      .map(
                          (booking) => `
                              <div class="timeline-item">
                                  <span class="timeline-dot"></span>
                                  <div class="timeline-content">
                                      <strong>${escapeHtml(booking.vehicleId?.modelName || 'Vehicle Removed')}</strong>
                                      <p>Booked with ${escapeHtml(booking.agencyId?.agencyName || 'N/A')} for ${formatDate(booking.startDate)}.</p>
                                      <p class="timeline-meta">${escapeHtml(booking.status)} • ${formatCurrency(booking.totalPrice)}</p>
                                  </div>
                              </div>
                          `
                      )
                      .join('')
                : `<p class="inline-empty">Your latest booking activity will appear here.</p>`;
        };

        const renderUserBookings = () => {
            const filterValue = userBookingFilter?.value || 'all';
            const query = (userBookingSearch?.value || '').trim().toLowerCase();

            const filteredBookings = allUserBookings.filter((booking) => {
                const matchesFilter =
                    filterValue === 'all' ||
                    (filterValue === 'upcoming' && isUpcomingBooking(booking)) ||
                    (filterValue === 'confirmed' && booking.status === 'Confirmed') ||
                    (filterValue === 'pending' && booking.status === 'Pending') ||
                    (filterValue === 'past' && isPastBooking(booking));

                const haystack = [
                    booking.vehicleId?.modelName,
                    booking.vehicleId?.type,
                    booking.agencyId?.agencyName
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                const matchesQuery = !query || haystack.includes(query);
                return matchesFilter && matchesQuery;
            });

            userBookingList.innerHTML = '';

            if (filteredBookings.length === 0) {
                userBookingList.innerHTML = `
                    <div class="empty-list-message">
                        <h3>No matching bookings</h3>
                        <p>Try a different filter or search term to find one of your reservations.</p>
                    </div>
                `;
                return;
            }

            filteredBookings.forEach((booking) => {
                const statusClass =
                    booking.status === 'Cancelled' || booking.status === 'Rejected'
                        ? 'status-cancelled'
                        : booking.status === 'Confirmed'
                          ? 'status-confirmed'
                          : 'status-pending';

                userBookingList.innerHTML += `
                    <div class="card">
                        <div class="card-content">
                            <h4>${escapeHtml(booking.vehicleId ? booking.vehicleId.modelName : 'Vehicle Removed')}</h4>
                            <p>Agency: ${escapeHtml(booking.agencyId ? booking.agencyId.agencyName : 'N/A')}</p>
                            <p>Vehicle Type: ${escapeHtml(booking.vehicleId?.type || 'N/A')}</p>
                            <p>Start Date: ${formatDate(booking.startDate)}</p>
                            <p>End Date: ${formatDate(booking.endDate)}</p>
                            <p>Pickup Time: ${escapeHtml(booking.pickupTime || 'N/A')}</p>
                            <div class="status-badge ${statusClass}">${escapeHtml(booking.status)}</div>
                            <p class="price">Total: ${formatCurrency(booking.totalPrice)}</p>
                            <button class="btn-cancel" data-id="${booking._id}">Delete Booking</button>
                        </div>
                    </div>
                `;
            });
        };

        const fetchUserBookings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/bookings/my-bookings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        localStorage.clear();
                        window.location.href = 'login.html';
                        return;
                    }
                    await handleApiFailure(res, 'Failed to fetch bookings');
                }

                const bookings = await res.json();
                allUserBookings = bookings;
                renderUserSummary(bookings);
                renderUserInsights(bookings);

                if (bookings.length === 0) {
                    userBookingList.innerHTML = `
                        <div class="empty-list-message">
                            <h3>You have no bookings.</h3>
                            <p>Find a vehicle and make your first booking.</p>
                        </div>
                    `;
                    return;
                }

                renderUserBookings();
            } catch (err) {
                console.error('Error fetching user bookings:', err);
                userBookingList.innerHTML = `
                    <div class="empty-list-message">
                        <h3>Could not load bookings</h3>
                        <p>${err.message}</p>
                    </div>
                `;
            }
        };

        userBookingFilter?.addEventListener('change', renderUserBookings);
        userBookingSearch?.addEventListener('input', renderUserBookings);
        userProfileForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem(getProfileStorageKey('user', 'display_name'), userDisplayNameInput.value.trim());
            localStorage.setItem(getProfileStorageKey('user', 'travel_note'), userTravelNoteInput.value.trim());
            setProfileStatus(userProfileStatus, 'Travel profile saved on this device.');
        });

        userBookingList.addEventListener('click', async (e) => {
            if (!e.target.classList.contains('btn-cancel')) return;

            const bookingId = e.target.dataset.id;
            if (!confirm('Are you sure you want to delete this booking?')) {
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    await handleApiFailure(res, 'Failed to delete booking');
                }

                alert('Booking deleted successfully.');
                fetchUserBookings();
            } catch (err) {
                console.error('Delete booking error:', err);
                alert(err.message);
            }
        });

        loadUserProfile();
        fetchUserBookings();
    }

    const addVehicleForm = document.getElementById('add-vehicle-form');
    const agencyBookingList = document.getElementById('agency-booking-list');
    const myVehiclesList = document.getElementById('my-vehicles-list');
    if (addVehicleForm) {
        if (!token || role !== 'agency') {
            alert('Please log in as an agency to access this dashboard.');
            window.location.href = 'login.html';
            return;
        }

        const agencyVehicleSearch = document.getElementById('agency-vehicle-search');
        const agencyVehicleFilter = document.getElementById('agency-vehicle-filter');
        const agencyBookingSearch = document.getElementById('agency-booking-search');
        const agencyBookingFilter = document.getElementById('agency-booking-filter');
        const agencyImageInput = document.getElementById('image');
        const agencyImagePreview = document.getElementById('agency-image-preview');
        const agencyImagePreviewCopy = document.getElementById('agency-image-preview-copy');
        const agencyTotalVehicles = document.getElementById('agency-total-vehicles');
        const agencyTotalBookings = document.getElementById('agency-total-bookings');
        const agencyConfirmedRevenue = document.getElementById('agency-confirmed-revenue');
        const agencyTopLocation = document.getElementById('agency-top-location');
        const agencyTopVehicles = document.getElementById('agency-top-vehicles');
        const agencyLocationDistribution = document.getElementById('agency-location-distribution');
        const agencyActivityTimeline = document.getElementById('agency-activity-timeline');
        const agencyUtilizationRing = document.getElementById('agency-utilization-ring');
        const agencyUtilizationRate = document.getElementById('agency-utilization-rate');
        const agencyBookedVehiclesCount = document.getElementById('agency-booked-vehicles-count');
        const agencyAvailableVehiclesCount = document.getElementById('agency-available-vehicles-count');
        const agencyProfileForm = document.getElementById('agency-profile-form');
        const agencyDisplayNameInput = document.getElementById('agency-display-name');
        const agencyOpsNoteInput = document.getElementById('agency-ops-note');
        const agencyProfileStatus = document.getElementById('agency-profile-status');
        let allAgencyVehicles = [];
        let allAgencyBookings = [];

        const loadAgencyProfile = () => {
            if (agencyDisplayNameInput) {
                agencyDisplayNameInput.value = localStorage.getItem(getProfileStorageKey('agency', 'display_name')) || '';
            }
            if (agencyOpsNoteInput) {
                agencyOpsNoteInput.value = localStorage.getItem(getProfileStorageKey('agency', 'ops_note')) || '';
            }
        };

        const renderAgencySummary = () => {
            agencyTotalVehicles.textContent = allAgencyVehicles.length;
            agencyTotalBookings.textContent = allAgencyBookings.length;

            const confirmedRevenue = allAgencyBookings
                .filter((booking) => booking.status === 'Confirmed')
                .reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);
            agencyConfirmedRevenue.textContent = formatCurrency(confirmedRevenue);

            const locationCounts = allAgencyVehicles.reduce((acc, vehicle) => {
                const location = vehicle.location || 'Unknown';
                acc[location] = (acc[location] || 0) + 1;
                return acc;
            }, {});
            const topLocationEntry = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0];
            agencyTopLocation.textContent = topLocationEntry ? topLocationEntry[0] : '-';

            const upcomingVehicleIds = new Set(
                allAgencyBookings.filter(isUpcomingBooking).map((booking) => booking.vehicleId?._id).filter(Boolean)
            );
            const totalVehicles = allAgencyVehicles.length;
            const bookedVehicles = upcomingVehicleIds.size;
            const availableVehicles = Math.max(0, totalVehicles - bookedVehicles);
            const utilizationPercent = totalVehicles ? Math.round((bookedVehicles / totalVehicles) * 100) : 0;

            agencyBookedVehiclesCount.textContent = bookedVehicles;
            agencyAvailableVehiclesCount.textContent = availableVehicles;
            agencyUtilizationRate.textContent = `${utilizationPercent}%`;
            agencyUtilizationRing?.style.setProperty('--utilization', `${utilizationPercent}%`);
        };

        const renderAgencyInsights = () => {
            const revenueByVehicle = allAgencyBookings.reduce((acc, booking) => {
                const key = booking.vehicleId?._id || 'removed';
                if (!acc[key]) {
                    acc[key] = {
                        label: booking.vehicleId?.modelName || 'Vehicle Removed',
                        total: 0
                    };
                }
                acc[key].total += Number(booking.totalPrice || 0);
                return acc;
            }, {});
            const topVehicleEntries = Object.values(revenueByVehicle)
                .sort((a, b) => b.total - a.total)
                .slice(0, 4);
            const maxVehicleRevenue = topVehicleEntries[0]?.total || 1;

            agencyTopVehicles.innerHTML = topVehicleEntries.length
                ? renderDistributionRows(
                      topVehicleEntries.map((entry) => ({
                          label: entry.label,
                          total: entry.total,
                          valuePercent: (entry.total / maxVehicleRevenue) * 100
                      })),
                      (item) => formatCurrency(item.total)
                  )
                : `<p class="inline-empty">Your highest performing vehicles will appear here.</p>`;

            const locationCounts = allAgencyVehicles.reduce((acc, vehicle) => {
                const location = vehicle.location || 'Unknown';
                acc[location] = (acc[location] || 0) + 1;
                return acc;
            }, {});
            const locationEntries = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const maxLocationCount = Math.max(...locationEntries.map(([, count]) => count), 1);

            agencyLocationDistribution.innerHTML = locationEntries.length
                ? renderBarRows(
                      locationEntries.map(([label, count]) => ({
                          label,
                          count,
                          valuePercent: (count / maxLocationCount) * 100
                      })),
                      (item) => `${item.count}`
                  )
                : `<p class="inline-empty">Add listings in more cities to see your footprint.</p>`;

            const recentBookingItems = allAgencyBookings.map((booking) => ({
                title: `${booking.userId?.username || 'A renter'} booked ${booking.vehicleId?.modelName || 'a vehicle'}`,
                detail: `${escapeHtml(booking.status)} • ${formatDate(booking.startDate)} • ${formatCurrency(booking.totalPrice)}`,
                date: booking.createdAt || booking.startDate
            }));
            const recentVehicleItems = allAgencyVehicles.map((vehicle) => ({
                title: `${vehicle.modelName} is live in ${vehicle.location}`,
                detail: `${vehicle.type} • ${formatCurrency(vehicle.pricePerDay)} / day`,
                date: vehicle.createdAt
            }));
            const recentItems = [...recentBookingItems, ...recentVehicleItems]
                .filter((item) => item.date)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);

            agencyActivityTimeline.innerHTML = recentItems.length
                ? recentItems
                      .map(
                          (item) => `
                              <div class="timeline-item">
                                  <span class="timeline-dot"></span>
                                  <div class="timeline-content">
                                      <strong>${escapeHtml(item.title)}</strong>
                                      <p class="timeline-meta">${escapeHtml(item.detail)}</p>
                                  </div>
                              </div>
                          `
                      )
                      .join('')
                : `<p class="inline-empty">Booking and listing activity will appear here.</p>`;
        };

        const renderAgencyVehicles = () => {
            const query = (agencyVehicleSearch?.value || '').trim().toLowerCase();
            const filterValue = agencyVehicleFilter?.value || 'all';

            const filteredVehicles = allAgencyVehicles.filter((vehicle) => {
                const matchesType = filterValue === 'all' || vehicle.type === filterValue;
                const haystack = [vehicle.modelName, vehicle.type, vehicle.location].join(' ').toLowerCase();
                const matchesQuery = !query || haystack.includes(query);
                return matchesType && matchesQuery;
            });

            myVehiclesList.innerHTML = '';

            if (filteredVehicles.length === 0) {
                myVehiclesList.innerHTML = `
                    <div class="empty-list-message">
                        <h3>No matching vehicles</h3>
                        <p>Try clearing the filters or add a new listing to expand your fleet.</p>
                    </div>
                `;
                return;
            }

            filteredVehicles.forEach((vehicle) => {
                const availabilityClass = vehicle.isBooked ? 'status-pending' : 'status-confirmed';
                myVehiclesList.innerHTML += `
                    <div class="card">
                        <img src="${vehicle.image || PLACEHOLDER_IMAGE}" alt="${escapeHtml(vehicle.modelName)}" class="card-image">
                        <div class="card-content">
                            <h4>${escapeHtml(vehicle.modelName)}</h4>
                            <p>${escapeHtml(vehicle.type)} in ${escapeHtml(vehicle.location)}</p>
                            <p>${escapeHtml(vehicle.description || 'No description added yet.')}</p>
                            <div class="status-badge ${availabilityClass}">${escapeHtml(getVehicleAvailabilityText(vehicle))}</div>
                            <p>${formatCurrency(vehicle.pricePerDay)} / day</p>
                            <button class="btn-cancel btn-delete" data-id="${vehicle._id}">Delete Vehicle</button>
                        </div>
                    </div>
                `;
            });
        };

        const renderAgencyBookings = () => {
            const query = (agencyBookingSearch?.value || '').trim().toLowerCase();
            const filterValue = agencyBookingFilter?.value || 'all';

            const filteredBookings = allAgencyBookings.filter((booking) => {
                const matchesFilter =
                    filterValue === 'all' ||
                    (filterValue === 'confirmed' && booking.status === 'Confirmed') ||
                    (filterValue === 'pending' && booking.status === 'Pending') ||
                    (filterValue === 'upcoming' && isUpcomingBooking(booking));

                const haystack = [
                    booking.vehicleId?.modelName,
                    booking.userId?.username,
                    booking.userId?.email
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                const matchesQuery = !query || haystack.includes(query);
                return matchesFilter && matchesQuery;
            });

            agencyBookingList.innerHTML = '';

            if (filteredBookings.length === 0) {
                agencyBookingList.innerHTML = `
                    <div class="empty-list-message">
                        <h3>No matching bookings</h3>
                        <p>Adjust your booking filters to see a different slice of activity.</p>
                    </div>
                `;
                return;
            }

            filteredBookings.forEach((booking) => {
                const statusClass =
                    booking.status === 'Cancelled' || booking.status === 'Rejected'
                        ? 'status-cancelled'
                        : booking.status === 'Confirmed'
                          ? 'status-confirmed'
                          : 'status-pending';

                agencyBookingList.innerHTML += `
                    <div class="card">
                        <div class="card-content">
                            <h4>${escapeHtml(booking.vehicleId ? booking.vehicleId.modelName : 'Vehicle Removed')}</h4>
                            <p>Booked by: ${escapeHtml(booking.userId ? booking.userId.username : 'N/A')}</p>
                            <p>Email: ${escapeHtml(booking.userId ? booking.userId.email : 'N/A')}</p>
                            <p>Start Date: ${formatDate(booking.startDate)}</p>
                            <p>End Date: ${formatDate(booking.endDate)}</p>
                            <p>Pickup Time: ${escapeHtml(booking.pickupTime || 'N/A')}</p>
                            <div class="status-badge ${statusClass}">${escapeHtml(booking.status)}</div>
                            <p class="price">Total: ${formatCurrency(booking.totalPrice)}</p>
                            ${
                                booking.status === 'Pending'
                                    ? `<button class="btn-primary btn-confirm-booking" data-id="${booking._id}">Confirm Booking</button>
                                       <button class="btn-cancel btn-reject-booking" data-id="${booking._id}">Reject Booking</button>`
                                    : ''
                            }
                            <button class="btn-cancel" data-id="${booking._id}">Delete Booking</button>
                        </div>
                    </div>
                `;
            });
        };

        agencyVehicleSearch?.addEventListener('input', renderAgencyVehicles);
        agencyVehicleFilter?.addEventListener('change', renderAgencyVehicles);
        agencyBookingSearch?.addEventListener('input', renderAgencyBookings);
        agencyBookingFilter?.addEventListener('change', renderAgencyBookings);
        agencyProfileForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            localStorage.setItem(getProfileStorageKey('agency', 'display_name'), agencyDisplayNameInput.value.trim());
            localStorage.setItem(getProfileStorageKey('agency', 'ops_note'), agencyOpsNoteInput.value.trim());
            setProfileStatus(agencyProfileStatus, 'Agency note saved on this device.');
        });

        agencyImageInput?.addEventListener('change', () => {
            const file = agencyImageInput.files?.[0];
            if (!file) {
                agencyImagePreview.classList.add('hidden');
                agencyImagePreview.removeAttribute('src');
                agencyImagePreviewCopy.textContent = 'Choose an image to preview it before publishing.';
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            agencyImagePreview.src = previewUrl;
            agencyImagePreview.classList.remove('hidden');
            agencyImagePreviewCopy.textContent = `${file.name} selected and ready to upload.`;
        });

        const fetchAgencyBookings = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/bookings/agency-bookings`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    await handleApiFailure(res, 'Failed to fetch agency bookings');
                }

                const bookings = await res.json();
                allAgencyBookings = bookings;
                renderAgencySummary();
                renderAgencyInsights();

                if (bookings.length === 0) {
                    agencyBookingList.innerHTML = `
                        <div class="empty-list-message">
                            <h3>No Bookings Yet</h3>
                            <p>Bookings for your listed vehicles will appear here.</p>
                        </div>
                    `;
                    return;
                }

                renderAgencyBookings();
            } catch (err) {
                console.error('Error fetching agency bookings:', err);
                agencyBookingList.innerHTML = `
                    <div class="empty-list-message">
                        <h3>Could not load agency bookings</h3>
                        <p>${err.message}</p>
                    </div>
                `;
            }
        };

        const fetchMyVehicles = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/vehicles/my-vehicles`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    await handleApiFailure(res, 'Failed to fetch vehicles');
                }

                const vehicles = await res.json();
                allAgencyVehicles = vehicles;
                renderAgencySummary();
                renderAgencyInsights();

                if (vehicles.length === 0) {
                    myVehiclesList.innerHTML = `
                        <div class="empty-list-message">
                            <h3>No Vehicles Listed</h3>
                            <p>Use the form to add your first listing.</p>
                        </div>
                    `;
                    return;
                }

                renderAgencyVehicles();
            } catch (err) {
                console.error('Error fetching agency vehicles:', err);
                myVehiclesList.innerHTML = `
                    <div class="empty-list-message">
                        <h3>Could not load vehicles</h3>
                        <p>${err.message}</p>
                    </div>
                `;
            }
        };

        addVehicleForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('modelName', document.getElementById('modelName').value.trim());
            formData.append('type', document.getElementById('type').value);
            formData.append('location', document.getElementById('location').value.trim());
            formData.append('pricePerDay', document.getElementById('pricePerDay').value);

            const imageFile = document.getElementById('image').files[0];
            if (!imageFile) {
                alert('Please select an image file.');
                return;
            }

            formData.append('image', imageFile);

            const description = document.getElementById('description').value.trim();
            if (description) {
                formData.append('description', description);
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/vehicles`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData
                });

                if (!res.ok) {
                    await handleApiFailure(res, 'Failed to add vehicle');
                }

                alert('Vehicle added successfully.');
                addVehicleForm.reset();
                agencyImagePreview.classList.add('hidden');
                agencyImagePreview.removeAttribute('src');
                agencyImagePreviewCopy.textContent = 'Choose an image to preview it before publishing.';
                fetchAgencyBookings();
                fetchMyVehicles();
            } catch (err) {
                console.error('Error adding vehicle:', err);
                alert(err.message);
            }
        });

        myVehiclesList.addEventListener('click', async (e) => {
            if (!e.target.classList.contains('btn-delete')) return;

            const vehicleId = e.target.dataset.id;
            if (!confirm('Are you sure you want to delete this vehicle?')) {
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    await handleApiFailure(res, 'Failed to delete vehicle');
                }

                alert('Vehicle deleted successfully.');
                fetchAgencyBookings();
                fetchMyVehicles();
            } catch (err) {
                console.error('Delete vehicle error:', err);
                alert(err.message);
            }
        });

        agencyBookingList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-confirm-booking')) {
                const bookingId = e.target.dataset.id;
                if (!confirm('Confirm this pending booking?')) {
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/confirm`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (!res.ok) {
                        await handleApiFailure(res, 'Failed to confirm booking');
                    }

                    alert('Booking confirmed successfully.');
                    fetchAgencyBookings();
                    fetchMyVehicles();
                } catch (err) {
                    console.error('Confirm booking error:', err);
                    alert(err.message);
                }
                return;
            }

            if (e.target.classList.contains('btn-reject-booking')) {
                const bookingId = e.target.dataset.id;
                if (!confirm('Reject this pending booking?')) {
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/reject`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (!res.ok) {
                        await handleApiFailure(res, 'Failed to reject booking');
                    }

                    alert('Booking rejected successfully.');
                    fetchAgencyBookings();
                    fetchMyVehicles();
                } catch (err) {
                    console.error('Reject booking error:', err);
                    alert(err.message);
                }
                return;
            }

            if (!e.target.classList.contains('btn-cancel')) return;

            const bookingId = e.target.dataset.id;
            if (!confirm("Are you sure you want to delete this user's booking?")) {
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    await handleApiFailure(res, 'Failed to delete booking');
                }

                alert('Booking deleted successfully.');
                fetchAgencyBookings();
            } catch (err) {
                console.error('Delete booking error:', err);
                alert(err.message);
            }
        });

        loadAgencyProfile();
        fetchAgencyBookings();
        fetchMyVehicles();
    }

    const bookingDetailsForm = document.getElementById('booking-details-form');
    if (bookingDetailsForm) {
        if (!token || role !== 'user') {
            alert('Please log in as a user to book a vehicle.');
            window.location.href = 'login.html';
            return;
        }

        let vehicleId = null;
        let agencyId = null;
        let pricePerDay = 0;
        let isVehicleUnavailable = false;

        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const pickupTimeInput = document.getElementById('pickup-time');
        const totalDaysEl = document.getElementById('total-days');
        const totalPriceEl = document.getElementById('total-price');
        const payOnlineBtn = document.getElementById('pay-online-btn');
        const payLaterBtn = document.getElementById('pay-later-btn');

        const calculateTotal = () => {
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);

            if (startDateInput.value && endDateInput.value && endDate > startDate) {
                const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
                const total = days * pricePerDay;
                totalDaysEl.textContent = days;
                totalPriceEl.textContent = formatCurrency(total);
                return;
            }

            totalDaysEl.textContent = '0';
            totalPriceEl.textContent = formatCurrency(0);
        };

        const getBookingDetails = () => {
            const totalDays = Number(totalDaysEl.textContent);
            if (totalDays <= 0) {
                alert('End date must be after the start date.');
                return null;
            }

            if (!pickupTimeInput.value) {
                alert('Please select a pickup time.');
                return null;
            }

            return {
                vehicleId,
                agencyId,
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                pickupTime: pickupTimeInput.value,
                totalPrice: totalDays * pricePerDay
            };
        };

        const createBooking = async (status) => {
            if (isVehicleUnavailable) {
                alert('This vehicle is already booked right now. Please choose another vehicle.');
                return;
            }

            const bookingDetails = getBookingDetails();
            if (!bookingDetails) return;

            try {
                const res = await fetch(`${API_BASE_URL}/api/bookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ ...bookingDetails, status })
                });

                if (!res.ok) {
                    await handleApiFailure(res, 'Failed to create booking');
                }

                localStorage.removeItem('tempBooking');
                alert(status === 'Confirmed' ? 'Payment successful and booking confirmed.' : 'Booking created successfully.');
                window.location.href = 'dashboard-user.html';
            } catch (err) {
                console.error('Booking error:', err);
                alert(err.message);
            }
        };

        const fetchVehicleDetails = async () => {
            const params = new URLSearchParams(window.location.search);
            vehicleId = params.get('id');

            if (!vehicleId) {
                alert('No vehicle selected.');
                window.location.href = 'search.html';
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}`);
                if (!res.ok) {
                    await handleApiFailure(res, 'Vehicle not found');
                }

                const vehicle = await res.json();
                document.getElementById('vehicle-image').src = vehicle.image || PLACEHOLDER_IMAGE;
                document.getElementById('vehicle-name').textContent = vehicle.modelName;
                document.getElementById('vehicle-agency').textContent = `Agency: ${vehicle.agencyId?.agencyName || 'N/A'}`;
                document.getElementById('vehicle-description').textContent = vehicle.description || 'No description available.';
                document.getElementById('vehicle-location').textContent = `Location: ${vehicle.location || 'Not specified'}`;
                document.getElementById('vehicle-price-day').textContent = `${formatCurrency(vehicle.pricePerDay)} / day`;
                pricePerDay = Number(vehicle.pricePerDay);
                agencyId = vehicle.agencyId?._id || '';
                isVehicleUnavailable = Boolean(vehicle.isBooked);

                const existingAvailabilityBadge = document.getElementById('vehicle-availability-status');
                if (existingAvailabilityBadge) {
                    existingAvailabilityBadge.remove();
                }

                const availabilityBadge = document.createElement('div');
                availabilityBadge.id = 'vehicle-availability-status';
                availabilityBadge.className = `status-badge ${vehicle.isBooked ? 'status-pending' : 'status-confirmed'}`;
                availabilityBadge.textContent = getVehicleAvailabilityText(vehicle);
                document.getElementById('vehicle-price-day').insertAdjacentElement('afterend', availabilityBadge);

                payOnlineBtn.disabled = vehicle.isBooked;
                payLaterBtn.disabled = vehicle.isBooked;
                if (vehicle.isBooked) {
                    payOnlineBtn.textContent = 'Currently Booked';
                    payLaterBtn.textContent = 'Unavailable';
                }
                calculateTotal();
            } catch (err) {
                console.error('Error loading vehicle details:', err);
                alert(err.message);
                window.location.href = 'search.html';
            }
        };

        startDateInput.addEventListener('change', calculateTotal);
        endDateInput.addEventListener('change', calculateTotal);

        payLaterBtn.addEventListener('click', async () => {
            if (confirm('Confirm this booking and pay on pickup?')) {
                await createBooking('Pending');
            }
        });

        payOnlineBtn.addEventListener('click', () => {
            const bookingDetails = getBookingDetails();
            if (!bookingDetails) return;

            localStorage.setItem('tempBooking', JSON.stringify(bookingDetails));
            window.location.href = 'mock-payment.html';
        });

        fetchVehicleDetails();
    }
});
