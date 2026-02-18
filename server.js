const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// simple in-memory wishlist (development only)
let wishlist = [];
// simple in-memory cart (development only)
let cart = [];

// Serve static site
app.use(express.static(path.join(__dirname)));

// API: get wishlist
app.get('/api/wishlist', (req, res) => {
  return res.json(wishlist);
});

// API: add to wishlist
app.post('/api/wishlist', (req, res) => {
  const name = req.body && req.body.name;
  if (!name) return res.status(400).json({ error: 'name required' });

  // special marker to replace wishlist (not used but accepted)
  if (name === '__sync_replace__') return res.json({ ok: true });

  if (!wishlist.includes(name)) wishlist.push(name);
  return res.json({ ok: true, wishlist });
});

// API: remove from wishlist
app.delete('/api/wishlist', (req, res) => {
  const name = req.query && req.query.name;
  if (!name) return res.status(400).json({ error: 'name query required' });
  wishlist = wishlist.filter(item => item !== name);
  return res.json({ ok: true, wishlist });
});

// API: get cart
app.get('/api/cart', (req, res) => {
  return res.json(cart);
});

// API: add to cart (accepts { items: [name,...] } or { items: [] } to replace)
app.post('/api/cart', (req, res) => {
  const items = req.body && req.body.items;
  if (!items) return res.status(400).json({ error: 'items required' });
  if (Array.isArray(items) && items.length === 1) {
    // append single item
    cart.push(items[0]);
  } else if (Array.isArray(items)) {
    // replace cart with provided array
    cart = items.slice();
  }
  return res.json({ ok: true, cart });
});

// API: clear or remove item from cart
app.delete('/api/cart', (req, res) => {
  const name = req.query && req.query.name;
  if (!name) {
    // clear cart
    cart = [];
    return res.json({ ok: true, cart });
  }
  cart = cart.filter(item => item !== name);
  return res.json({ ok: true, cart });
});

app.listen(port, () => {
  console.log(`Maximo Shop dev server running at http://localhost:${port}`);
});
