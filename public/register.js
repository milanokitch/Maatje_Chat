document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            window.location.href = '/login.html'; // Doorsturen naar login
        } else {
            document.getElementById('registerError').textContent = data.message || 'Registratie mislukt';
        }
    } catch (err) {
        document.getElementById('registerError').textContent = 'Server niet bereikbaar';
    }
});