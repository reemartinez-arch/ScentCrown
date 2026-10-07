document.addEventListener('DOMContentLoaded', async () => {
  const target = document.querySelector('#orders-content');
  if (!target) return;
  const placedId = new URLSearchParams(location.search).get('placed');
  if (placedId) Store.notice(`Order #${Store.escapeHtml(placedId)} placed successfully.`, 'success');
  try {
    const { orders } = await Store.api('/api/orders');
    if (!orders.length) {
      target.innerHTML = '<div class="empty-panel"><h2>No orders just yet.</h2><a class="button button-dark" href="/customer/shop.html">Explore the collection</a></div>';
      return;
    }
    target.innerHTML = `<div class="order-list">${orders.map((order) => `<article class="order-card"><div><p class="eyebrow">ORDER #${order.id}</p><h3>${new Date(order.created_at).toLocaleDateString()}</h3><p>${Store.money(order.total)} · Cash on delivery</p></div><div><span class="status-badge status-${Store.escapeHtml(order.status)}">${Store.escapeHtml(order.status)}</span><p>Payment ${Store.escapeHtml(order.payment_status)}</p></div></article>`).join('')}</div>`;
  } catch (error) {
    target.innerHTML = `<div class="empty-panel"><h2>Sign in to see your orders</h2><a class="button button-dark" href="/customer/login.html">Sign in</a><p>${Store.escapeHtml(error.message)}</p></div>`;
  }
});
