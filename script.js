'use strict';

// -------------------- Modal --------------------
const modal = document.querySelector('[data-modal]');
const modalCloseBtn = document.querySelector('[data-modal-close]');
const modalCloseOverlay = document.querySelector('[data-modal-overlay]');

const modalCloseFunc = function () {
  if (modal) modal.classList.add('closed');
};

if (modalCloseOverlay) {
  modalCloseOverlay.addEventListener('click', modalCloseFunc);
}
if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', modalCloseFunc);
}

// -------------------- Notification Toast --------------------
const notificationToast = document.querySelector('[data-toast]');
const toastCloseBtn = document.querySelector('[data-toast-close]');

if (toastCloseBtn) {
  toastCloseBtn.addEventListener('click', function () {
    if (notificationToast) notificationToast.classList.add('closed');
  });
}

// -------------------- Mobile Menu --------------------
const mobileMenuOpenBtn = document.querySelectorAll('[data-mobile-menu-open-btn]');
const mobileMenu = document.querySelectorAll('[data-mobile-menu]');
const mobileMenuCloseBtn = document.querySelectorAll('[data-mobile-menu-close-btn]');
const overlay = document.querySelector('[data-overlay]');

for (let i = 0; i < mobileMenuOpenBtn.length; i++) {
  const mobileMenuCloseFunc = function () {
    mobileMenu[i].classList.remove('active');
    overlay.classList.remove('active');
  };

  mobileMenuOpenBtn[i].addEventListener('click', function () {
    mobileMenu[i].classList.add('active');
    overlay.classList.add('active');
  });

  mobileMenuCloseBtn[i].addEventListener('click', mobileMenuCloseFunc);
  overlay.addEventListener('click', mobileMenuCloseFunc);
}

