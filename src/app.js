import { demoCategories, demoProducts, demoCoupons } from "./demo-catalog.js";

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const money = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));
const esc = (v = "") => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/'/g, "&#39;");
const iconPaths = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/>',
  leaf: '<path d="M20 4c-8 0-14 4-14 11a5 5 0 0 0 5 5c7 0 9-8 9-16Z"/><path d="M4 21c2-6 6-9 12-12"/>',
  return: '<path d="M4 7h11a5 5 0 0 1 0 10H7"/><path d="m8 4-4 3 4 3"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  filter: '<path d="M4 7h16M7 12h10m-7 5h4"/><circle cx="8" cy="7" r="1.5"/><circle cx="15" cy="12" r="1.5"/>',
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/>',
  box: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.arrow}</svg>`;
const image = (url, alt, extra = "") => `<img ${extra} src="${esc(url || "")}" alt="${esc(alt)}" onerror="this.classList.add('broken');this.parentElement.classList.add('image-fallback')">`;

const state = {
  products: demoProducts,
  categories: demoCategories,
  view: "home", category: "all", query: "", wishlist: readStore("lyvor-wishlist", []), cart: readStore("lyvor-cart", []), orders: readStore("lyvor-demo-orders", []),
  sort: "featured", filters: { sale: false, inStock: false }, filtersOpen: false, drawer: "", modal: "", productId: "", selectedSize: "", selectedColor: "", authMode: "login", authError: "", authNotice: "", user: null, profile: null,
  client: null, backend: false, loading: false, adminTab: "overview", admin: { orders: [], customers: [], coupons: [], settings: null, content: null }, siteContent: {}, mobileMenu: false,
  checkoutData: {}, coupon: null, couponFeedback: "", couponLoading: false, orderResult: null, editingId: null, settings: { free_shipping_threshold: 3000, shipping_fee: 99 }, adminProducts: [], ordersLoaded: false
};

function readStore(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } }
function saveStore() { localStorage.setItem("lyvor-cart", JSON.stringify(state.cart)); localStorage.setItem("lyvor-wishlist", JSON.stringify(state.wishlist)); localStorage.setItem("lyvor-demo-orders", JSON.stringify(state.orders)); }
function getProduct(id) { return state.products.find((p) => p.id === id) || (state.view === "admin" ? state.adminProducts.find((p) => p.id === id) : undefined); }
function productVariants(p) { return p?.variants?.length ? p.variants : [{ id: "v-default", size: "One size", color: "Natural", colorHex: "#c5ae8a", stock: 5 }]; }
function productColors(p) { const out = new Map(); productVariants(p).forEach((v) => { const k = v.color || "Natural"; if (!out.has(k)) out.set(k, v.colorHex || "#c5ae8a"); }); return [...out].map(([name, hex]) => ({ name, hex })); }
function productSizes(p, color = "") { return [...new Set(productVariants(p).filter((v) => !color || v.color === color).map((v) => v.size))]; }
function findVariant(p, size, color) { return productVariants(p).find((v) => v.size === size && v.color === color && Number(v.stock ?? 0) > 0); }
function availableStock(p, size, color) { return Number(findVariant(p, size, color)?.stock || 0); }
function activeCart() { return state.cart.map((line) => ({ ...line, product: getProduct(line.productId) })).filter((line) => line.product); }
function cartCount() { return state.cart.reduce((n, line) => n + Number(line.quantity || 0), 0); }
function subtotal() { return activeCart().reduce((n, line) => n + Number(line.product.price) * line.quantity, 0); }
function shipping() { return subtotal() >= Number(state.settings.free_shipping_threshold || 3000) ? 0 : Number(state.settings.shipping_fee ?? 99); }
function discount() { return Number(state.coupon?.discount_amount || 0); }
function total() { return Math.max(0, subtotal() - discount() + shipping()); }
function categoryBySlug(slug) { return state.categories.find((c) => c.slug === slug); }

function navigate(view, category = "all", query = "") {
  state.view = view; state.category = category; state.query = query; state.drawer = ""; state.filtersOpen = false;
  const hash = view === "category" ? `#category/${encodeURIComponent(category)}` : view === "search" ? `#search/${encodeURIComponent(query)}` : `#${view}`;
  history.replaceState(null, "", hash); render(); window.scrollTo({ top: 0, behavior: "smooth" });
}
function parseRoute() {
  const h = location.hash.slice(1) || "home";
  if (h.startsWith("category/")) { state.view = "category"; state.category = decodeURIComponent(h.slice(9)); }
  else if (h.startsWith("search/")) { state.view = "search"; state.query = decodeURIComponent(h.slice(7)); }
  else if (["home", "wishlist", "orders", "admin"].includes(h)) state.view = h;
  else { state.view = "home"; state.category = "all"; }
}

function navLinks(mobile = false) {
  const links = [
    ["New in", "category", "new-arrivals"], ["For her", "category", "women"], ["For him", "category", "men"], ["Essentials", "category", "essentials"], ["The Lyvor edit", "category", "all"]
  ];
  return links.map(([title, view, cat]) => `<a href="#category/${cat}" class="${state.view === view && state.category === cat ? "active" : ""}" data-action="category" data-category="${cat}">${title}</a>`).join("");
}

function header() {
  const announcement = state.siteContent.announcement || `A little room to be you · complimentary delivery on orders over ${money(state.settings.free_shipping_threshold || 3000)}`;
  return `<div class="announcement">${esc(announcement)}</div>
  <header class="header">
    <div class="header-side left"><button class="mobile-toggle" aria-label="Open menu" data-action="mobile-menu">${icon("menu")}</button><button class="header-action" data-action="search">${icon("search")}<span>Search</span></button></div>
    <a href="#home" class="brand" aria-label="Lyvor home" data-action="home">${image("./assets/lyvor-logo.jpeg", "Lyvor logo")}</a>
    <div class="header-side right"><button class="header-action account-action" data-action="account">${icon("user")}<span>${state.user ? esc(state.profile?.full_name || "Account") : "Account"}</span></button><button class="header-action" data-action="wishlist">${icon("heart")}<span>Saved</span><span class="action-wrap"><span class="count-dot">${state.wishlist.length}</span></span></button><button class="header-action" data-action="cart">${icon("bag")}<span>Bag</span><span class="action-wrap"><span class="count-dot">${cartCount()}</span></span></button></div>
  </header>
  <nav class="main-nav">${navLinks()}</nav><nav class="mobile-nav ${state.mobileMenu ? "open" : ""}">${navLinks(true)}<a href="#orders" data-action="orders">My orders</a></nav>`;
}

const tileData = [
  ["For her", "women", "https://images.unsplash.com/photo-1752825609278-f9696bc9d7bd?auto=format&fit=crop&w=900&q=80"],
  ["For him", "men", "https://images.unsplash.com/photo-1775306413232-fecd45367613?auto=format&fit=crop&w=900&q=80"],
  ["Essentials", "essentials", "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80"]
];

function trustStrip() {
  return `<div class="container"><div class="trust-strip"><div class="trust-item">${icon("truck")}Thoughtful delivery across India</div><div class="trust-item">${icon("return")}Easy 7-day returns</div><div class="trust-item">${icon("leaf")}Better fabrics, better feel</div><div class="trust-item">${icon("shield")}Cash on delivery available</div></div></div>`;
}
function hero() {
  const c = state.siteContent;
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow">${esc(c.hero_eyebrow || "The little things, considered")}</span><h1>${esc(c.hero_heading || "A softer kind of everyday.").replace(" of ", " of<br>")}</h1><p>${esc(c.hero_copy || "Clothes that feel like you, on your most ordinary and extraordinary days alike.")}</p><button class="button" data-action="category" data-category="all">Explore the collection ${icon("arrow")}</button></div><div class="hero-media">${image(c.hero_image || "https://images.unsplash.com/photo-1752825609278-f9696bc9d7bd?auto=format&fit=crop&w=1400&q=88", "Lyvor spring collection, relaxed tailoring", "fetchpriority=high") }<span class="hero-note">Easy pieces for everyday</span></div></section>`;
}

