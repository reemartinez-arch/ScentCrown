document.addEventListener('DOMContentLoaded', async () => {
  const target = document.querySelector('#product-detail');
  const id = new URLSearchParams(location.search).get('id');
  if (!id || !/^\d+$/.test(id)) {
    target.innerHTML = '<div class="empty-panel"><h2>That product could not be found.</h2><a class="button button-dark" href="/customer/shop.html">Back to the collection</a></div>';
    return;
  }
  try {
    const { product } = await Store.api(`/api/products/${id}`);
    document.title = `${product.name} — ScentCrown`;
    target.innerHTML = `<div class="detail-image">${product.image_url ? `<img src="${Store.escapeHtml(product.image_url)}" alt="${Store.escapeHtml(product.name)}">` : '<span class="bottle-art">SC</span>'}</div>
      <section class="detail-copy"><p class="eyebrow">${Store.escapeHtml(product.brand)} · ${product.category === 'cap' ? 'ACCESSORIES' : 'EAU DE PARFUM'}</p><h1>${Store.escapeHtml(product.name)}</h1><p class="detail-price">${Store.money(product.price)}</p><p class="detail-description">${Store.escapeHtml(product.description)}</p><p class="detail-stock">${product.stock ? `${product.stock} available` : 'Currently out of stock'}</p>
      <div class="detail-actions"><input id="product-quantity" type="number" min="1" max="${product.stock}" value="1" aria-label="Quantity" ${product.stock ? '' : 'disabled'}><button class="button button-dark" id="add-to-bag" ${product.stock ? '' : 'disabled'}>Add to bag</button></div><p class="fine-print">Complimentary delivery on orders over $100</p></section>`;
    target.querySelector('#add-to-bag').addEventListener('click', async () => {
      try {
        const quantity = Number(target.querySelector('#product-quantity').value);
        await Store.api('/api/cart', { method: 'PUT', body: JSON.stringify({ productId: product.id, quantity }) });
        Store.notice('Added to your bag.', 'success');
        const count = document.querySelector('#cart-count');
        if (count) count.textContent = String(Number(count.textContent) + quantity);
      } catch (error) {
        if (error.message.includes('sign in')) location.href = '/customer/login.html';
        else Store.notice(error.message, 'error');
      }
    });
  } catch (error) {
    target.innerHTML = `<div class="empty-panel"><h2>${Store.escapeHtml(error.message)}</h2><a class="button button-dark" href="/customer/shop.html">Back to the collection</a></div>`;
  }
});
