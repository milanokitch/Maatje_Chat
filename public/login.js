document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            window.location.href = '/'; // Doorsturen naar hoofdsite
        } else {
            document.getElementById('loginError').textContent = data.message || 'Login mislukt';
        }
    } catch (err) {
        document.getElementById('loginError').textContent = 'Server niet bereikbaar';
    }
});