function productCard(p) {
  const liked = state.wishlist.includes(p.id);
  const colors = productColors(p);
  return `<article class="product-card"><div class="product-image" data-action="open-product" data-id="${esc(p.id)}">${image(p.image, p.name, "loading=lazy")}${p.label ? `<span class="badge ${p.compareAt ? "sale" : ""}">${esc(p.label)}</span>` : ""}<button class="heart-button ${liked ? "active" : ""}" aria-label="${liked ? "Remove from" : "Add to"} wishlist" data-action="toggle-wishlist" data-id="${esc(p.id)}">${icon("heart")}</button><button class="quick-add" data-action="open-product" data-id="${esc(p.id)}">View details</button></div><div class="product-info"><span class="product-category">${esc(p.category)}</span><div class="product-name-row"><span class="product-name">${esc(p.name)}</span><span class="product-price">${money(p.price)}${p.compareAt ? `<span class="compare-price">${money(p.compareAt)}</span>` : ""}</span></div><div class="swatches" aria-label="Available colours">${colors.slice(0, 4).map((c) => `<i class="swatch" title="${esc(c.name)}" style="background:${esc(c.hex)}"></i>`).join("")}</div></div></article>`;
}
function productGrid(items, limit = 12) {
  const list = items.slice(0, limit);
  return list.length ? `<div class="product-grid">${list.map(productCard).join("")}</div>` : `<div class="empty-state"><h3>Nothing in this edit just yet.</h3><p>Try another category or clear your filters.</p><button class="text-link" data-action="clear-filters">Clear filters</button></div>`;
}

function homePage() {
  const featured = state.products.filter((p) => p.featured || p.label === "New").slice(0, 4);
  return `${hero()}${trustStrip()}<section class="container section"><div class="section-head"><div><span class="eyebrow">A good place to begin</span><h2>Find your kind of everyday.</h2></div><button class="text-link" data-action="category" data-category="all">Shop everything ${icon("arrow")}</button></div><div class="category-grid">${tileData.map(([name, cat, src]) => `<div class="category-tile" data-action="category" data-category="${cat}">${image(src, `${name} collection`, "loading=lazy")}<div class="category-label">${name}<span>↗</span></div></div>`).join("")}</div></section>
    <section class="container collection"><div class="section-head"><div><span class="eyebrow">The pieces you'll reach for</span><h2>In good company.</h2><p>New favourites, already finding their place.</p></div><button class="text-link" data-action="category" data-category="all">See all ${icon("arrow")}</button></div>${productGrid(featured, 4)}</section>
    <section class="container"><div class="editorial"><div class="editorial-image">${image("https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=85", "A Lyvor look made for slow mornings", "loading=lazy")}</div><div class="editorial-copy"><span class="eyebrow">A note on getting dressed</span><h2>Wear what feels like coming home to yourself.</h2><p>We're here for the pieces you don't have to think twice about. Thoughtful fits, honest fabrics, and enough room to make them your own.</p><button class="text-link" data-action="category" data-category="essentials">Meet your new staples ${icon("arrow")}</button></div></div></section>
    <section class="quote-band"><blockquote>“The best clothes make a little more room for being exactly who you are.”</blockquote><span>A thought from Lyvor</span></section>${newsletter()}<section class="container section" style="padding-top:47px;padding-bottom:40px"><div class="section-head"><div><span class="eyebrow">Made for real life</span><h2>Considered in every detail.</h2></div></div>${trustStrip()}</section>`;
}
function newsletter() {
  return `<section class="newsletter"><span class="eyebrow">A little note from us</span><h2>Stay in the loop.</h2><p>New pieces, small stories, and first dibs. Only the good stuff, now and then.</p><form class="newsletter-form" data-form="newsletter"><input name="email" type="email" required placeholder="Your email address" aria-label="Your email address"><button type="submit">Count me in</button></form></section>`;
}
function getListing() {
  let p = [...state.products];
  if (state.view === "wishlist") p = p.filter((x) => state.wishlist.includes(x.id));
  else if (state.view === "category") {
    if (state.category === "new-arrivals") p = p.filter((x) => x.label === "New" || x.featured);
    else if (state.category !== "all") p = p.filter((x) => x.categorySlug === state.category);
  } else if (state.view === "search") {
    const q = state.query.toLowerCase().trim(); p = p.filter((x) => `${x.name} ${x.category} ${x.description} ${x.material}`.toLowerCase().includes(q));
  }
  if (state.filters.sale) p = p.filter((x) => x.compareAt && x.compareAt > x.price);
  if (state.filters.inStock) p = p.filter((x) => productVariants(x).some((v) => Number(v.stock) > 0));
  if (state.sort === "price-low") p.sort((a, b) => a.price - b.price);
  if (state.sort === "price-high") p.sort((a, b) => b.price - a.price);
  if (state.sort === "name") p.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === "featured") p.sort((a, b) => Number(b.featured) - Number(a.featured));
  return p;
}
function listingPage() {
  const data = getListing(); let title = "The full Lyvor edit", desc = "Easy pieces to make your own.";
  if (state.view === "wishlist") { title = "Your saved pieces"; desc = "A little space for the things you love."; }
  else if (state.view === "search") { title = state.query ? `You searched for “${esc(state.query)}”` : "A little looking around"; desc = `${data.length} ${data.length === 1 ? "piece" : "pieces"} to discover.`; }
  else if (state.category !== "all") { const cat = categoryBySlug(state.category); title = cat?.name || (state.category === "new-arrivals" ? "New arrivals" : "The collection"); desc = cat?.description || "Freshly considered, ready to become your favourites."; }
  return `<section class="container collection"><div class="collection-bar"><div class="collection-title"><span class="eyebrow">Lyvor / ${state.view === "wishlist" ? "Saved" : "Collection"}</span><h1>${title}</h1><p>${desc} <span>${data.length} pieces</span></p></div><div class="filter-tools"><button class="filter-button" data-action="filters">${icon("filter")}Filters${state.filters.sale || state.filters.inStock ? " · 1" : ""}</button><label class="select-wrap"><select data-input="sort" aria-label="Sort products"><option value="featured" ${state.sort === "featured" ? "selected" : ""}>Sort: Featured</option><option value="price-low" ${state.sort === "price-low" ? "selected" : ""}>Price: low to high</option><option value="price-high" ${state.sort === "price-high" ? "selected" : ""}>Price: high to low</option><option value="name" ${state.sort === "name" ? "selected" : ""}>Name: A to Z</option></select></label></div></div>
  ${state.filtersOpen ? `<div class="filters-panel"><button class="filter-chip ${state.filters.sale ? "active" : ""}" data-action="filter" data-filter="sale">On sale</button><button class="filter-chip ${state.filters.inStock ? "active" : ""}" data-action="filter" data-filter="inStock">In stock</button>${state.view !== "wishlist" && state.view !== "search" ? state.categories.slice(1).map((c) => `<button class="filter-chip ${state.category === c.slug ? "active" : ""}" data-action="category" data-category="${c.slug}">${esc(c.name)}</button>`).join("") : ""}<button class="filter-chip" data-action="clear-filters">Clear all</button></div>` : ""}
  ${productGrid(data)}</section>`;
}
function ordersPage() {
  if (state.backend && !state.user) return `<section class="container collection"><div class="empty-state"><h3>Your orders, all in one place.</h3><p>Sign in to see your Lyvor orders.</p><button class="button" data-action="auth">Sign in / create account</button></div></section>`;
  if (state.backend && state.user) return `<section class="container collection"><div class="collection-title"><span class="eyebrow">Your Lyvor account</span><h1>Your orders</h1><p>Every order, from here on out.</p></div><div id="orders-list" class="orders-list" style="margin-top:24px">${state.remoteOrdersHtml || `<div class="empty-state"><p>Loading your orders…</p></div>`}</div></section>`;
  return `<section class="container collection"><div class="collection-title"><span class="eyebrow">Your Lyvor account</span><h1>Your orders</h1><p>Orders made in demo mode stay in this browser. Connect Supabase for secure order history.</p></div><div style="margin-top:24px">${state.orders.length ? state.orders.map((o) => `<div class="admin-table-wrap" style="margin-bottom:12px"><table class="admin-table"><tbody><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th></tr><tr><td>${esc(o.order_no)}</td><td>${new Date(o.created_at).toLocaleDateString("en-IN")}</td><td><span class="status-pill">${esc(o.status)}</span></td><td>${money(o.total_amount)}</td></tr></tbody></table></div>`).join("") : `<div class="empty-state"><h3>No orders just yet.</h3><p>Your next favourite is just around the corner.</p><button class="button" data-action="category" data-category="all">Find your next favourite</button></div>`}</div></section>`;
}

function footer() {
  return `<footer class="footer"><div class="footer-main"><div class="footer-brand">${image("./assets/lyvor-logo.jpeg", "Lyvor") }<p>Easy pieces. Honest materials. Clothes that give you room to be you.</p></div><div class="footer-col"><h4>Find your fit</h4>${navLinks()}<a href="#wishlist" data-action="wishlist">Saved pieces</a></div><div class="footer-col"><h4>Here to help</h4><a href="mailto:hello@lyvor.in">Get in touch</a><a href="#orders" data-action="orders">Track an order</a><a href="#">Shipping & returns</a></div><div class="footer-col"><h4>The small print</h4><a href="#">Privacy</a><a href="#">Terms of service</a><button data-action="admin">Store admin</button></div></div><div class="footer-bottom"><span>© 2026 Lyvor Studio. Made for everyday, in India.</span><span>Made with care&nbsp; · &nbsp;INR ₹</span></div></footer>`;
}

