# ScentCrown

A responsive fragrance and accessories shop with a MySQL-backed Express API, customer accounts, saved carts, cash-on-delivery ordering, and an administrator dashboard.

## Requirements

- Node.js 20 or newer
- MySQL 8 or a compatible MySQL server (XAMPP MySQL is supported)

## Setup

1. Start MySQL and create the schema/seed catalogue:

   ```powershell
   C:\xampp\mysql\bin\mysql.exe -u root -p < database\schema.sql
   ```

   Omit `-p` if the local MySQL root account has no password.

2. Copy `.env.example` to `.env` and set the database connection and a unique `SESSION_SECRET` (at least 32 characters). The defaults match a local XAMPP installation with a passwordless `root` account.

3. Install dependencies if needed and start the server:

   ```powershell
   npm install
   npm start
   ```

   Visit <http://localhost:3000>.

4. To provision an administrator, set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12–72 characters), and optionally `ADMIN_NAME` in `.env`, then run:

   ```powershell
   npm run admin:create
   ```

   This command creates or resets the matching account as an administrator. Do not set these values on a shared or production environment unless you intend to run the command there.

## Included flows

- Customer registration, sign-in, profile name updates, and sign-out
- Perfume/accessory catalogue, product detail pages, stock-aware cart, and order history
- Transactional cash-on-delivery checkout with inventory decrement
- Admin product/archive controls, stock updates, order status changes, customer/payment lists, and sales reports

Online card payments are not integrated; orders use cash on delivery. Session storage uses Express's in-memory store for local development. Before production, configure a persistent session store, HTTPS, backups, and suitable operational monitoring.

## API

- `/api/auth` — registration, sign-in, current user, profile, sign-out
- `/api/products` — active catalogue and product details
- `/api/cart` — signed-in customer's cart
- `/api/orders` — signed-in customer's checkout and order history
- `/api/admin` — administrator-only management and reporting
