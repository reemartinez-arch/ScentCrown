(() => {
  const money = (amount) => `$${Number(amount || 0).toFixed(2)}`;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const body = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
    return body;
  }

  function notice(message, kind = 'info') {
    let region = document.querySelector('#toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.append(region);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${kind}`;
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  async function renderShell() {
    const header = document.querySelector('#site-header');
    const footer = document.querySelector('#site-footer');
    if (header) {
      let user = null;
      try {
        user = (await api('/api/auth/me')).user;
      } catch (error) {
        notice(error.message, 'error');
      }
      window.currentUser = user;
      header.innerHTML = `
        <div class="announcement">Complimentary delivery on orders over $100</div>
        <nav class="nav-wrap">
          <a class="brand" href="/"><span class="brand-mark">SC</span><span>SCENT<span class="brand-light">CROWN</span></span></a>
          <button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
          <div class="nav-links">
            <a href="/customer/shop.html">Shop all</a><a href="/customer/perfumes.html">Perfumes</a><a href="/customer/caps.html">Caps</a>
          </div>
          <div class="nav-actions">
            <a class="nav-account" href="${user ? '/customer/profile.html' : '/customer/login.html'}">${user ? escapeHtml(user.name.split(' ')[0]) : 'Sign in'}</a>
            ${user?.role === 'admin' ? '<a class="admin-link" href="/admin/index.html">Admin</a>' : ''}
            ${user ? '<button class="text-button" id="logout-button" type="button">Log out</button>' : ''}
            <a class="cart-link" href="/customer/cart.html" aria-label="Shopping bag">Bag <span id="cart-count">0</span></a>
          </div>
        </nav>`;
      const toggle = header.querySelector('.menu-toggle');
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        header.querySelector('.nav-links').classList.toggle('nav-open', !expanded);
      });
      header.querySelector('#logout-button')?.addEventListener('click', async () => {
        try {
          await api('/api/auth/logout', { method: 'POST' });
          window.location.href = '/';
        } catch (error) {
          notice(error.message, 'error');
        }
      });
      if (user) {
        try {
          const { items } = await api('/api/cart');
          const count = items.reduce((sum, item) => sum + Number(item.quantity), 0);
          header.querySelector('#cart-count').textContent = String(count);
        } catch (error) {
          notice(error.message, 'error');
        }
      }
    }
    if (footer) {
      footer.innerHTML = `<div class="footer-main"><a class="brand footer-brand" href="/"><span class="brand-mark">SC</span><span>SCENT<span class="brand-light">CROWN</span></span></a>
        <p>Find the notes that feel like you.</p><div class="footer-links"><a href="/customer/shop.html">Shop</a><a href="/customer/orders.html">Your orders</a><a href="/customer/profile.html">Account</a></div></div>
        <div class="footer-bottom"><span>© ${new Date().getFullYear()} ScentCrown</span><span>Crafted for the moments that linger.</span></div>`;
    }
  }

  window.Store = { api, money, escapeHtml, notice, renderShell };
  document.addEventListener('DOMContentLoaded', renderShell);
})();