function cartDrawer() {
  const lines = activeCart();
  return `<div class="drawer-head"><h2>Your bag <span style="font:11px var(--sans);color:var(--muted)">(${cartCount()})</span></h2><button class="icon-button" aria-label="Close bag" data-action="close-drawer">${icon("close")}</button></div><div class="drawer-body">${lines.length ? `${lines.map((line, i) => `<div class="cart-row"><div class="cart-product-image">${image(line.product.image, line.product.name, "loading=lazy")}</div><div class="cart-copy"><strong>${esc(line.product.name)}</strong><small>${esc(line.color)} · ${esc(line.size)}</small><div class="quantity-control"><button aria-label="Reduce quantity" data-action="quantity" data-index="${i}" data-delta="-1">−</button><span style="font-size:10px">${line.quantity}</span><button aria-label="Add quantity" data-action="quantity" data-index="${i}" data-delta="1">+</button><button class="remove-line" data-action="remove-line" data-index="${i}">Remove</button></div></div><div class="cart-row-price">${money(line.product.price * line.quantity)}</div></div>`).join("")}</div><div class="drawer-foot"><div class="shipping-note">${shipping() === 0 ? "Your delivery is on us. A small thank you from Lyvor." : `You're ${money(Math.max(0, (state.settings.free_shipping_threshold || 3000) - subtotal()))} away from complimentary delivery.`}</div><div class="cart-total"><span>Subtotal</span><strong>${money(subtotal())}</strong></div><button class="button full" data-action="checkout">Continue to checkout ${icon("arrow")}</button><p class="field-hint" style="text-align:center">Taxes included. Shipping calculated at checkout.</p></div>` : `<div class="empty-state" style="margin-top:30px"><h3>Your bag is taking a little breather.</h3><p>Let’s find something that feels like you.</p><button class="button" data-action="close-drawer">Continue browsing</button></div>`}`;
}

function productModal() {
  const p = getProduct(state.productId); if (!p) return "";
  const colors = productColors(p); const color = state.selectedColor || colors[0]?.name || "Natural"; const sizes = productSizes(p, color); const size = state.selectedSize || sizes[0] || "One size"; const stock = availableStock(p, size, color);
  return `<div class="product-modal ${state.modal === "product" ? "open" : ""}" role="dialog" aria-modal="true" aria-label="${esc(p.name)}"><button class="icon-button modal-close" data-action="close-modal" aria-label="Close">${icon("close")}</button><div class="product-detail"><div class="detail-image">${image(p.image, p.name)}</div><div class="detail-copy"><span class="eyebrow">${esc(p.category)} / Lyvor</span><h2>${esc(p.name)}</h2><div class="detail-price">${money(p.price)}${p.compareAt ? `<span class="compare-price">${money(p.compareAt)}</span>` : ""}</div><p>${esc(p.description)}</p><span class="option-label">Colour · ${esc(color)}</span><div class="color-options">${colors.map((c) => `<button class="color-choice ${color === c.name ? "selected" : ""}" data-action="choose-color" data-color="${esc(c.name)}"><i style="background:${esc(c.hex)}"></i>${esc(c.name)}</button>`).join("")}</div><span class="option-label">Select a size</span><div class="size-options">${sizes.map((s) => `<button class="size-choice ${size === s ? "selected" : ""}" data-action="choose-size" data-size="${esc(s)}" ${availableStock(p, s, color) < 1 ? "disabled" : ""}>${esc(s)}</button>`).join("")}</div><div class="detail-bottom"><button class="button full" data-action="add-to-cart" ${stock < 1 ? "disabled" : ""}>${stock < 1 ? "Sold out" : `Add to bag · ${money(p.price)}`}</button><div class="detail-foot">${icon("truck")}Complimentary delivery over ${money(state.settings.free_shipping_threshold || 3000)} <span>·</span> 7-day returns</div><div class="detail-foot">${icon("leaf")}${esc(p.material || "Made with considered fabrics")}</div></div></div></div></div>`;
}

function authModal() {
  if (!["auth", "password-change"].includes(state.modal)) return "";
  const changing = state.modal === "password-change";
  return `<section class="modal open" role="dialog" aria-modal="true" aria-label="${changing ? "Change your password" : "Your Lyvor account"}"><div class="modal-head"><div><span class="eyebrow">${changing ? "One small thing first" : "Your Lyvor account"}</span><h2>${changing ? "Choose a new password." : state.authMode === "login" ? "Welcome back." : "Make room for Lyvor."}</h2><p>${changing ? "Please update your temporary password to continue." : "Order updates and a little more room for the things you love."}</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">${icon("close")}</button></div><div class="modal-body">${changing ? `<div class="auth-warning">Your store administrator account needs a new password before you can access store tools.</div><form data-form="password-change"><div class="field"><label>New password</label><input type="password" name="new_password" autocomplete="new-password" minlength="10" required placeholder="At least 10 characters"></div><div class="field"><label>Confirm new password</label><input type="password" name="confirm_password" autocomplete="new-password" minlength="10" required placeholder="Enter it once more"></div>${state.authError ? `<p class="form-error">${esc(state.authError)}</p>` : ""}<button class="button full">Update password</button></form>` : `<div class="auth-tabs"><button class="${state.authMode === "login" ? "active" : ""}" data-action="auth-mode" data-mode="login">Sign in</button><button class="${state.authMode === "signup" ? "active" : ""}" data-action="auth-mode" data-mode="signup">Create account</button></div>${!state.backend ? `<div class="site-alert">Account sign-in and real order processing need a Supabase project. The storefront is in local preview mode.</div>` : ""}<form data-form="auth"><div class="field-grid">${state.authMode === "signup" ? `<div class="field full-row"><label>Your name</label><input name="full_name" autocomplete="name" required placeholder="The name on your orders"></div>` : ""}<div class="field full-row"><label>${state.authMode === "login" ? "Email or username" : "Email address"}</label><input name="login" ${state.authMode === "signup" ? "type=email" : "type=text"} autocomplete="username" required placeholder="${state.authMode === "login" ? "You can also use your Lyvor username" : "you@example.com"}"></div><div class="field full-row"><label>Password</label><input name="password" type="password" autocomplete="${state.authMode === "login" ? "current-password" : "new-password"}" minlength="8" required placeholder="At least 8 characters"></div></div>${state.authError ? `<p class="form-error">${esc(state.authError)}</p>` : ""}${state.authNotice ? `<p class="form-success">${esc(state.authNotice)}</p>` : ""}<button class="button full" ${!state.backend ? "disabled" : ""}>${state.authMode === "login" ? "Sign in" : "Create account"}</button></form><p class="field-hint">By continuing, you agree to our terms and privacy policy. Securely handled by Supabase.</p></div>`}</section>`;
}

