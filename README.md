# Trade World — Custom T-Shirt Printing, Jodhpur

A modern T-shirt store where every order goes straight to your **WhatsApp**.
We print on **black and white tees only**. The store, admin panel and server all enforce this.
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

From the admin panel you can (open `/admin?tab=home` to jump straight to the home page editor):
- **Home page**: change every photo and text on the home page: hero (photo or 3D tee), numbers, moving banner, the 4 style tiles, the **lookbook gallery**, the bulk-orders block and the FAQ. Photos are shrunk in the browser before upload.
- add, edit and delete tees (photos, price, MRP, colours, sizes, badge, featured, in stock)
- change the **WhatsApp number** in **Settings** (orders go to **+91 93584 24592** by default)
- change the phone, email, address, Instagram link and top announcement bar

## 3D hanger rack (home page)

Your printed tees hang on a 3D clothes rail. Customers swipe through them, tap one to open it, or buy on WhatsApp.

To put a printed tee on the rack:
1. Admin → **Add product**.
2. Upload a **straight front photo** of the tee (laid flat on a plain background looks best).
3. Keep **Hang on 3D rack** ticked, then save. It appears on the rack straight away.

Untick **Hang on 3D rack** to take a tee off the rack (it stays in the shop). Sold-out tees are hidden from the rack.

## How customers order

1. **Buy on WhatsApp** on a product page opens WhatsApp with the product, colour, size, qty and price already typed.
2. **Bag → Send order on WhatsApp** sends the whole cart, with the total and the customer's name and address.
3. **Custom Print** page: a form for custom or bulk printing that sends every detail to WhatsApp. The customer then attaches the design file in the chat.

## Folders

```
server/        BACKEND: Express API (products, settings, admin login, photo/video upload)
               index.js = the server, seed.js = starter products
src/           React frontend (pages, components, styles.css)
public/logo.jpg  Trade World logo
data/          products.json + settings.json (created on first run)
uploads/       product photos uploaded from admin
```

Back up `data/` and `uploads/` — they contain your products.

## Speed

- Only the home page loads first; other pages and the 3D engine download when needed.
- Server compresses responses (gzip) and caches data in memory.
- Built files are cached by browsers for a year; product data for 15 seconds.
- The 3D tee uses lighter settings on phones and pauses when off-screen.

## Put it online (Vercel)

The project is ready for Vercel (`vercel.json` + `api/index.js`).

1. vercel.com → **Add New → Project** → import the `DRESS` GitHub repo → **Deploy**.
2. **Settings → Environment Variables**: add `ADMIN_PASSWORD` (your admin password). Optional: `ADMIN_ID`, `WHATSAPP_NUMBER`, `JWT_SECRET`.
3. **Storage → Create → Blob** → connect it to the project, then **Redeploy**. Vercel can't keep files on its servers, so products, settings and photos are saved in Blob. Until Blob is connected the shop works with the default products and admin saving is switched off (with a clear message).

Uploads on Vercel are limited to about 4.5 MB per request. Photos are compressed automatically; for reels, paste Instagram links or keep videos small.

## Put it online (Render)

1. Create a free account on https://render.com and connect your GitHub.
2. Click **New → Blueprint**, pick the `DRESS` repo. Render reads `render.yaml`.
3. Enter your `ADMIN_PASSWORD` and `WHATSAPP_NUMBER` when asked, then deploy.
4. Your site gets a link like `https://trade-world.onrender.com`. You can connect your own domain in Render settings.

The blueprint uses a small paid plan with a disk, so your products, photos and videos are kept safe between updates.
