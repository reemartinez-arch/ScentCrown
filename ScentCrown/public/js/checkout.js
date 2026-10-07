document.addEventListener('DOMContentLoaded', async () => {
  const form = document.querySelector('#checkout-form');
  if (!form) return;
  const summary = document.querySelector('#checkout-summary');
  const submit = form.querySelector('[type="submit"]');
  try {
    const { items } = await Store.api('/api/cart');
    if (!items.length) {
      summary.innerHTML = '<p>Your bag is empty. <a href="/customer/shop.html">Continue shopping</a></p>';
      submit.disabled = true;
      return;
    }
    const total = items.reduce((sum, item) => sum + Number(item.line_total), 0);
    summary.innerHTML = `${items.map((item) => `<div class="summary-line"><span>${Store.escapeHtml(item.name)} × ${item.quantity}</span><span>${Store.money(item.line_total)}</span></div>`).join('')}<div class="summary-line total-line"><strong>Total due on delivery</strong><strong>${Store.money(total)}</strong></div>`;
  } catch (error) {
    summary.innerHTML = `<p>${Store.escapeHtml(error.message)} <a href="/customer/login.html">Sign in</a></p>`;
    submit.disabled = true;
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      const { orderId } = await Store.api('/api/orders', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      location.href = `/customer/orders.html?placed=${orderId}`;
    } catch (error) {
      Store.notice(error.message, 'error');
    } finally {
      submit.disabled = false;
    }
  });
});
