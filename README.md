# PedalPeak Bicycle Shop (Starter)

A responsive online bicycle shop starter built with plain HTML, CSS, and JavaScript.

## Run locally

From this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Features

- Hero landing section and brand navigation
- Bicycle catalog with search, category filter, and price slider
- Accessories section
- Cart drawer with quantity controls and localStorage persistence
- Checkout form with simple validation
- Mobile responsive layout

## Customize

- Product data: `app.js` (`bikes` and `accessories` arrays)
- Colors and visual style: `styles.css` (`:root` CSS variables)
- Business details, text, and sections: `index.html`

## Notes

This is a frontend starter. For a production shop, add:

- Backend APIs (orders, products, inventory)
- Payment gateway integration
- Authentication and admin dashboard
- Server-side validation and security controls
