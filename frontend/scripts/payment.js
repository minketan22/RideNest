const formatCurrency = (amount) => `Rs. ${Number(amount || 0).toLocaleString('en-IN')}`;

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('fade-in');

    const paymentForm = document.querySelector('.payment-form');
    const confirmBtn = document.getElementById('confirm-payment-btn');
    const mockTotalPriceEl = document.getElementById('mock-total-price');
    const buttonTotalPriceEl = document.getElementById('button-total-price');
    const token = localStorage.getItem('token');
    const bookingDetails = JSON.parse(localStorage.getItem('tempBooking') || 'null');

    if (!paymentForm || !confirmBtn || !mockTotalPriceEl || !buttonTotalPriceEl) {
        return;
    }

    if (!bookingDetails || !token) {
        alert('No booking details were found. Returning to search.');
        window.location.href = 'search.html';
        return;
    }

    const priceText = formatCurrency(bookingDetails.totalPrice);
    mockTotalPriceEl.textContent = priceText;
    buttonTotalPriceEl.textContent = priceText;

    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        confirmBtn.textContent = 'Processing payment...';
        confirmBtn.disabled = true;

        await new Promise((resolve) => setTimeout(resolve, 1200));

        try {
            const res = await fetch(`${API_BASE_URL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...bookingDetails,
                    status: 'Confirmed',
                    paymentId: `mock_online_${Date.now()}`
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.msg || 'Booking failed');
            }

            localStorage.removeItem('tempBooking');
            alert('Payment successful and booking confirmed.');
            window.location.href = 'dashboard-user.html';
        } catch (err) {
            console.error('Payment error:', err);
            alert(err.message || 'An error occurred during payment.');
            confirmBtn.innerHTML = `Pay <span id="button-total-price">${priceText}</span>`;
            confirmBtn.disabled = false;
        }
    });
});
