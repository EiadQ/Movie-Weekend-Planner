document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveProfile');
    if (!saveButton) return;

    saveButton.addEventListener('click', async () => {
        const username = document.getElementById('profileUsername').value.trim();
        const password = document.getElementById('profilePassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const privacy = document.getElementById('privacyCheckbox').checked;

        if (!username || !password || !confirmPassword) {
            alert('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Password and confirm password must match.');
            return;
        }

        try {
            const res = await fetch(`/users/${profileUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, privacy })
            });
            const result = await res.json();
            if (result.success) {
                alert('Changes saved successfully.');
            } else {
                alert(result.error || 'Unable to save changes.');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving changes.');
        }
    });
});
