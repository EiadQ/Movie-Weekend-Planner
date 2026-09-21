document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', async (e) => {
        if (!e.target.classList.contains('remove-user-icon')) return;
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await fetch(`/users/${e.target.dataset.id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                e.target.closest('tr').remove();
                alert('User removed!');
            } else {
                alert(result.error || 'Unable to remove user.');
            }
        } catch (err) {
            console.error(err);
            alert('Error removing user.');
        }
    });
});
