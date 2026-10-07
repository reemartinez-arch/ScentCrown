document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('#product-grid');
  if (!grid) return;
  const params = new URLSearchParams(location.search);
  const category = document.body.dataset.category || params.get('category');
  const query = params.get('search');
  const heading = document.querySelector('#collection-title');
  if (query && heading) heading.textContent = `Search results for “${query}”`;
  const searchInput = document.querySelector('.search-form input');
  if (searchInput && query) searchInput.value = query;
  const filters = new URLSearchParams();
  if (category) filters.set('category', category);
  if (query) filters.set('search', query);
  if (location.pathname === '/' && !category && !query) filters.set('featured', 'true');
  const endpoint = `/api/products${filters.size ? `?${filters}` : ''}`;
  try {
    const { products } = await Store.api(endpoint);
    if (!products.length) {
      grid.innerHTML = '<p class="empty-state">Nothing here just yet. Try another collection.</p>';
      return;
    }
    grid.innerHTML = products.map((product, index) => `
      <article class="product-card">
        <a class="product-image" href="/customer/product.html?id=${product.id}">
          ${product.is_featured ? '<span class="product-tag">Bestseller</span>' : ''}
          ${product.image_url ? `<img src="${Store.escapeHtml(product.image_url)}" alt="${Store.escapeHtml(product.name)}" loading="lazy">` : `<span class="bottle-art bottle-${index % 4}">SC</span>`}
        </a>
        <div class="product-meta"><div><p class="eyebrow">${Store.escapeHtml(product.brand)}</p><h3><a href="/customer/product.html?id=${product.id}">${Store.escapeHtml(product.name)}</a></h3></div><span>${Store.money(product.price)}</span></div>
        <p class="product-category">${product.category === 'cap' ? 'ACCESSORIES' : 'EAU DE PARFUM'}</p>
      </article>`).join('');
  } catch (error) {
    grid.innerHTML = `<p class="empty-state">${Store.escapeHtml(error.message)}</p>`;
  }
});