// -------------------- Wishlist Logic --------------------
document.addEventListener('DOMContentLoaded', async function () {
  // --- helpers & elements ---
  const heartCountSpan = document.querySelector('.header-heart-btn .count');
  const searchField = document.querySelector('.search-field');
  const searchBtn = document.querySelector('.search-btn');
  const allProducts = Array.from(document.querySelectorAll('.showcase'));

  function getTitleElem(showcase) {
    // Try several selectors to be robust across different markup patterns
    return showcase.querySelector('.showcase-title, h3 a, h3 .showcase-title, h3, h4, .showcase-category, .showcase-desc');
  }

  function getProductNameFromShowcase(showcase) {
    const el = getTitleElem(showcase);
    return el ? el.textContent.trim() : null;
  }

  // --- wishlist persistence (server-backed with localStorage fallback) ---
  let wishlist = [];
  const API_BASE = '/api';

  async function loadWishlist() {
    // Try server first
    try {
      const res = await fetch(`${API_BASE}/wishlist`, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          wishlist = data;
          return;
        }
      }
    } catch (e) {
      // server not available, fallback to localStorage
    }

    // Fallback to localStorage
    try {
      const raw = localStorage.getItem('maximo_wishlist');
      if (raw) wishlist = JSON.parse(raw) || [];
    } catch (e) {
      wishlist = [];
    }
  }

  async function saveWishlist() {
    // Try to sync to server; if server fails, persist locally
    try {
      // Best-effort: replace server wishlist with local state by posting each item
      const res = await fetch(`${API_BASE}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '__sync_replace__' })
      });
      // Server may ignore the special sync; ignore response
    } catch (e) {
      // ignore server issues
    }

    try {
      localStorage.setItem('maximo_wishlist', JSON.stringify(wishlist));
    } catch (e) {
      // ignore quota errors
    }
  }

  function updateWishlistCount() {
    if (heartCountSpan) heartCountSpan.textContent = wishlist.length;
  }

  function addToWishlist(productName) {
    if (!productName) return;
    if (!wishlist.includes(productName)) {
      wishlist.push(productName);
      // try to add on server
      try {
        fetch(`${API_BASE}/wishlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: productName })
        }).catch(() => {});
      } catch (e) {}
      saveWishlist();
    }
  }

  function removeFromWishlist(productName) {
    if (!productName) return;
    wishlist = wishlist.filter(item => item !== productName);
    // try to remove on server
    try {
      fetch(`${API_BASE}/wishlist?name=${encodeURIComponent(productName)}`, {
        method: 'DELETE'
      }).catch(() => {});
    } catch (e) {}
    saveWishlist();
  }

  // --- search/filter ---
  function filterProducts(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!searchField) return;
    const query = searchField.value.trim().toLowerCase();
    // recompute product list in case DOM changed
    const products = Array.from(document.querySelectorAll('.showcase'));
    let anyVisible = false;
    products.forEach(product => {
      const titleElem = getTitleElem(product);
      const titleText = titleElem ? (titleElem.textContent || '').trim().toLowerCase() : '';
      const categoryText = (product.querySelector('.showcase-category') || { textContent: '' }).textContent.trim().toLowerCase();
      const descText = (product.querySelector('.showcase-desc') || { textContent: '' }).textContent.trim().toLowerCase();
      const hay = (titleText + ' ' + categoryText + ' ' + descText).trim();
      const match = (query === '') || (hay.indexOf(query) !== -1);
      product.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });
    // optional: if no results, you could show a message — not implemented here
  }

  if (searchBtn && searchField) {
    searchBtn.addEventListener('click', function (e) { filterProducts(e); });
    searchField.addEventListener('keydown', function (e) { if (e.key === 'Enter') { filterProducts(e); } });
  }

  // --- sync UI from wishlist ---
  function syncProductButtons() {
    const productHeartBtns = Array.from(document.querySelectorAll('.product-heart-btn'));
    productHeartBtns.forEach(btn => {
      const showcase = btn.closest('.showcase');
      const productName = showcase ? getProductNameFromShowcase(showcase) : null;
      const icon = btn.querySelector('ion-icon');
      if (productName && wishlist.includes(productName)) {
        btn.classList.add('active');
        if (icon) icon.setAttribute('name', 'heart');
      } else {
        btn.classList.remove('active');
        if (icon) icon.setAttribute('name', 'heart-outline');
      }
    });
  }

  // --- bind product heart buttons ---
  function bindProductHeartButtons() {
    const productHeartBtns = Array.from(document.querySelectorAll('.product-heart-btn'));
    productHeartBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const showcase = btn.closest('.showcase');
        if (!showcase) return;
        const productName = getProductNameFromShowcase(showcase);
        if (!productName) {
          console.log('Product title not found');
          return;
        }
        const icon = btn.querySelector('ion-icon');
        if (wishlist.includes(productName)) {
          removeFromWishlist(productName);
          btn.classList.remove('active');
          if (icon) icon.setAttribute('name', 'heart-outline');
        } else {
          addToWishlist(productName);
          btn.classList.add('active');
          if (icon) icon.setAttribute('name', 'heart');
        }
        updateWishlistCount();
      });
    });
  }

  // Initialize
  await loadWishlist();
  updateWishlistCount();
  syncProductButtons();
  bindProductHeartButtons();

  // -------------------- Cart Logic --------------------
  const bagCountSpan = document.querySelector('.header-bag-btn .count');
  let cart = [];

  async function loadCart() {
    try {
      const res = await fetch(`${API_BASE}/cart`, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          cart = data;
          return;
        }
      }
    } catch (e) {
      // fallback to localStorage
    }

    try {
      const raw = localStorage.getItem('maximo_cart');
      if (raw) cart = JSON.parse(raw) || [];
    } catch (e) {
      cart = [];
    }
  }

  async function saveCart() {
    try {
      // best-effort server sync
      await fetch(`${API_BASE}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart })
      }).catch(() => {});
    } catch (e) {}

    try {
      localStorage.setItem('maximo_cart', JSON.stringify(cart));
    } catch (e) {}
  }

  function updateCartCount() {
    if (bagCountSpan) bagCountSpan.textContent = cart.length;
  }

  function addToCart(productName) {
    if (!productName) return;
    cart.push(productName);
    // fire-and-forget to server
    try {
      fetch(`${API_BASE}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [productName] })
      }).catch(() => {});
    } catch (e) {}
    saveCart();
    updateCartCount();
  }

  // bind product cart buttons
  function bindProductCartButtons() {
    const cartBtns = Array.from(document.querySelectorAll('.product-cart-btn'));
    cartBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const showcase = btn.closest('.showcase');
        if (!showcase) return;
        const productName = getProductNameFromShowcase(showcase);
        if (!productName) return;
        addToCart(productName);
        // optional visual feedback: temporarily add 'added' class
        btn.classList.add('added');
        setTimeout(() => btn.classList.remove('added'), 800);
      });
    });
    // also bind featured/deal 'add to cart' buttons
    const addCartBtns = Array.from(document.querySelectorAll('.add-cart-btn'));
    addCartBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const showcase = btn.closest('.showcase');
        if (!showcase) return;
        const productName = getProductNameFromShowcase(showcase);
        if (!productName) return;
        addToCart(productName);
        btn.classList.add('added');
        setTimeout(() => btn.classList.remove('added'), 800);
      });
    });
  }

  // initialize cart
  await loadCart();
  updateCartCount();
  bindProductCartButtons();

  // -------------------- Cart modal UI --------------------
  // create modal element
  const cartModal = document.createElement('div');
  cartModal.id = 'cart-modal';
  cartModal.style.cssText = 'position:fixed;right:20px;top:70px;width:360px;max-height:70vh;overflow:auto;background:#fff;color:#111;border:1px solid #ddd;box-shadow:0 6px 24px rgba(0,0,0,0.15);padding:12px;border-radius:8px;z-index:9999;display:none;font-family:inherit;';
  cartModal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h3 style="margin:0;font-size:16px">Cart (<span class="cart-count">0</span>)</h3>
      <button id="cart-modal-close" style="background:transparent;border:0;font-size:18px;cursor:pointer">✕</button>
    </div>
    <ul class="cart-items" style="list-style:none;padding:0;margin:0 0 12px 0;"></ul>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <button id="checkout-btn" style="background:#111;color:#fff;border:0;padding:8px 12px;border-radius:6px;cursor:pointer">Checkout</button>
      <button id="cart-clear-btn" style="background:transparent;border:1px solid #ccc;padding:6px 10px;border-radius:6px;cursor:pointer">Clear</button>
    </div>
  `;
  document.body.appendChild(cartModal);

  const cartItemsList = cartModal.querySelector('.cart-items');
  const cartCountSpan = cartModal.querySelector('.cart-count');
  const cartCloseBtn = cartModal.querySelector('#cart-modal-close');
  const checkoutBtn = cartModal.querySelector('#checkout-btn');
  const cartClearBtn = cartModal.querySelector('#cart-clear-btn');

  function renderCartModal() {
    cartItemsList.innerHTML = '';
    if (!Array.isArray(cart) || cart.length === 0) {
      const li = document.createElement('li');
      li.style.padding = '8px 0';
      li.textContent = 'Your cart is empty.';
      cartItemsList.appendChild(li);
    } else {
      cart.forEach((name, idx) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '8px 0';
        li.dataset.name = name;

        const link = document.createElement('a');
        link.href = '#';
        link.textContent = name;
        link.style.color = '#111';
        link.style.textDecoration = 'none';
        link.style.flex = '1';
        link.addEventListener('click', function (e) {
          e.preventDefault();
          // jump to product or show details — currently just close modal
          closeCartModal();
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.marginLeft = '8px';
        removeBtn.style.background = 'transparent';
        removeBtn.style.border = '1px solid #ccc';
        removeBtn.style.padding = '6px 8px';
        removeBtn.style.borderRadius = '6px';
        removeBtn.style.cursor = 'pointer';
        removeBtn.addEventListener('click', function () {
          removeFromCart(name);
        });

        li.appendChild(link);
        li.appendChild(removeBtn);
        cartItemsList.appendChild(li);
      });
    }
    cartCountSpan.textContent = cart.length;
    updateCartCount();
  }

  function openCartModal() {
    renderCartModal();
    cartModal.style.display = 'block';
  }

  function closeCartModal() {
    cartModal.style.display = 'none';
  }

  cartCloseBtn.addEventListener('click', closeCartModal);
  checkoutBtn.addEventListener('click', function () {
    // placeholder: implement checkout flow later
    alert('Checkout is not implemented in this demo.');
  });

  cartClearBtn.addEventListener('click', function () {
    // clear cart locally and on server
    cart = [];
    try {
      fetch(`${API_BASE}/cart`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}
    saveCart();
    renderCartModal();
  });

  // toggle modal when header bag button clicked
  const headerBagBtn = document.querySelector('.header-bag-btn');
  if (headerBagBtn) {
    headerBagBtn.addEventListener('click', function () {
      if (cartModal.style.display === 'block') closeCartModal(); else openCartModal();
    });
  }

  // remove one occurrence of an item from cart
  function removeFromCart(productName) {
    if (!productName) return;
    const idx = cart.indexOf(productName);
    if (idx === -1) return;
    cart.splice(idx, 1);
    // sync to server
    try {
      fetch(`${API_BASE}/cart?name=${encodeURIComponent(productName)}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}
    saveCart();
    renderCartModal();
  }

  // -------------------- Wishlist modal UI --------------------
  const wishModal = document.createElement('div');
  wishModal.id = 'wishlist-modal';
  wishModal.style.cssText = 'position:fixed;right:400px;top:70px;width:360px;max-height:70vh;overflow:auto;background:#fff;color:#111;border:1px solid #ddd;box-shadow:0 6px 24px rgba(0,0,0,0.12);padding:12px;border-radius:8px;z-index:9999;display:none;font-family:inherit;';
  wishModal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h3 style="margin:0;font-size:16px">Wishlist (<span class="wish-count">0</span>)</h3>
      <button id="wish-modal-close" style="background:transparent;border:0;font-size:18px;cursor:pointer">✕</button>
    </div>
    <ul class="wish-items" style="list-style:none;padding:0;margin:0 0 12px 0;"></ul>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <button id="wish-clear-btn" style="background:transparent;border:1px solid #ccc;padding:6px 10px;border-radius:6px;cursor:pointer">Clear</button>
    </div>
  `;
  document.body.appendChild(wishModal);

  const wishItemsList = wishModal.querySelector('.wish-items');
  const wishCountSpan = wishModal.querySelector('.wish-count');
  const wishCloseBtn = wishModal.querySelector('#wish-modal-close');
  const wishClearBtn = wishModal.querySelector('#wish-clear-btn');

  function renderWishModal() {
    wishItemsList.innerHTML = '';
    if (!Array.isArray(wishlist) || wishlist.length === 0) {
      const li = document.createElement('li');
      li.style.padding = '8px 0';
      li.textContent = 'Your wishlist is empty.';
      wishItemsList.appendChild(li);
    } else {
      wishlist.forEach((name) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '8px 0';
        li.dataset.name = name;

        const link = document.createElement('a');
        link.href = '#';
        link.textContent = name;
        link.style.color = '#111';
        link.style.textDecoration = 'none';
        link.style.flex = '1';
        link.addEventListener('click', function (e) {
          e.preventDefault();
          // close modal for now
          closeWishModal();
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.marginLeft = '8px';
        removeBtn.style.background = 'transparent';
        removeBtn.style.border = '1px solid #ccc';
        removeBtn.style.padding = '6px 8px';
        removeBtn.style.borderRadius = '6px';
        removeBtn.style.cursor = 'pointer';
        removeBtn.addEventListener('click', function () {
          removeFromWishlist(name);
          renderWishModal();
          updateWishlistCount();
          syncProductButtons();
        });

        li.appendChild(link);
        li.appendChild(removeBtn);
        wishItemsList.appendChild(li);
      });
    }
    wishCountSpan.textContent = wishlist.length;
    updateWishlistCount();
  }

  function openWishModal() {
    renderWishModal();
    wishModal.style.display = 'block';
  }

  function closeWishModal() {
    wishModal.style.display = 'none';
  }

  wishCloseBtn.addEventListener('click', closeWishModal);
  wishClearBtn.addEventListener('click', function () {
    wishlist = [];
    try {
      fetch(`${API_BASE}/wishlist`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}
    saveWishlist();
    renderWishModal();
    syncProductButtons();
  });

  const headerHeartBtn = document.querySelector('.header-heart-btn');
  if (headerHeartBtn) {
    headerHeartBtn.addEventListener('click', function () {
      if (wishModal.style.display === 'block') closeWishModal(); else openWishModal();
    });
  }

  // -------------------- Language switcher --------------------
  const langSelect = document.querySelector('select[name="language"]');
  const LANG_KEY = 'maximo_lang';
  const translations = {
    en: {
      searchPlaceholder: 'Enter your product name...',
      freeShippingText: '<b>Free Shipping</b> This Week Order Over - ₹55',
      addToCartText: 'add to cart',
      cartEmptyText: 'Your cart is empty.',
      wishlistEmptyText: 'Your wishlist is empty.',
      checkoutText: 'Checkout',
      clearText: 'Clear',
      cartTitle: 'Cart',
      wishlistTitle: 'Wishlist',
      cartAria: 'Cart',
      wishlistAria: 'Wishlist'
    },
    hi: {
      searchPlaceholder: 'अपने उत्पाद का नाम दर्ज करें...',
      freeShippingText: '<b>फ्री शिपिंग</b> इस सप्ताह के ऑर्डर पर - ₹55',
      addToCartText: 'कार्ट में जोड़ें',
      cartEmptyText: 'आपकी कार्ट खाली है।',
      wishlistEmptyText: 'आपकी विशलिस्ट खाली है।',
      checkoutText: 'चेकआउट',
      clearText: 'साफ़ करें',
      cartTitle: 'कार्ट',
      wishlistTitle: 'विशलिस्ट',
      cartAria: 'कार्ट',
      wishlistAria: 'विशलिस्ट'
    }
  };

  function applyLanguage(lang) {
    // normalize to short codes used in translations
    if (!lang) lang = 'en';
    lang = ('' + lang).toLowerCase();
    if (lang.indexOf('en') === 0) lang = 'en';
    else if (lang.indexOf('hi') === 0) lang = 'hi';
    if (!translations[lang]) lang = 'en';
    // set html lang
    try { document.documentElement.lang = lang; } catch (e) {}
    // persist
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}

    const t = translations[lang];
    // search placeholder
    if (searchField) searchField.placeholder = t.searchPlaceholder;
    // header alert
    const headerAlert = document.querySelector('.header-alert-news p');
    if (headerAlert) headerAlert.innerHTML = t.freeShippingText;
    // add-cart buttons
    const addCartBtnsNow = document.querySelectorAll('.add-cart-btn');
    addCartBtnsNow.forEach(b => { b.textContent = t.addToCartText; });
    // cart modal texts
    if (cartModal) {
      const title = cartModal.querySelector('h3');
      if (title) title.childNodes[0].nodeValue = '';
      const countSpan = cartModal.querySelector('.cart-count');
      if (countSpan) countSpan.textContent = cart.length;
      const checkout = cartModal.querySelector('#checkout-btn');
      if (checkout) checkout.textContent = t.checkoutText;
      const clearBtn = cartModal.querySelector('#cart-clear-btn');
      if (clearBtn) clearBtn.textContent = t.clearText;
      // set title text properly
      const h3 = cartModal.querySelector('h3');
      if (h3) h3.innerHTML = `${t.cartTitle} (<span class="cart-count">${cart.length}</span>)`;
    }
    // wishlist modal texts
    if (wishModal) {
      const h3 = wishModal.querySelector('h3');
      if (h3) h3.innerHTML = `${t.wishlistTitle} (<span class="wish-count">${wishlist.length}</span>)`;
      const clearWish = wishModal.querySelector('#wish-clear-btn');
      if (clearWish) clearWish.textContent = t.clearText;
    }
    // header aria labels
    if (headerBagBtn) headerBagBtn.setAttribute('aria-label', t.cartAria);
    if (headerHeartBtn) headerHeartBtn.setAttribute('aria-label', t.wishlistAria);
    // Translate common static UI strings across header/main/footer
    translateStaticUI(lang);
  }

  // static mapping for common UI strings (source text -> translations)
  const STATIC_I18N = [
    ['Home', 'होम'],
    ['Categories', 'श्रेणियाँ'],
    ["Men's", 'पुरुष'],
    ["Women's", 'महिला'],
    ['Jewelry', 'आभूषण'],
    ['Perfume', 'परफ्यूम'],
    ['Blog', 'ब्लॉग'],
    ['Hot Offers', 'हॉट ऑफ़र'],
    ['Show all', 'सभी दिखाएँ'],
    ['Shop now', 'अभी खरीदें'],
    ['Our Services', 'हमारी सेवाएँ'],
    ['testimonial', 'प्रशंसापत्र'],
    ['New Products', 'नए उत्पाद'],
    ['New Arrivals', 'नए आगमन'],
    ['Trending', 'प्रचलन में'],
    ['Top Rated', 'सर्वोच्च रेटेड'],
    ['Deal of the day', 'दिन का सौदा'],
    ['best sellers', 'बेस्ट सेलर्स'],
    ['Read more', 'और पढ़ें'],
    ['Contact us', 'संपर्क करें'],
    ['Clear', 'साफ़ करें'],
    ['Checkout', 'चेकआउट']
  ];

  function translateStaticUI(lang) {
    const rootSelectors = ['header', 'main', 'footer'];
    const toLang = (lang === 'hi') ? 1 : 0;
    rootSelectors.forEach(sel => {
      const root = document.querySelector(sel);
      if (!root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        let text = node.nodeValue;
        if (!text || !text.trim()) return;
        STATIC_I18N.forEach(pair => {
          const src = pair[0];
          const dst = pair[toLang];
          // replace whole occurrences; do a simple case-sensitive replace
          if (text.indexOf(src) !== -1) {
            text = text.split(src).join(dst);
          }
          // also handle lowercase source
          const lowerSrc = src.toLowerCase();
          if (text.toLowerCase().indexOf(lowerSrc) !== -1) {
            // replace preserving case roughly by replacing lowercase
            text = text.split(src.toLowerCase()).join(dst);
          }
        });
        node.nodeValue = text;
      });
    });
  }

  // helpers to map select option values to short codes and back
  function normalizeLangValue(val) {
    if (!val) return 'en';
    val = ('' + val).toLowerCase();
    if (val.indexOf('hi') === 0) return 'hi';
    return 'en';
  }

  function selectValueForLang(short) {
    if ((short || '').toLowerCase() === 'hi') return 'hi-IN';
    return 'en-US';
  }

  // initialize language from storage or select value
  (function initLang() {
    let lang = 'en';
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored) lang = normalizeLangValue(stored);
      else if (langSelect) lang = normalizeLangValue(langSelect.value);
    } catch (e) {}
    if (langSelect) try { langSelect.value = selectValueForLang(lang); } catch (e) {}
    applyLanguage(lang);
  })();

  if (langSelect) {
    langSelect.addEventListener('change', function (e) {
      const short = normalizeLangValue(e.target.value);
      applyLanguage(short);
    });
  }
});

// -------------------- Accordion --------------------
const accordionBtn = document.querySelectorAll('[data-accordion-btn]');
const accordion = document.querySelectorAll('[data-accordion]');

for (let i = 0; i < accordionBtn.length; i++) {
  accordionBtn[i].addEventListener('click', function () {
    const clickedBtn = this.nextElementSibling.classList.contains('active');

    for (let i = 0; i < accordion.length; i++) {
      if (clickedBtn) break;

      if (accordion[i].classList.contains('active')) {
        accordion[i].classList.remove('active');
        accordionBtn[i].classList.remove('active');
      }
    }

    this.nextElementSibling.classList.toggle('active');
    this.classList.toggle('active');
  });
}