function checkoutModal() {
  if (state.modal !== "checkout") return "";
  const d = state.checkoutData;
  const hasRemote = state.backend;
  return `<section class="modal open" role="dialog" aria-modal="true" aria-label="Checkout"><div class="modal-head"><div><span class="eyebrow">Almost yours</span><h2>Delivery details.</h2><p>All fields are required so your order finds its way home.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">${icon("close")}</button></div><div class="modal-body">${!hasRemote ? `<div class="site-alert">Preview mode: orders are saved only in this browser. Connect Supabase before accepting real customer orders.</div>` : !state.user ? `<div class="site-alert">Sign in or create an account to place your COD order and keep track of it here.</div>` : ""}<form data-form="checkout"><div class="field-grid"><div class="field full-row"><label>Full name</label><input name="full_name" autocomplete="name" required value="${esc(d.full_name || state.profile?.full_name || "")}" placeholder="Your full name"></div><div class="field"><label>Mobile number</label><input name="phone" type="tel" inputmode="numeric" pattern="[6-9][0-9]{9}" maxlength="10" required value="${esc(d.phone || "")}" placeholder="10-digit mobile"></div><div class="field"><label>Email address</label><input name="email" type="email" autocomplete="email" required value="${esc(d.email || state.user?.email || "")}" placeholder="you@example.com"></div><div class="field full-row"><label>Address line 1</label><input name="line1" autocomplete="address-line1" required value="${esc(d.line1 || "")}" placeholder="House / flat, street, area"></div><div class="field full-row"><label>Address line 2 <span style="text-transform:none;letter-spacing:0">(optional)</span></label><input name="line2" autocomplete="address-line2" value="${esc(d.line2 || "")}" placeholder="Landmark, apartment"></div><div class="field"><label>City</label><input name="city" autocomplete="address-level2" required value="${esc(d.city || "")}" placeholder="City"></div><div class="field"><label>State / UT</label><select name="state" autocomplete="address-level1" required><option value="">Choose a state</option>${indiaStates.map((x) => `<option ${d.state === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div class="field"><label>PIN code</label><input name="pincode" autocomplete="postal-code" inputmode="numeric" pattern="[1-9][0-9]{5}" maxlength="6" required value="${esc(d.pincode || "")}" placeholder="6-digit PIN"></div><div class="field"><label>Delivery note <span style="text-transform:none;letter-spacing:0">(optional)</span></label><input name="note" value="${esc(d.note || "")}" placeholder="Anything we should know?"></div></div><div class="option-label">A payment that feels easy</div><div class="payment-card"><span class="payment-icon">₹</span><div><strong>Cash on delivery</strong><small>Pay your delivery partner when it arrives.</small></div><span style="margin-left:auto;color:var(--green)">✓</span></div><div class="option-label">Got a little something for us?</div><div class="coupon-row"><input name="coupon" id="coupon-code" placeholder="Enter a coupon" value="${esc(state.coupon?.code || "")}"><button type="button" data-action="apply-coupon" ${state.couponLoading ? "disabled" : ""}>${state.couponLoading ? "Checking…" : "Apply"}</button></div>${state.couponFeedback ? `<p class="${state.coupon ? "form-success" : "form-error"}">${esc(state.couponFeedback)}</p>` : ""}<div class="checkout-summary"><div class="summary-line"><span>Subtotal</span><span>${money(subtotal())}</span></div>${discount() ? `<div class="summary-line"><span>Discount · ${esc(state.coupon.code)}</span><span>−${money(discount())}</span></div>` : ""}<div class="summary-line"><span>Delivery</span><span>${shipping() === 0 ? "Complimentary" : money(shipping())}</span></div><div class="summary-line total"><strong>Total</strong><strong>${money(total())}</strong></div></div><button class="button full" ${!activeCart().length ? "disabled" : ""}>${hasRemote && !state.user ? "Sign in to place order" : `Place COD order · ${money(total())}`}</button><p class="field-hint">${hasRemote ? "Your order total, stock, and coupon are confirmed securely when you place your order." : "This is a local preview only; no order will reach the Lyvor team."}</p></form></div></section>`;
}
const indiaStates = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];

function orderSuccess() {
  if (state.modal !== "success" || !state.orderResult) return "";
  const o = state.orderResult;
  return `<section class="modal open" role="dialog" aria-modal="true" aria-label="Order confirmed"><div class="modal-head"><div><span class="eyebrow">A very good choice</span><h2>It's on its way to becoming yours.</h2></div><button class="icon-button" data-action="close-modal" aria-label="Close">${icon("close")}</button></div><div class="modal-body"><div class="success-content"><div class="success-mark">✓</div><p>${o.demo ? "This local preview order is saved in this browser only." : "Your COD order is confirmed. We’ll send you updates as it makes its way to you."}</p><div class="order-no">${esc(o.order_no)}</div><div class="checkout-summary"><div class="summary-line"><span>Payment</span><span>Cash on delivery</span></div><div class="summary-line total"><strong>Total</strong><strong>${money(o.total_amount)}</strong></div></div>${o.demo ? `<div class="site-alert">Demo order · not sent to Lyvor or stored on a server.</div>` : ""}<button class="button full" data-action="success-finish">Keep looking around</button></div></div></section>`;
}

function searchModal() {
  if (state.modal !== "search") return "";
  return `<section class="modal open" role="dialog" aria-modal="true" aria-label="Search Lyvor"><div class="modal-head"><div><span class="eyebrow">A little looking around</span><h2>What are you in the mood for?</h2></div><button class="icon-button" data-action="close-modal">${icon("close")}</button></div><div class="modal-body"><form data-form="search"><div class="field"><label>Search the collection</label><input name="query" autocomplete="off" value="${esc(state.query)}" placeholder="Try ‘everyday shirt’ or ‘essentials’"></div><button class="button full">Search ${icon("arrow")}</button></form></div></section>`;
}

function adminShell() {
  if (!state.backend) return `<section class="container collection"><div class="empty-state"><h3>Store tools need a live connection.</h3><p>The admin area is protected by Supabase authentication and database roles. Configure a Supabase project before using it.</p><a class="text-link" href="#home" data-action="home">Back to the shop ${icon("arrow")}</a></div></section>`;
  if (!state.user) return `<section class="container collection"><div class="empty-state"><h3>Sign in to continue.</h3><p>Only verified Lyvor store administrators can open the store console.</p><button class="button" data-action="auth">Sign in to admin</button></div></section>`;
  if (state.profile?.role !== "admin") return `<section class="container collection"><div class="empty-state"><h3>This account doesn’t have store access.</h3><p>Store administration is limited to accounts with the admin role.</p><button class="button secondary" data-action="signout">Sign out</button></div></section>`;
  const tabs = [["overview", "Overview"], ["products", "Products & stock"], ["orders", "Orders"], ["customers", "Customers"], ["categories", "Categories"], ["coupons", "Coupons"], ["content", "Homepage & content"], ["settings", "Store settings"]];
  return `<section class="container"><div class="admin-shell"><aside class="admin-side"><h1>Store tools</h1>${tabs.map(([id, label]) => `<button class="admin-tab ${state.adminTab === id ? "active" : ""}" data-action="admin-tab" data-tab="${id}">${label}</button>`).join("")}<button class="admin-tab" data-action="signout" style="margin-top:16px">Sign out</button></aside><div class="admin-content">${adminContent()}</div></div></section>`;
}
function adminProductsPage() {
  const products = state.adminProducts;
  return `<div class="admin-head"><div><span class="eyebrow">Stock & collection</span><h2>Products</h2></div><button class="button" data-action="admin-new-product">Add a piece +</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Piece</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th></th></tr></thead><tbody>${products.map((p) => `<tr><td><div class="admin-product">${image(p.image, "", "loading=lazy")}<span>${esc(p.name)}</span></div></td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${productVariants(p).reduce((n, v) => n + Number(v.stock || 0), 0)}</td><td>${p.isActive === false ? "Hidden" : "Visible"}</td><td><button class="text-link" data-action="admin-edit-product" data-id="${esc(p.id)}">Edit</button><br><button class="text-link" data-action="admin-toggle-product" data-id="${esc(p.id)}">${p.isActive === false ? "Show" : "Hide"}</button></td></tr>`).join("") || `<tr><td colspan="6">No products yet.</td></tr>`}</tbody></table></div>`;
}
function adminContent() {
  const a = state.admin;
  if (state.adminTab === "products") return adminProductsPage();
  if (state.adminTab === "overview") {
    const all = a.orders || []; const paid = all.filter((o) => !["cancelled"].includes(o.status)); const sales = paid.reduce((sum, o) => sum + Number(o.total_amount || 0), 0); const today = new Date().toDateString(); const todayOrders = paid.filter((o) => new Date(o.created_at).toDateString() === today).length;
    return `<div class="admin-head"><div><span class="eyebrow">The shop, at a glance</span><h2>Good to have you back.</h2></div><button class="button secondary" data-action="reload-admin">Refresh</button></div><div class="admin-cards"><div class="stat-card"><span>Orders</span><strong>${all.length}</strong></div><div class="stat-card"><span>Sales total</span><strong>${money(sales)}</strong></div><div class="stat-card"><span>Orders today</span><strong>${todayOrders}</strong></div><div class="stat-card"><span>Customers</span><strong>${a.customers.length}</strong></div></div><h3 style="font:20px var(--serif);margin:26px 0 13px">A few recent orders</h3>${ordersTable(all.slice(0, 6))}<p class="admin-note">Sales total uses current order statuses and includes cancelled-order handling. Payment is cash on delivery.</p>`;
  }
  if (state.adminTab === "products") return `<div class="admin-head"><div><span class="eyebrow">Stock & collection</span><h2>Products</h2></div><button class="button" data-action="admin-new-product">Add a piece +</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Piece</th><th>Category</th><th>Price</th><th>Stock</th><th>Visibility</th><th></th></tr></thead><tbody>${state.products.map((p) => `<tr><td><div class="admin-product">${image(p.image, "", "loading=lazy")}<span>${esc(p.name)}</span></div></td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${productVariants(p).reduce((n, v) => n + Number(v.stock || 0), 0)}</td><td>${p.isActive === false ? "Hidden" : "Visible"}</td><td><button class="text-link" data-action="admin-edit-product" data-id="${esc(p.id)}">Edit</button><br><button class="text-link" data-action="admin-toggle-product" data-id="${esc(p.id)}">${p.isActive === false ? "Show" : "Hide"}</button></td></tr>`).join("")}</tbody></table></div>`;
  if (state.adminTab === "orders") return `<div class="admin-head"><div><span class="eyebrow">Fulfilment</span><h2>Orders</h2></div><button class="button secondary" data-action="reload-admin">Refresh</button></div>${ordersTable(a.orders)}`;
  if (state.adminTab === "customers") return `<div class="admin-head"><div><span class="eyebrow">People who chose Lyvor</span><h2>Customers</h2></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>${a.customers.map((c) => `<tr><td>${esc(c.full_name || c.username || "Lyvor customer")}</td><td>${esc(c.email || "—")}</td><td>${esc(c.role)}</td><td>${c.created_at ? new Date(c.created_at).toLocaleDateString("en-IN") : "—"}</td></tr>`).join("") || `<tr><td colspan="4">No customer accounts found.</td></tr>`}</tbody></table></div>`;
  if (state.adminTab === "categories") return `<div class="admin-head"><div><span class="eyebrow">Shop structure</span><h2>Categories</h2></div><button class="button" data-action="admin-new-category">Add category +</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Name</th><th>Slug</th><th>Description</th><th></th></tr></thead><tbody>${state.categories.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.slug)}</td><td>${esc(c.description || "—")}</td><td><button class="text-link" data-action="admin-edit-category" data-id="${esc(c.id)}">Edit</button></td></tr>`).join("")}</tbody></table></div>`;
  if (state.adminTab === "coupons") return `<div class="admin-head"><div><span class="eyebrow">Offers & customer thank-yous</span><h2>Coupons</h2></div><button class="button" data-action="admin-new-coupon">Add coupon +</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Code</th><th>Discount</th><th>Minimum</th><th>Uses</th><th>Live</th><th></th></tr></thead><tbody>${a.coupons.map((c) => `<tr><td>${esc(c.code)}</td><td>${c.discount_type === "percent" ? `${c.discount_value}%` : money(c.discount_value)}</td><td>${money(c.min_order)}</td><td>${c.redemptions || 0}${c.max_redemptions ? ` / ${c.max_redemptions}` : ""}</td><td>${c.is_active ? "Yes" : "No"}</td><td><button class="text-link" data-action="admin-edit-coupon" data-id="${esc(c.id)}">Edit</button></td></tr>`).join("") || `<tr><td colspan="6">No coupons yet.</td></tr>`}</tbody></table></div>`;
  if (state.adminTab === "content") {
    const c = a.content?.content || a.content || {};
    return `<div class="admin-head"><div><span class="eyebrow">The little things people see first</span><h2>Homepage & content</h2></div></div><form class="admin-form" data-form="admin-content"><div class="field"><label>Announcement line</label><input name="announcement" required value="${esc(c.announcement || "A little room to be you · complimentary delivery over ₹3,000")}"></div><div class="field"><label>Hero eyebrow</label><input name="hero_eyebrow" required value="${esc(c.hero_eyebrow || "The little things, considered")}"></div><div class="field"><label>Hero heading</label><input name="hero_heading" required value="${esc(c.hero_heading || "A softer kind of everyday.")}"></div><div class="field"><label>Hero copy</label><textarea name="hero_copy">${esc(c.hero_copy || "Clothes that feel like you, on your most ordinary and extraordinary days alike.")}</textarea></div><div class="field"><label>Hero image URL</label><input name="hero_image" type="url" value="${esc(c.hero_image || "")}" placeholder="https://..."></div><button class="button">Save homepage content</button><p class="admin-note">Image links should use a stable, public HTTPS image address. Product image URLs are managed with each product.</p></form>`;
  }
  if (state.adminTab === "settings") {
    const s = a.settings || state.settings;
    return `<div class="admin-head"><div><span class="eyebrow">How we look after orders</span><h2>Store settings</h2></div></div><form class="admin-form" data-form="admin-settings"><div class="field"><label>Free delivery threshold (₹)</label><input name="free_shipping_threshold" type="number" min="0" step="1" required value="${esc(s.free_shipping_threshold ?? 3000)}"></div><div class="field"><label>Delivery fee below threshold (₹)</label><input name="shipping_fee" type="number" min="0" step="1" required value="${esc(s.shipping_fee ?? 99)}"></div><button class="button">Save settings</button><p class="admin-note">Checkout recalculates delivery and order totals from the current store settings.</p></form>`;
  }
  return `<div class="admin-head"><h2>Loading store tools…</h2></div>`;
}
function ordersTable(orders) {
  return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Total</th><th>Status</th><th>Update</th></tr></thead><tbody>${orders.map((o) => `<tr><td>${esc(o.order_no || o.id?.slice(0, 8) || "—")}</td><td>${esc(o.address?.full_name || o.customer_name || "Customer")}<br><span style="color:var(--muted)">${esc(o.address?.phone || "")}</span></td><td>${new Date(o.created_at).toLocaleDateString("en-IN")}</td><td>${money(o.total_amount)}</td><td><span class="status-pill">${esc(o.status)}</span></td><td><select data-change="order-status" data-id="${esc(o.id)}"><option value="">Change status</option>${["confirmed", "processing", "shipped", "delivered", "cancelled"].map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("") || `<tr><td colspan="6">No orders to show yet.</td></tr>`}</tbody></table></div>`;
}

function adminProductModal() {
  if (state.modal !== "admin-product") return "";
  const p = getProduct(state.editingId); const variants = p ? productVariants(p).map((v) => `${v.size} | ${v.color} | ${v.stock}`).join("\n") : "S | Ivory | 6\nM | Ivory | 8\nL | Ivory | 6";
  return `<section class="modal open" role="dialog" aria-modal="true" aria-label="Edit product"><div class="modal-head"><div><span class="eyebrow">The collection, carefully kept</span><h2>${p ? "Edit this piece." : "Add a new piece."}</h2></div><button class="icon-button" data-action="close-modal">${icon("close")}</button></div><div class="modal-body"><form data-form="admin-product"><div class="field-grid"><div class="field full-row"><label>Product name</label><input name="name" required value="${esc(p?.name || "")}" placeholder="The Easy Shirt"></div><div class="field"><label>Category</label><select name="category_id" required>${state.categories.map((c) => `<option value="${esc(c.id)}" ${p?.categoryId === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div class="field"><label>Price (₹)</label><input name="price" type="number" min="1" required value="${esc(p?.price || "")}"></div><div class="field"><label>Compare at (₹)</label><input name="compare_at_price" type="number" min="1" value="${esc(p?.compareAt || "")}" placeholder="Optional"></div><div class="field"><label>Label</label><input name="label" value="${esc(p?.label || "")}" placeholder="Bestseller"></div><div class="field full-row"><label>Image URL</label><input name="image_url" type="url" required value="${esc(p?.image || "")}" placeholder="https://images.unsplash.com/..."></div><div class="field full-row"><label>Description</label><textarea name="description">${esc(p?.description || "")}</textarea></div><div class="field full-row"><label>Material</label><input name="material" value="${esc(p?.material || "")}"></div><div class="field full-row"><label>Size | colour | available stock (one variant per line)</label><textarea name="variants" required rows="5">${esc(variants)}</textarea></div><div class="field full-row"><label><input name="is_featured" type="checkbox" ${p?.featured ? "checked" : ""} style="width:auto;height:auto;margin-right:7px"> Feature on home page</label></div></div>${state.authError ? `<p class="form-error">${esc(state.authError)}</p>` : ""}<button class="button full">${p ? "Save piece" : "Add piece"}</button></form></div></section>`;
}
function adminCategoryModal() {
  if (state.modal !== "admin-category") return "";
  const c = state.categories.find((x) => x.id === state.editingId);
  return `<section class="modal open"><div class="modal-head"><div><span class="eyebrow">Shop structure</span><h2>${c ? "Edit category." : "Add category."}</h2></div><button class="icon-button" data-action="close-modal">${icon("close")}</button></div><div class="modal-body"><form data-form="admin-category"><div class="field"><label>Category name</label><input name="name" required value="${esc(c?.name || "")}"></div><div class="field"><label>Slug (lowercase, hyphens)</label><input name="slug" pattern="[a-z0-9-]+" required value="${esc(c?.slug || "")}"></div><div class="field"><label>Description</label><textarea name="description">${esc(c?.description || "")}</textarea></div><button class="button full">Save category</button></form></div></section>`;
}
function adminCouponModal() {
  if (state.modal !== "admin-coupon") return "";
  const c = state.admin.coupons.find((x) => x.id === state.editingId);
  return `<section class="modal open"><div class="modal-head"><div><span class="eyebrow">A little thank you</span><h2>${c ? "Edit coupon." : "Add a coupon."}</h2></div><button class="icon-button" data-action="close-modal">${icon("close")}</button></div><div class="modal-body"><form data-form="admin-coupon"><div class="field"><label>Code</label><input name="code" pattern="[A-Za-z0-9_-]+" required value="${esc(c?.code || "")}" style="text-transform:uppercase"></div><div class="field-grid"><div class="field"><label>Discount type</label><select name="discount_type"><option value="percent" ${c?.discount_type !== "fixed" ? "selected" : ""}>Percent</option><option value="fixed" ${c?.discount_type === "fixed" ? "selected" : ""}>Fixed rupees</option></select></div><div class="field"><label>Discount value</label><input name="discount_value" type="number" min="1" required value="${esc(c?.discount_value || "")}"></div><div class="field"><label>Minimum order (₹)</label><input name="min_order" type="number" min="0" value="${esc(c?.min_order || 0)}"></div><div class="field"><label>Maximum discount (₹)</label><input name="max_discount" type="number" min="0" value="${esc(c?.max_discount || "")}"></div><div class="field"><label>Maximum redemptions</label><input name="max_redemptions" type="number" min="1" value="${esc(c?.max_redemptions || "")}" placeholder="Unlimited"></div><div class="field"><label><input name="is_active" type="checkbox" ${c?.is_active === false ? "" : "checked"} style="width:auto;height:auto;margin-right:7px"> Active</label></div></div><button class="button full">Save coupon</button></form></div></section>`;
}
function currentPage() { return state.view === "home" ? homePage() : state.view === "orders" ? ordersPage() : state.view === "admin" ? adminShell() : listingPage(); }
function render() {
  const root = $("#app"); if (!root) return;
  root.innerHTML = `${header()}<main>${currentPage()}</main>${footer()}<nav class="mobile-bottom"><button data-action="home">${icon("home")}Home</button><button data-action="search">${icon("search")}Search</button><button data-action="wishlist">${icon("heart")}Saved</button><button data-action="cart">${icon("bag")}Bag · ${cartCount()}</button></nav><div class="overlay ${state.drawer || state.modal ? "open" : ""}" data-action="overlay"></div><aside class="drawer ${state.drawer === "cart" ? "open" : ""}" role="dialog" aria-modal="true" aria-label="Shopping bag">${cartDrawer()}</aside>${productModal()}${authModal()}${checkoutModal()}${orderSuccess()}${searchModal()}${adminProductModal()}${adminCategoryModal()}${adminCouponModal()}<div class="toast" role="status" aria-live="polite"></div>`;
  if (state.modal === "checkout" && $("#coupon-code") && state.checkoutData.coupon) $("#coupon-code").value = state.checkoutData.coupon;
  if (state.view === "orders" && state.backend && state.user && !state.ordersLoaded) loadCustomerOrders();
  if (state.view === "admin" && state.backend && state.profile?.role === "admin" && !state.adminLoaded) loadAdminData();
}

let toastTimer;
function toast(message) { const el = $(".toast"); if (!el) return; el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2400); }
function changeModal(modal) { state.modal = modal; state.authError = ""; state.authNotice = ""; render(); if (modal === "search") setTimeout(() => $("[name=query]")?.focus(), 80); }
function openProduct(id) { const p = getProduct(id); if (!p) return; const colors = productColors(p); state.productId = id; state.selectedColor = colors[0]?.name || "Natural"; state.selectedSize = productSizes(p, state.selectedColor)[0] || "One size"; state.modal = "product"; render(); }
function addToCart(id, size, color) {
  const p = getProduct(id); if (!p) return;
  const variant = findVariant(p, size, color);
  if (!variant || variant.stock < 1) { toast("That size is currently out of stock."); return; }
  const existing = state.cart.find((x) => x.productId === id && x.size === size && x.color === color);
  if (existing) { if (existing.quantity >= Number(variant.stock)) { toast("That’s all we have in stock for this size."); return; } existing.quantity++; }
  else state.cart.push({ productId: id, variantId: variant.id, size, color, quantity: 1 });
  saveStore(); state.modal = ""; state.drawer = "cart"; render();
}
function cartChange(index, delta) {
  const lines = activeCart(); const line = lines[index]; if (!line) return;
  const actual = state.cart.find((x) => x.productId === line.productId && x.size === line.size && x.color === line.color); const variant = findVariant(line.product, line.size, line.color);
  actual.quantity += delta;
  if (actual.quantity <= 0) state.cart = state.cart.filter((x) => x !== actual);
  else if (variant && actual.quantity > variant.stock) { actual.quantity = variant.stock; toast("We’ve adjusted that to the available stock."); }
  saveStore(); render();
}

