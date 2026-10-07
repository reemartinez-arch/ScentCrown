document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('#admin-content');
  if (!main) return;
  const page = document.body.dataset.adminPage || 'dashboard';
  const message = (error) => { main.innerHTML = `<div class="admin-error">${Store.escapeHtml(error.message)}</div>`; };
  try {
    const me = await Store.api('/api/auth/me');
    if (!me.user || me.user.role !== 'admin') {
      location.href = '/customer/login.html';
      return;
    }
    if (page === 'dashboard') return await dashboard(main);
    if (page === 'products') return await products(main);
    if (page === 'inventory') return await inventory(main);
    if (page === 'orders') return await orders(main);
    if (page === 'customers') return await customers(main);
    if (page === 'payments') return await payments(main);
    if (page === 'reports') return await reports(main);
  } catch (error) { message(error); }

  async function dashboard(target) {
    const data = await Store.api('/api/admin/summary');
    target.innerHTML = `<div class="admin-stats"><article><span>Orders</span><strong>${data.totals.order_count}</strong></article><article><span>Revenue</span><strong>${Store.money(data.totals.revenue)}</strong></article><article><span>Customers</span><strong>${data.customers}</strong></article><article><span>Low stock</span><strong>${data.lowStock}</strong></article></div>
      <div class="admin-panel"><div class="admin-panel-heading"><div><p class="eyebrow">LATEST ACTIVITY</p><h2>Recent orders</h2></div><a href="/admin/orders.html">View all</a></div>${table(['Order', 'Customer', 'Email', 'Total', 'Status'], data.recentOrders.map((o) => [(`#${o.id}`), o.recipient_name, o.email, Store.money(o.total), badge(o.status)]))}</div>`;
  }

  async function products(target) {
    const data = await Store.api('/api/admin/products');
    target.innerHTML = `<div class="admin-panel-heading"><div><p class="eyebrow">CATALOG</p><h2>Products</h2></div><button class="button button-dark" id="new-product">Add product</button></div>
      <form id="product-form" class="admin-product-form" hidden><h3 id="product-form-title">Add a product</h3><input type="hidden" name="id"><div class="form-grid"><label>Name<input name="name" required maxlength="150"></label><label>Brand<input name="brand" required maxlength="100"></label><label>Category<select name="category"><option value="perfume">Perfume</option><option value="cap">Cap</option></select></label><label>Price<input name="price" type="number" min="0.01" step="0.01" required></label><label>Stock<input name="stock" type="number" min="0" required></label><label>Image URL<input name="imageUrl" type="url"></label><label class="span-two">Description<textarea name="description" required maxlength="2000"></textarea></label><label class="check-label"><input name="isFeatured" type="checkbox"> Featured product</label></div><div class="form-actions"><button class="button button-dark">Save product</button><button class="button button-outline" type="button" id="cancel-product">Cancel</button></div></form>
      <div class="admin-panel">${table(['Product', 'Category', 'Price', 'Stock', 'Visibility', 'Actions'], data.products.map((p) => [p.name, p.category, Store.money(p.price), p.stock, p.is_active ? 'Active' : 'Archived', p.is_active ? html(`<button class="table-action" data-edit="${p.id}">Edit</button> <button class="table-action danger" data-archive="${p.id}">Archive</button>`) : '—']))}</div>`;
    const form = target.querySelector('#product-form');
    target.querySelector('#new-product').addEventListener('click', () => { form.reset(); form.elements.id.value = ''; form.hidden = false; });
    target.querySelector('#cancel-product').addEventListener('click', () => { form.hidden = true; });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      data.isFeatured = form.elements.isFeatured.checked;
      const id = data.id;
      delete data.id;
      try {
        await Store.api(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
        location.reload();
      } catch (error) { Store.notice(error.message, 'error'); }
    });
    target.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => {
      const product = data.products.find((item) => item.id === Number(button.dataset.edit));
      for (const field of ['name', 'brand', 'category', 'price', 'stock', 'description']) form.elements[field].value = product[field];
      form.elements.imageUrl.value = product.image_url || '';
      form.elements.isFeatured.checked = Boolean(product.is_featured);
      form.elements.id.value = product.id;
      form.hidden = false;
      form.scrollIntoView({ behavior: 'smooth' });
    }));
    target.querySelectorAll('[data-archive]').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('Archive this product? It will no longer appear in the shop.')) return;
      try { await Store.api(`/api/admin/products/${button.dataset.archive}`, { method: 'DELETE' }); location.reload(); }
      catch (error) { Store.notice(error.message, 'error'); }
    }));
  }

  async function inventory(target) {
    const data = await Store.api('/api/admin/inventory');
    target.innerHTML = `<div class="admin-panel"><p class="eyebrow">STOCK CONTROL</p><h2>Inventory</h2>${table(['Product', 'Brand', 'Category', 'Available', 'Update stock'], data.products.map((p) => [p.name, p.brand, p.category, p.stock, html(`<form class="stock-form" data-stock="${p.id}"><input type="number" min="0" value="${p.stock}" aria-label="Stock quantity"><button class="table-action">Save</button></form>`)]))}</div>`;
    target.querySelectorAll('.stock-form').forEach((form) => form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try { await Store.api(`/api/admin/inventory/${form.dataset.stock}`, { method: 'PATCH', body: JSON.stringify({ stock: Number(form.querySelector('input').value) }) }); Store.notice('Stock updated.', 'success'); }
      catch (error) { Store.notice(error.message, 'error'); }
    }));
  }

  async function orders(target) {
    const data = await Store.api('/api/admin/orders');
    target.innerHTML = `<div class="admin-panel"><p class="eyebrow">FULFILMENT</p><h2>Orders</h2>${table(['Order', 'Customer', 'Email', 'Total', 'Payment', 'Status', 'Update'], data.orders.map((o) => [(`#${o.id}`), o.recipient_name, o.email, Store.money(o.total), o.payment_status, badge(o.status), html(`<select class="status-select" data-status="${o.id}" aria-label="Order status">${['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>`)]))}</div>`;
    target.querySelectorAll('[data-status]').forEach((select) => select.addEventListener('change', async () => {
      try { await Store.api(`/api/admin/orders/${select.dataset.status}`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) }); Store.notice('Order status updated.', 'success'); }
      catch (error) { Store.notice(error.message, 'error'); }
    }));
  }

  async function customers(target) {
    const data = await Store.api('/api/admin/customers');
    target.innerHTML = `<div class="admin-panel"><p class="eyebrow">COMMUNITY</p><h2>Customers</h2>${table(['Name', 'Email', 'Joined', 'Orders', 'Lifetime value'], data.customers.map((c) => [c.name, c.email, date(c.created_at), c.order_count, Store.money(c.lifetime_value)]))}</div>`;
  }
  async function payments(target) {
    const data = await Store.api('/api/admin/payments');
    target.innerHTML = `<div class="admin-panel"><p class="eyebrow">CASH ON DELIVERY</p><h2>Payments</h2>${table(['Order', 'Customer', 'Email', 'Amount', 'Method', 'Payment status', 'Order status'], data.payments.map((p) => [(`#${p.id}`), p.recipient_name, p.email, Store.money(p.total), 'COD', p.payment_status, badge(p.status)]))}</div>`;
  }
  async function reports(target) {
    const data = await Store.api('/api/admin/reports');
    target.innerHTML = `<div class="admin-panel"><p class="eyebrow">PERFORMANCE</p><h2>Monthly sales</h2>${table(['Month', 'Orders', 'Revenue'], data.monthly.map((r) => [r.month, r.order_count, Store.money(r.revenue)]))}</div>
      <div class="admin-panel"><p class="eyebrow">TOP PERFORMERS</p><h2>Best sellers</h2>${table(['Product', 'Units sold', 'Revenue'], data.topProducts.map((p) => [p.name, p.units_sold, Store.money(p.revenue)]))}</div>`;
  }
});

function table(headers, rows) {
  if (!rows.length) return '<p class="empty-state">No records to show yet.</p>';
  return `<div class="table-scroll"><table><thead><tr>${headers.map((h) => `<th>${Store.escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${value && typeof value === 'object' ? value.markup : Store.escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function html(markup) { return { markup }; }
function badge(status) { const safeStatus = Store.escapeHtml(status); return html(`<span class="status-badge status-${safeStatus}">${safeStatus}</span>`); }
function date(value) { return new Date(value).toLocaleDateString(); }
