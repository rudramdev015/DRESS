# Trade World — Custom T-Shirt Printing, Jodhpur

A modern T-shirt store where every order goes straight to your **WhatsApp**.
There is no payment gateway and no database to install. Products and settings are saved in the `data/` folder.

## Run it

```bash
npm install        # first time only
cp .env.example .env   # then edit .env and set your own password
npm run dev        # development → http://localhost:5050
```

For a live/production server:

```bash
npm run build
npm start          # serves the built site → http://localhost:5050
```

## Admin panel

Open **http://localhost:5050/admin**

| | |
|---|---|
| ID | `ADMIN_ID` in your `.env` file |
| Password | `ADMIN_PASSWORD` in your `.env` file |

Change both in the `.env` file, then restart the server.

From the admin panel you can:
- add, edit and delete tees (photos, price, MRP, colours, sizes, badge, featured, in stock)
- set your **WhatsApp number** in **Settings** (do this first, or orders can't reach you)
- change the phone, email, address, Instagram link and top announcement bar

## How customers order

1. **Buy on WhatsApp** on a product page opens WhatsApp with the product, colour, size, qty and price already typed.
2. **Bag → Send order on WhatsApp** sends the whole cart, with the total and the customer's name and address.
3. **Custom Print** page: a form for custom or bulk printing that sends every detail to WhatsApp. The customer then attaches the design file in the chat.

## Folders

```
server/        Express API (products, settings, admin login, image upload)
src/           React frontend (pages, components, styles.css)
public/logo.jpg  Trade World logo
data/          products.json + settings.json (created on first run)
uploads/       product photos uploaded from admin
```

Back up `data/` and `uploads/` — they contain your products.
