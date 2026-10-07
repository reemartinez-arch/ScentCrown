document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#auth-form');
  if (!form) return;
  const params = new URLSearchParams(location.search);
  let mode = params.get('mode') === 'register' ? 'register' : 'login';
  const nameField = document.querySelector('#name-field');
  const title = document.querySelector('#auth-title');
  const submit = form.querySelector('[type="submit"]');
  const switcher = document.querySelector('#auth-switch');

  function drawMode() {
    const registering = mode === 'register';
    nameField.hidden = !registering;
    form.elements.name.required = registering;
    title.textContent = registering ? 'Create your account' : 'Welcome back';
    submit.textContent = registering ? 'Create account' : 'Sign in';
    switcher.innerHTML = registering
      ? 'Already have an account? <button class="inline-link" type="button">Sign in</button>'
      : 'New to ScentCrown? <button class="inline-link" type="button">Create an account</button>';
    switcher.querySelector('button').addEventListener('click', () => {
      mode = registering ? 'login' : 'register';
      drawMode();
    });
  }

  drawMode();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      const { user } = await Store.api(`/api/auth/${mode}`, { method: 'POST', body: JSON.stringify(data) });
      location.href = user.role === 'admin' ? '/admin/index.html' : '/customer/profile.html';
    } catch (error) {
      Store.notice(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });
});
