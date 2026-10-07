document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#profile-form');
  if (!form) return;
  try {
    const { user } = await Store.api('/api/auth/me');
    if (!user) {
      location.href = '/customer/login.html';
      return;
    }
    form.elements.name.value = user.name;
    document.querySelector('#profile-email').textContent = user.email;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const { user: updated } = await Store.api('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ name: form.elements.name.value }) });
        document.querySelector('#profile-email').textContent = updated.email;
        Store.notice('Profile updated.', 'success');
      } catch (error) {
        Store.notice(error.message, 'error');
      } finally {
        button.disabled = false;
      }
    });
  } catch (error) {
    Store.notice(error.message, 'error');
  }
});