async function initBackend() {
  const cfg = window.LYVOR_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { state.backend = false; render(); return; }
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    state.client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    state.backend = true;
    await loadCatalog();
    const { data: { session } } = await state.client.auth.getSession();
    state.user = session?.user || null;
    if (state.user) await loadProfile();
    state.client.auth.onAuthStateChange((_event, sessionNow) => {
      queueMicrotask(async () => { state.user = sessionNow?.user || null; if (state.user) await loadProfile(); else state.profile = null; state.adminLoaded = false; render(); });
    });
    const { data: settings } = await state.client.from("store_settings").select("*").eq("id", 1).maybeSingle();
    if (settings) { state.settings = settings; }
    render();
  } catch (e) {
    console.warn("Supabase connection could not be started; showing the local preview.", e);
    state.backend = false; state.client = null; render();
  }
}
function mapRemoteProduct(p) {
  const variants = (p.product_variants || []).map((v) => ({ id: v.id, size: v.size, color: v.color, colorHex: v.color_hex || "#c5ae8a", stock: v.stock }));
  return { id: p.id, slug: p.slug, name: p.name, category: p.categories?.name || "Lyvor", categorySlug: p.categories?.slug || "all", categoryId: p.category_id, price: Number(p.price), compareAt: p.compare_at_price ? Number(p.compare_at_price) : null, label: p.label || "", image: p.image_url, description: p.description || "", material: p.material || "", variants, featured: !!p.is_featured, isActive: !!p.is_active };
}
async function loadCatalog() {
  if (!state.client) return;
  const [cats, products] = await Promise.all([
    state.client.from("categories").select("*").eq("is_active", true).order("sort_order"),
    state.client.from("products").select("*, categories(name,slug), product_variants(*)").eq("is_active", true).order("sort_order")
  ]);
  if (cats.error) throw cats.error; if (products.error) throw products.error;
  if (cats.data?.length) state.categories = cats.data;
  if (products.data?.length) state.products = products.data.map(mapRemoteProduct);
  const { data: content } = await state.client.from("site_content").select("content").eq("id", 1).maybeSingle();
  state.siteContent = content?.content || {};
}
async function loadProfile() {
  if (!state.client || !state.user) return;
  const { data, error } = await state.client.from("profiles").select("id,username,full_name,phone,role,must_change_password").eq("id", state.user.id).maybeSingle();
  if (error) console.warn("Could not load profile", error.message);
  state.profile = data || null;
  if (state.profile?.must_change_password && state.modal !== "password-change") state.modal = "password-change";
}
async function loadCustomerOrders() {
  if (!state.client || !state.user || state.loadingOrders) return;
  state.loadingOrders = true;
  const { data, error } = await state.client.from("orders").select("id,order_no,status,total_amount,created_at,order_items(product_name,quantity,line_total)").eq("customer_id", state.user.id).order("created_at", { ascending: false });
  state.loadingOrders = false;
  state.ordersLoaded = true;
  if (error) { state.remoteOrdersHtml = `<div class="site-alert">${esc(error.message)}</div>`; }
  else state.remoteOrdersHtml = data?.length ? data.map((o) => `<div class="admin-table-wrap" style="margin-bottom:12px"><table class="admin-table"><thead><tr><th>Order</th><th>Placed</th><th>Items</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody><tr><td>${esc(o.order_no)}</td><td>${new Date(o.created_at).toLocaleDateString("en-IN")}</td><td>${(o.order_items || []).map((x) => `${esc(x.product_name)} × ${x.quantity}`).join("<br>")}</td><td><span class="status-pill">${esc(o.status)}</span></td><td>${money(o.total_amount)}</td><td>${["pending", "confirmed"].includes(o.status) ? `<button class="text-link" data-action="cancel-order" data-id="${esc(o.id)}">Cancel</button>` : ""}</td></tr></tbody></table></div>`).join("") : `<div class="empty-state"><h3>No orders just yet.</h3><p>We’ll keep this space ready for you.</p></div>`;
  if (state.view === "orders") render();
}
async function loadAdminData() {
  if (!state.client || state.profile?.role !== "admin" || state.loadingAdmin) return;
  state.loadingAdmin = true;
  const [orders, customers, coupons, settings, content, categories, products] = await Promise.all([
    state.client.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
    state.client.from("profiles").select("id,username,email,full_name,phone,role,created_at").order("created_at", { ascending: false }).limit(500),
    state.client.from("coupons").select("*").order("created_at", { ascending: false }),
    state.client.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    state.client.from("site_content").select("*").eq("id", 1).maybeSingle(),
    state.client.from("categories").select("*").order("sort_order"),
    state.client.from("products").select("*, categories(name,slug), product_variants(*)").order("sort_order")
  ]);
  state.loadingAdmin = false;
  for (const r of [orders, customers, coupons, settings, content, categories, products]) if (r.error) { toast("A store report could not be loaded. Check your admin policies."); console.error(r.error); }
  state.admin = { orders: orders.data || [], customers: customers.data || [], coupons: coupons.data || [], settings: settings.data, content: content.data };
  state.adminProducts = products.data?.map(mapRemoteProduct) || [];
  if (settings.data) state.settings = settings.data;
  if (categories.data?.length) state.categories = categories.data;
  state.adminLoaded = true; render();
}

