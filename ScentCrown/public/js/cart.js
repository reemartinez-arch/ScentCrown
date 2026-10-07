document.addEventListener('DOMContentLoaded', async () => {
  const target = document.querySelector('#cart-content');
  if (!target) return;
  try {
    const { items } = await Store.api('/api/cart');
    if (!items.length) {
      target.innerHTML = '<div class="empty-panel"><span class="empty-icon">✳</span><h2>Your bag is waiting</h2><p>Discover a scent worth remembering.</p><a class="button button-dark" href="/customer/shop.html">Explore the collection</a></div>';
      return;
    }
    const subtotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);
    target.innerHTML = `<div class="cart-layout"><div class="cart-items">${items.map((item) => `
      <article class="cart-item"><a class="cart-thumb" href="/customer/product.html?id=${item.product_id}">${item.image_url ? `<img src="${Store.escapeHtml(item.image_url)}" alt="${Store.escapeHtml(item.name)}" loading="lazy">` : ''}</a>
      <div class="cart-item-main"><p class="eyebrow">${Store.escapeHtml(item.brand)}</p><h3>${Store.escapeHtml(item.name)}</h3><p>${Store.money(item.price)}</p>
      <label class="quantity-control">Qty <input type="number" min="1" max="${item.stock}" value="${item.quantity}" data-quantity="${item.product_id}"></label></div>
      <strong>${Store.money(item.line_total)}</strong><button class="remove-button" type="button" data-remove="${item.product_id}" aria-label="Remove ${Store.escapeHtml(item.name)}">×</button></article>`).join('')}</div>
      <aside class="summary-card"><h2>Order summary</h2><div class="summary-line"><span>Subtotal</span><span>${Store.money(subtotal)}</span></div><div class="summary-line"><span>Delivery</span><span>Calculated at checkout</span></div><div class="summary-line total-line"><span>Total</span><strong>${Store.money(subtotal)}</strong></div><a class="button button-dark button-full" href="/customer/checkout.html">Continue to checkout</a><p class="fine-print">Secure checkout · Cash on delivery</p></aside></div>`;
    target.querySelectorAll('[data-quantity]').forEach((input) => input.addEventListener('change', async () => {
      try {
        await Store.api('/api/cart', { method: 'PUT', body: JSON.stringify({ productId: Number(input.dataset.quantity), quantity: Number(input.value) }) });
        location.reload();
      } catch (error) { Store.notice(error.message, 'error'); }
    }));
    target.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', async () => {
      try {
        await Store.api(`/api/cart/${button.dataset.remove}`, { method: 'DELETE' });
        location.reload();
      } catch (error) { Store.notice(error.message, 'error'); }
    }));
  } catch (error) {
    target.innerHTML = `<div class="empty-panel"><h2>Sign in to view your bag</h2><a class="button button-dark" href="/customer/login.html">Sign in</a><p>${Store.escapeHtml(error.message)}</p></div>`;
  }
});
