document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('fade-in');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const roleInputs = document.querySelectorAll('input[name="role"]');
    const userFields = document.querySelector('.user-fields');
    const agencyFields = document.querySelector('.agency-fields');
    const usernameInput = document.getElementById('username');
    const phoneInput = document.getElementById('phone');
    const agencyNameInput = document.getElementById('agencyName');
    const addressInput = document.getElementById('address');

    const parseResponse = async (res) => {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return res.json();
        }

        const text = await res.text();
        return { msg: text || 'Request failed' };
    };

    const syncRegistrationFields = () => {
        if (!registerForm) return;

        const role = document.querySelector('input[name="role"]:checked')?.value || 'user';
        const isAgency = role === 'agency';

        if (userFields) userFields.style.display = isAgency ? 'none' : 'block';
        if (agencyFields) agencyFields.style.display = isAgency ? 'block' : 'none';

        if (usernameInput) usernameInput.required = !isAgency;
        if (phoneInput) phoneInput.required = !isAgency;
        if (agencyNameInput) agencyNameInput.required = isAgency;
        if (addressInput) addressInput.required = isAgency;
    };

    roleInputs.forEach((radio) => {
        radio.addEventListener('change', syncRegistrationFields);
    });
    syncRegistrationFields();

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const role = document.querySelector('input[name="role"]:checked').value;
            const loginUrl =
                role === 'user'
                    ? `${API_BASE_URL}/api/auth/login-user`
                    : `${API_BASE_URL}/api/auth/login-agency`;
            const dashboardUrl = role === 'user' ? 'dashboard-user.html' : 'dashboard-agency.html';

            try {
                const res = await fetch(loginUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await parseResponse(res);
                if (!res.ok) {
                    throw new Error(data.msg || 'Invalid credentials');
                }

                localStorage.setItem('token', data.token);
                localStorage.setItem('role', role);
                localStorage.removeItem('tempBooking');
                window.location.href = dashboardUrl;
            } catch (err) {
                console.error('Login error:', err);
                alert(err.message || 'An error occurred during login.');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const role = document.querySelector('input[name="role"]:checked').value;
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            const requestConfig =
                role === 'user'
                    ? {
                          url: `${API_BASE_URL}/api/auth/register-user`,
                          body: {
                              email,
                              password,
                              username: usernameInput.value.trim(),
                              phone: phoneInput.value.trim()
                          }
                      }
                    : {
                          url: `${API_BASE_URL}/api/auth/register-agency`,
                          body: {
                              email,
                              password,
                              agencyName: agencyNameInput.value.trim(),
                              address: addressInput.value.trim()
                          }
                      };

            try {
                const res = await fetch(requestConfig.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestConfig.body)
                });

                const data = await parseResponse(res);
                if (!res.ok) {
                    throw new Error(data.msg || 'Registration failed');
                }

                alert('Registration successful. Please log in.');
                window.location.href = 'login.html';
            } catch (err) {
                console.error('Registration error:', err);
                alert(err.message || 'An error occurred during registration.');
            }
        });
    }
});