async function submitAuth(form) {
  if (!state.client) { state.authError = "Supabase is not configured yet. See the project README."; render(); return; }
  const fd = new FormData(form); state.authError = ""; state.authNotice = "";
  const identifier = String(fd.get("login") || "").trim().toLowerCase(); const password = String(fd.get("password") || "");
  try {
    if (state.authMode === "signup") {
      const { data, error } = await state.client.auth.signUp({ email: identifier, password, options: { data: { full_name: String(fd.get("full_name") || "").trim() } } });
      if (error) throw error;
      if (!data.session) { state.authNotice = "Check your email to confirm your new account. You can sign in once it's verified."; render(); return; }
    } else {
      const email = identifier.includes("@") ? identifier : `${identifier}@lyvor.in`;
      const { error } = await state.client.auth.signInWithPassword({ email, password }); if (error) throw error;
    }
    const { data: { user } } = await state.client.auth.getUser(); state.user = user || null; await loadProfile();
    if (state.profile?.must_change_password) { state.modal = "password-change"; }
    else { state.modal = state.pendingCheckout ? "checkout" : ""; if (!state.pendingCheckout && state.view === "admin") { state.adminLoaded = false; await loadAdminData(); } }
    state.authError = ""; render(); toast("You’re signed in. Good to see you.");
  } catch (e) { state.authError = e.message || "We couldn’t sign you in. Check your details and try again."; render(); }
}
async function changeInitialPassword(form) {
  if (!state.client || !state.user) return;
  const fd = new FormData(form); const password = String(fd.get("new_password") || "");
  if (password !== String(fd.get("confirm_password") || "")) { state.authError = "Those passwords don’t match."; render(); return; }
  if (password.length < 10) { state.authError = "Use at least 10 characters for your new password."; render(); return; }
  const { error } = await state.client.auth.updateUser({ password });
  if (error) { state.authError = error.message; render(); return; }
  const { error: profileError } = await state.client.rpc("complete_initial_password_change");
  if (profileError) { state.authError = "Password changed, but the admin profile update failed. Ask the Supabase project owner to apply the current schema."; render(); return; }
  await loadProfile(); state.modal = state.pendingCheckout ? "checkout" : ""; state.authError = ""; render(); toast("Password updated. You’re all set.");
}

function checkoutAddress(fd) { const address = Object.fromEntries(["full_name", "phone", "email", "line1", "line2", "city", "state", "pincode", "note"].map((k) => [k, String(fd.get(k) || "").trim()])); return address; }
async function submitCheckout(form) {
  const fd = new FormData(form); state.checkoutData = Object.fromEntries(fd.entries());
  const address = checkoutAddress(fd);
  if (!/^[6-9]\d{9}$/.test(address.phone)) { toast("Please enter a valid 10-digit Indian mobile number."); return; }
  if (!/^[1-9]\d{5}$/.test(address.pincode)) { toast("Please enter a valid 6-digit PIN code."); return; }
  if (!activeCart().length) { toast("Your bag is empty."); return; }
  if (state.backend && !state.user) { state.pendingCheckout = true; state.authMode = "login"; state.modal = "auth"; render(); return; }
  if (state.backend && state.user && state.profile?.must_change_password) { state.modal = "password-change"; render(); return; }
  if (!state.backend) {
    const o = { order_no: `LYV-DEMO-${Date.now().toString().slice(-6)}`, status: "preview only", total_amount: total(), created_at: new Date().toISOString(), address, demo: true };
    state.orders.unshift(o); state.orderResult = o; state.cart = []; state.coupon = null; state.couponFeedback = ""; state.pendingCheckout = false; saveStore(); state.modal = "success"; render(); return;
  }
  const items = activeCart().map((x) => ({ variant_id: x.variantId, quantity: Number(x.quantity) }));
  const { data, error } = await state.client.rpc("create_order", { p_items: items, p_address: address, p_coupon_code: state.coupon?.code || null });
  if (error) { toast(error.message.includes("stock") ? "That size has just sold out. Please review your bag." : error.message); return; }
  const o = Array.isArray(data) ? data[0] : data;
  state.orderResult = { order_no: o.order_no, status: o.status, total_amount: o.total_amount, id: o.id, demo: false };
  state.cart = []; state.coupon = null; state.couponFeedback = ""; state.pendingCheckout = false; state.modal = "success"; saveStore(); render();
}
async function applyCoupon() {
  const input = $("#coupon-code"); const code = String(input?.value || "").trim().toUpperCase(); if (!code) { state.couponFeedback = "Enter a coupon code first."; render(); return; }
  state.couponLoading = true; state.couponFeedback = "Checking that code…"; render();
  if (state.backend) {
    const { data, error } = await state.client.rpc("validate_coupon", { p_code: code, p_subtotal: subtotal() });
    state.couponLoading = false;
    if (error || !data?.valid) { state.coupon = null; state.couponFeedback = data?.message || error?.message || "That code isn’t available for this order."; render(); return; }
    state.coupon = { code, discount_amount: Number(data.discount_amount), coupon_id: data.coupon_id }; state.couponFeedback = `${code} is in. You saved ${money(data.discount_amount)}.`;
  } else {
    const c = demoCoupons[code]; state.couponLoading = false;
    if (!c || subtotal() < c.min_order) { state.coupon = null; state.couponFeedback = c ? `This code needs a ${money(c.min_order)} minimum order.` : "We couldn’t find that coupon."; render(); return; }
    const amount = Math.min(Math.round(subtotal() * c.discount_value / 100), c.max_discount || Infinity); state.coupon = { code, discount_amount: amount }; state.couponFeedback = `${code} is in. You saved ${money(amount)} in this preview.`;
  }
  render();
}
async function cancelOrder(id) {
  if (!state.client) return;
  const { error } = await state.client.rpc("cancel_order", { p_order_id: id });
  if (error) { toast(error.message); return; } toast("Your order cancellation was recorded."); state.loadingOrders = false; await loadCustomerOrders();
}
async function updateOrderStatus(id, status) {
  if (!status || !state.client) return;
  const { error } = await state.client.rpc("admin_update_order_status", { p_order_id: id, p_status: status });
  if (error) { toast(error.message); return; } toast("Order status updated."); state.adminLoaded = false; await loadAdminData();
}

function openCategoryForm(id = null) { state.editingId = id; state.modal = "admin-category"; state.authError = ""; render(); }
function openCouponForm(id = null) { state.editingId = id; state.modal = "admin-coupon"; state.authError = ""; render(); }
function openProductForm(id = null) { state.editingId = id; state.modal = "admin-product"; state.authError = ""; render(); }
function slugify(s) { return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function colorHex(name) {
  const c = { ivory: "#e9e2d4", natural: "#c5ae8a", sand: "#c4aa87", olive: "#68745b", ink: "#303630", sky: "#9eafbc", "dusty rose": "#bd9690", "washed denim": "#6e7e8a", charcoal: "#505450" };
  return c[String(name).toLowerCase()] || "#c5ae8a";
}
async function submitAdminProduct(form) {
  const fd = new FormData(form); const category = state.categories.find((c) => c.id === fd.get("category_id"));
  if (!category) { toast("Choose a category first."); return; }
  let variantRows;
  try {
    variantRows = String(fd.get("variants") || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).map((row) => {
      const [size, color, stock] = row.split("|").map((x) => x.trim());
      if (!size || !color || !Number.isInteger(Number(stock)) || Number(stock) < 0) throw new Error(`Each variant needs size | colour | whole-number stock. Check: ${row}`);
      return { size, color, color_hex: colorHex(color), stock: Number(stock) };
    });
  } catch (e) { toast(e.message); return; }
  if (!variantRows.length) { toast("Add at least one size, colour, and stock variant."); return; }
  const name = String(fd.get("name") || "").trim();
  const product = {
    ...(state.editingId ? { id: state.editingId } : {}), slug: slugify(name), name, category_id: category.id,
    price: Number(fd.get("price")), compare_at_price: fd.get("compare_at_price") ? Number(fd.get("compare_at_price")) : null,
    label: String(fd.get("label") || "").trim() || null, image_url: String(fd.get("image_url") || "").trim(),
    description: String(fd.get("description") || "").trim(), material: String(fd.get("material") || "").trim(), is_featured: fd.get("is_featured") === "on", is_active: true, sort_order: 50
  };
  if (!Number.isInteger(product.price) || product.price <= 0 || (product.compare_at_price && product.compare_at_price <= product.price)) { toast("Enter a positive price, and a compare-at price higher than the selling price."); return; }
  const { error } = await state.client.rpc("admin_save_product", { p_product: product, p_variants: variantRows });
  if (error) { toast(error.message); return; }
  state.modal = ""; state.adminLoaded = false; await loadCatalog(); await loadAdminData(); toast("Product saved.");
}
async function submitAdminCategory(form) {
  const fd = new FormData(form); const row = { name: String(fd.get("name") || "").trim(), slug: slugify(fd.get("slug")), description: String(fd.get("description") || "").trim(), is_active: true, sort_order: 50 };
  if (state.editingId) row.id = state.editingId;
  const { error } = await state.client.from("categories").upsert(row, { onConflict: "id" });
  if (error) { toast(error.message); return; }
  state.modal = ""; state.adminLoaded = false; await loadCatalog(); await loadAdminData(); toast("Category saved.");
}
async function submitAdminCoupon(form) {
  const fd = new FormData(form); const row = {
    code: String(fd.get("code") || "").trim().toUpperCase(), discount_type: fd.get("discount_type"), discount_value: Number(fd.get("discount_value")),
    min_order: Number(fd.get("min_order") || 0), max_discount: fd.get("max_discount") ? Number(fd.get("max_discount")) : null,
    max_redemptions: fd.get("max_redemptions") ? Number(fd.get("max_redemptions")) : null, is_active: fd.get("is_active") === "on"
  };
  if (state.editingId) row.id = state.editingId;
  const { error } = await state.client.from("coupons").upsert(row, { onConflict: "id" });
  if (error) { toast(error.message); return; }
  state.modal = ""; state.adminLoaded = false; await loadAdminData(); toast("Coupon saved.");
}
async function submitAdminContent(form) {
  const fd = new FormData(form); const content = { announcement: String(fd.get("announcement") || "").trim(), hero_eyebrow: String(fd.get("hero_eyebrow") || "").trim(), hero_heading: String(fd.get("hero_heading") || "").trim(), hero_copy: String(fd.get("hero_copy") || "").trim(), hero_image: String(fd.get("hero_image") || "").trim() };
  const { error } = await state.client.from("site_content").upsert({ id: 1, content }, { onConflict: "id" });
  if (error) { toast(error.message); return; }
  state.siteContent = content; state.admin.content = { id: 1, content }; render(); toast("Homepage content saved.");
}
async function submitAdminSettings(form) {
  const fd = new FormData(form); const settings = { id: 1, free_shipping_threshold: Number(fd.get("free_shipping_threshold")), shipping_fee: Number(fd.get("shipping_fee")) };
  if (settings.free_shipping_threshold < 0 || settings.shipping_fee < 0) { toast("Enter zero or a positive amount."); return; }
  const { error } = await state.client.from("store_settings").upsert(settings, { onConflict: "id" });
  if (error) { toast(error.message); return; }
  state.settings = settings; state.admin.settings = settings; render(); toast("Store settings saved.");
}

document.addEventListener("click", async (ev) => {
  const target = ev.target.closest("[data-action]"); if (!target) return;
  const action = target.dataset.action;
  if (action !== "overlay") ev.preventDefault();
  if (action === "home") { state.modal = ""; navigate("home"); }
  else if (action === "category") navigate("category", target.dataset.category || "all");
  else if (action === "search") { state.modal = "search"; state.drawer = ""; render(); setTimeout(() => $("[name=query]")?.focus(), 70); }
  else if (action === "wishlist") navigate("wishlist");
  else if (action === "orders") navigate("orders");
  else if (action === "admin") navigate("admin");
  else if (action === "account") { if (state.user) navigate("orders"); else { state.authMode = "login"; changeModal("auth"); } }
  else if (action === "auth") { state.authMode = "login"; changeModal("auth"); }
  else if (action === "auth-mode") { state.authMode = target.dataset.mode; state.authError = ""; state.authNotice = ""; render(); }
  else if (action === "signout") { if (state.client) await state.client.auth.signOut(); state.user = null; state.profile = null; state.modal = ""; state.adminLoaded = false; navigate("home"); toast("You’ve signed out."); }
  else if (action === "cart") { state.drawer = "cart"; state.modal = ""; render(); }
  else if (action === "close-drawer") { state.drawer = ""; render(); }
  else if (action === "overlay") { state.drawer = ""; state.modal = ""; render(); }
  else if (action === "close-modal") { state.modal = ""; render(); }
  else if (action === "mobile-menu") { state.mobileMenu = !state.mobileMenu; render(); }
  else if (action === "open-product") openProduct(target.dataset.id);
  else if (action === "toggle-wishlist") { const id = target.dataset.id; state.wishlist = state.wishlist.includes(id) ? state.wishlist.filter((x) => x !== id) : [...state.wishlist, id]; saveStore(); render(); toast(state.wishlist.includes(id) ? "Saved for a little later." : "Removed from your saved pieces."); }
  else if (action === "choose-size") { state.selectedSize = target.dataset.size; render(); }
  else if (action === "choose-color") { state.selectedColor = target.dataset.color; state.selectedSize = productSizes(getProduct(state.productId), state.selectedColor)[0] || "One size"; render(); }
  else if (action === "add-to-cart") addToCart(state.productId, state.selectedSize, state.selectedColor);
  else if (action === "quantity") cartChange(Number(target.dataset.index), Number(target.dataset.delta));
  else if (action === "remove-line") { const line = activeCart()[Number(target.dataset.index)]; if (line) state.cart = state.cart.filter((x) => !(x.productId === line.productId && x.size === line.size && x.color === line.color)); saveStore(); render(); }
  else if (action === "checkout") { if (!state.cart.length) { toast("Your bag is empty."); return; } state.drawer = ""; state.modal = "checkout"; state.couponFeedback = ""; render(); }
  else if (action === "apply-coupon") applyCoupon();
  else if (action === "filters") { state.filtersOpen = !state.filtersOpen; render(); }
  else if (action === "filter") { const f = target.dataset.filter; state.filters[f] = !state.filters[f]; render(); }
  else if (action === "clear-filters") { state.filters = { sale: false, inStock: false }; state.query = ""; if (state.view === "search") state.view = "category"; state.category = "all"; render(); }
  else if (action === "success-finish") { state.modal = ""; state.view = "home"; state.category = "all"; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (action === "cancel-order") await cancelOrder(target.dataset.id);
  else if (action === "admin-tab") { state.adminTab = target.dataset.tab; render(); }
  else if (action === "reload-admin") { state.adminLoaded = false; await loadAdminData(); }
  else if (action === "admin-new-product") openProductForm();
  else if (action === "admin-edit-product") openProductForm(target.dataset.id);
  else if (action === "admin-toggle-product") { const p = getProduct(target.dataset.id); const { error } = await state.client.from("products").update({ is_active: p?.isActive === false }).eq("id", target.dataset.id); if (error) toast(error.message); else { state.adminLoaded = false; await loadCatalog(); await loadAdminData(); toast("Product visibility updated."); } }
  else if (action === "admin-new-category") openCategoryForm();
  else if (action === "admin-edit-category") openCategoryForm(target.dataset.id);
  else if (action === "admin-new-coupon") openCouponForm();
  else if (action === "admin-edit-coupon") openCouponForm(target.dataset.id);
});

document.addEventListener("input", (ev) => {
  const el = ev.target;
  if (el.name && ["full_name", "phone", "email", "line1", "line2", "city", "state", "pincode", "note", "coupon"].includes(el.name)) state.checkoutData[el.name] = el.value;
});

document.addEventListener("change", async (ev) => {
  const el = ev.target;
  if (el.dataset.input === "sort") { state.sort = el.value; render(); }
  if (el.dataset.change === "order-status") await updateOrderStatus(el.dataset.id, el.value);
});

document.addEventListener("submit", async (ev) => {
  const form = ev.target.closest("form[data-form]"); if (!form) return;
  ev.preventDefault(); const kind = form.dataset.form;
  if (kind === "auth") await submitAuth(form);
  else if (kind === "password-change") await changeInitialPassword(form);
  else if (kind === "checkout") await submitCheckout(form);
  else if (kind === "search") { const fd = new FormData(form); state.modal = ""; navigate("search", "all", String(fd.get("query") || "").trim()); }
  else if (kind === "newsletter") { toast("Thanks for saying hello. We’ll see you around."); form.reset(); }
  else if (kind === "admin-product") await submitAdminProduct(form);
  else if (kind === "admin-category") await submitAdminCategory(form);
  else if (kind === "admin-coupon") await submitAdminCoupon(form);
  else if (kind === "admin-content") await submitAdminContent(form);
  else if (kind === "admin-settings") await submitAdminSettings(form);
});

window.addEventListener("hashchange", () => { parseRoute(); state.mobileMenu = false; render(); });
parseRoute(); render(); initBackend();
