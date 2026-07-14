// ==================== DATA ====================
var productsData = [
{
id: 1,
name: 'Футболка Oversize',
category: 'Футболки',
price: 2990,
oldPrice: 3990,
image: 'img/Tshirtzevra.jpg',
desc: 'Оверсайз футболка из плотного хлопка 240 г/м². Минималистичный дизайн с фирменным логотипом ZEVRA. Идеальная база для любого образа. Свободный крой, который сидит на каждом.',
sizes: ['S', 'M', 'L', 'XL', 'XXL'],
tag: 'Хит'
},
{
id: 2,
name: 'Рубашка Casual',
category: 'Рубашки',
price: 4490,
oldPrice: null,
image: 'img/Shirtzevra.jpg',
desc: 'Стильная рубашка из качественной ткани. Утончённый крой, который подходит как для повседневных образов, так и для более формальных ситуаций. Натуральный состав, приятная к телу.',
sizes: ['S', 'M', 'L', 'XL'],
tag: 'New'
},
{
id: 3,
name: 'Кофта Hoodie',
category: 'Кофты',
price: 5490,
oldPrice: 6990,
image: 'img/Hoodiezevra.jpg',
desc: 'Тёплый худи из флиса плотностью 320 г/м². Двойной капюшон, карман-кенгуру, усиленные манжеты. Обязательный элемент гардероба для холодного сезона.',
sizes: ['S', 'M', 'L', 'XL', 'XXL'],
tag: 'Limited'
}
];
// ==================== STATE ====================
var cart = [];
var modalSelectedSize = null;
var currentModalProductId = null;
const CLOZLY_BASE_URL = 'https://clozly.ru/telegram-tryon.html?tryon_id=04cc129b-3d16-4a99-8554-6d1eb629d0e3';
// ==================== DOM REFS ====================
var preloader = document.getElementById('preloader');
var cursor = document.getElementById('cursor');
var header = document.getElementById('header');
var cartBtn = document.getElementById('cartBtn');
var cartCount = document.getElementById('cartCount');
var cartOverlay = document.getElementById('cartOverlay');
var cartSidebar = document.getElementById('cartSidebar');
var cartClose = document.getElementById('cartClose');
var cartItemsEl = document.getElementById('cartItems');
var cartEmpty = document.getElementById('cartEmpty');
var cartFooter = document.getElementById('cartFooter');
var cartTotal = document.getElementById('cartTotal');
var checkoutBtn = document.getElementById('checkoutBtn');
var menuToggle = document.getElementById('menuToggle');
var mobileMenu = document.getElementById('mobileMenu');
var modalOverlay = document.getElementById('modalOverlay');
var modalClose = document.getElementById('modalClose');
var toast = document.getElementById('toast');
var toastText = document.getElementById('toastText');
var newsletterForm = document.getElementById('newsletterForm');
var productsGrid = document.getElementById('productsGrid');
// ==================== PRELOADER ====================
window.addEventListener('load', function() {
setTimeout(function() {
preloader.classList.add('hidden');
}, 1500);
});
// ==================== CUSTOM CURSOR ====================
document.addEventListener('mousemove', function(e) {
cursor.style.left = (e.clientX - 10) + 'px';
cursor.style.top = (e.clientY - 10) + 'px';
});
function addCursorHover(el) {
el.addEventListener('mouseenter', function() { cursor.classList.add('active'); });
el.addEventListener('mouseleave', function() { cursor.classList.remove('active'); });
}
// ==================== HEADER SCROLL ====================
window.addEventListener('scroll', function() {
if (window.scrollY > 80) {
header.classList.add('scrolled');
} else {
header.classList.remove('scrolled');
}
});
// ==================== MOBILE MENU ====================
menuToggle.addEventListener('click', function() {
menuToggle.classList.toggle('active');
mobileMenu.classList.toggle('active');
document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
});
var mobileLinks = document.querySelectorAll('.mobile-link');
for (var i = 0; i < mobileLinks.length; i++) {
mobileLinks[i].addEventListener('click', function() {
menuToggle.classList.remove('active');
mobileMenu.classList.remove('active');
document.body.style.overflow = '';
});
}
// ==================== REVEAL ANIMATIONS ====================
var revealElements = document.querySelectorAll('.reveal');
var revealObserver = new IntersectionObserver(function(entries) {
entries.forEach(function(entry) {
if (entry.isIntersecting) {
entry.target.classList.add('visible');
}
});
}, { threshold: 0.1 });
revealElements.forEach(function(el) {
revealObserver.observe(el);
});
// ==================== RENDER PRODUCTS ====================
function renderProducts() {
var html = '';
productsData.forEach(function(product) {
var tagClass = '';
if (product.tag === 'New') tagClass = 'new';
else if (product.tag === 'Limited') tagClass = 'limited';
else if (product.tag === 'Хит') tagClass = 'bestseller';
html += '<div class="product-card reveal" data-product-id="' + product.id + '" onclick="openModal(' + product.id + ')">';
html += '  <div class="product-image-wrap">';
html += '    <img src="' + product.image + '" alt="' + product.name + '" loading="lazy">';
html += '    <div class="product-overlay"></div>';
html += '    <div class="product-tag ' + tagClass + '">' + product.tag + '</div>';
html += '    <div class="product-bottom-overlay">';
html += '       <button class="try-online-btn" onclick="event.stopPropagation(); openClozlyWidget(' + product.id + ')">Примерить онлайн</button>';
html += '    </div>';
html += '  </div>';
html += '  <div class="product-info">';
html += '    <div class="product-category">' + product.category + '</div>';
html += '    <div class="product-name">' + product.name + '</div>';
html += '    <div class="product-price">';
html += '      <span class="price-current">' + product.price.toLocaleString('ru-RU') + ' ₽</span>';
if (product.oldPrice) {
html += '      <span class="price-old">' + product.oldPrice.toLocaleString('ru-RU') + ' ₽</span>';
}
html += '    </div>';
html += '    <div class="product-sizes">';
product.sizes.forEach(function(sz) {
html += '      <button class="size-option" onclick="event.stopPropagation(); selectCardSize(this);">' + sz + '</button>';
});
html += '    </div>';
html += '  </div>';
html += '</div>';
});
productsGrid.innerHTML = html;
// Re-observe
document.querySelectorAll('.product-card.reveal').forEach(function(el) {
addCursorHover(el);
revealObserver.observe(el);
});
}
renderProducts();
// ==================== CARD SIZE SELECTION ====================
function selectCardSize(btn) {
    var parent = btn.closest('.product-sizes');
    var siblings = parent.querySelectorAll('.size-option');
    siblings.forEach(function(s) { s.classList.remove('active'); });
    btn.classList.add('active');
}
// ==================== MODAL ====================
function openModal(productId) {
    var product = null;
    for (var i = 0; i < productsData.length; i++) {
        if (productsData[i].id === productId) {
            product = productsData[i];
            break;
        }
    }
    if (!product) return;
    currentModalProductId = productId;
    modalSelectedSize = product.sizes[Math.min(1, product.sizes.length - 1)];
    document.getElementById('modalImg').src = product.image;
    document.getElementById('modalImg').alt = product.name;
    document.getElementById('modalCategory').textContent = product.category;
    document.getElementById('modalName').textContent = product.name;
    document.getElementById('modalPrice').textContent = product.price.toLocaleString('ru-RU') + ' ₽';
    var oldPriceEl = document.getElementById('modalPriceOld');
    if (product.oldPrice) {
        oldPriceEl.textContent = product.oldPrice.toLocaleString('ru-RU') + ' ₽';
        oldPriceEl.style.display = 'inline';
    } else {
        oldPriceEl.style.display = 'none';
    }
    document.getElementById('modalDesc').textContent = product.desc;
    var modalTag = document.getElementById('modalTag');
    modalTag.textContent = product.tag;
    modalTag.style.display = product.tag ? 'block' : 'none';
    var sizesContainer = document.getElementById('modalSizes');
    var sizesHtml = '';
    product.sizes.forEach(function(sz) {
        var selectedClass = sz === modalSelectedSize ? ' selected' : '';
        sizesHtml += '<button class="modal-size-btn' + selectedClass + '" onclick="selectModalSize(\'' + sz + '\', this)">' + sz + '</button>';
    });
    sizesContainer.innerHTML = sizesHtml;
    document.getElementById('modalAddBtn').onclick = function() {
        if (!modalSelectedSize) {
            showToast('Пожалуйста, выберите размер');
            return;
        }
        addToCart(productId, modalSelectedSize);
        closeModal();
    };
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    var modalTryBtn = document.querySelector('.modal-try-btn');
    if (modalTryBtn) {
        modalTryBtn.onclick = function() {
            openClozlyWidget(productId);
        };
    }
}

function selectModalSize(size, btn) {
modalSelectedSize = size;
var allBtns = document.querySelectorAll('.modal-size-btn');
allBtns.forEach(function(b) { b.classList.remove('selected'); });
btn.classList.add('selected');
}
function closeModal() {
modalOverlay.classList.remove('active');
document.body.style.overflow = '';
}
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', function(e) {
if (e.target === modalOverlay) closeModal();
});
// ==================== CART ====================
function addToCart(productId, size) {
var product = null;
for (var i = 0; i < productsData.length; i++) {
if (productsData[i].id === productId) {
product = productsData[i];
break;
}
}
if (!product) return;
var found = false;
for (var j = 0; j < cart.length; j++) {
if (cart[j].id === productId && cart[j].size === size) {
cart[j].qty += 1;
found = true;
break;
}
}
if (!found) {
cart.push({
id: product.id,
name: product.name,
price: product.price,
image: product.image,
size: size,
qty: 1
});
}
updateCartUI();
showToast(product.name + ' (' + size + ') добавлен в корзину');
}
function removeFromCart(index) {
cart.splice(index, 1);
updateCartUI();
}
function updateQty(index, delta) {
cart[index].qty += delta;
if (cart[index].qty <= 0) {
cart.splice(index, 1);
}
updateCartUI();
}
function updateCartUI() {
var totalItems = 0;
var totalPrice = 0;
for (var i = 0; i < cart.length; i++) {
totalItems += cart[i].qty;
totalPrice += cart[i].price * cart[i].qty;
}
cartCount.textContent = totalItems;
if (totalItems > 0) {
cartCount.classList.add('visible');
} else {
cartCount.classList.remove('visible');
}
cartTotal.textContent = totalPrice.toLocaleString('ru-RU') + ' ₽';
if (cart.length === 0) {
cartFooter.style.display = 'none';
cartItemsEl.innerHTML = '<div class="cart-empty" id="cartEmpty"><svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg><p>Корзина пуста</p><span style="font-size:0.85rem; color: var(--gray);">Добавьте товары из каталога</span></div>';
} else {
cartFooter.style.display = 'block';
var itemsHtml = '';
for (var k = 0; k < cart.length; k++) {
var item = cart[k];
itemsHtml += '<div class="cart-item">';
itemsHtml += '  <img class="cart-item-img" src="' + item.image + '" alt="' + item.name + '">';
itemsHtml += '  <div class="cart-item-details">';
itemsHtml += '    <div class="cart-item-name">' + item.name + '</div>';
itemsHtml += '    <div class="cart-item-size">Размер: ' + item.size + '</div>';
itemsHtml += '    <div class="cart-item-bottom">';
itemsHtml += '      <div class="qty-control">';
itemsHtml += '        <button class="qty-btn" onclick="updateQty(' + k + ', -1)">−</button>';
itemsHtml += '        <span class="qty-value">' + item.qty + '</span>';
itemsHtml += '        <button class="qty-btn" onclick="updateQty(' + k + ', 1)">+</button>';
itemsHtml += '      </div>';
itemsHtml += '      <div class="cart-item-price">' + (item.price * item.qty).toLocaleString('ru-RU') + ' ₽</div>';
itemsHtml += '    </div>';
itemsHtml += '    <button class="cart-item-remove" onclick="removeFromCart(' + k + ')">Удалить</button>';
itemsHtml += '  </div>';
itemsHtml += '</div>';
}
cartItemsEl.innerHTML = itemsHtml;
}
}
// ==================== CART SIDEBAR TOGGLE ====================
function openCart() {
cartOverlay.classList.add('active');
cartSidebar.classList.add('active');
document.body.style.overflow = 'hidden';
}
function closeCart() {
cartOverlay.classList.remove('active');
cartSidebar.classList.remove('active');
document.body.style.overflow = '';
}
cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
// ==================== CHECKOUT ====================
checkoutBtn.addEventListener('click', function() {
if (cart.length === 0) {
showToast('Корзина пуста!');
return;
}
var totalPrice = 0;
for (var i = 0; i < cart.length; i++) {
totalPrice += cart[i].price * cart[i].qty;
}
showToast('Заказ на ' + totalPrice.toLocaleString('ru-RU') + ' ₽ оформлен! Спасибо!');
cart = [];
updateCartUI();
closeCart();
});
// ==================== TOAST ====================
function showToast(message) {
toastText.textContent = message;
toast.classList.add('show');
setTimeout(function() {
toast.classList.remove('show');
}, 3000);
}
// ==================== NEWSLETTER ====================
newsletterForm.addEventListener('submit', function(e) {
e.preventDefault();
var emailInput = document.getElementById('newsletterEmail');
if (emailInput.value) {
showToast('Вы подписаны на рассылку: ' + emailInput.value);
emailInput.value = '';
}
});
// ==================== KEYBOARD ====================
document.addEventListener('keydown', function(e) {
if (e.key === 'Escape') {
closeModal();
closeCart();
if (mobileMenu.classList.contains('active')) {
menuToggle.classList.remove('active');
mobileMenu.classList.remove('active');
document.body.style.overflow = '';
}
}
});
// ==================== SMOOTH SCROLL ====================
var anchors = document.querySelectorAll('a[href^="#"]');
for (var a = 0; a < anchors.length; a++) {
anchors[a].addEventListener('click', function(e) {
e.preventDefault();
var targetId = this.getAttribute('href').substring(1);
var targetEl = document.getElementById(targetId);
if (targetEl) {
targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
});
}
// ==================== ADD CURSOR HOVERS ====================
var allInteractive = document.querySelectorAll('a, button, .product-card, .size-option, .modal-size-btn');
allInteractive.forEach(function(el) {
addCursorHover(el);
});

function openClozlyWidget(productId) {
    var wrapper = document.getElementById('clozly-preview-wrapper');
    var iframe = document.getElementById('tryon-preview-iframe');
    
    if (wrapper && iframe) {
        // Подставляем твой tryon_id и id товара вместо sku
        iframe.src = CLOZLY_BASE_URL + '&sku=' + productId;
        wrapper.style.display = 'block';
    }
}

// ==================== CLOZLY INTEGRATION ====================
function openClozlyWidget(productId) {
    var wrapper = document.getElementById('clozly-preview-wrapper');
    var iframe = document.getElementById('tryon-preview-iframe');
    
    if (wrapper && iframe) {
        iframe.src = CLOZLY_BASE_URL + '&sku=' + productId;
        
        // Используем flex, чтобы сработало наше центрирование на мобилке
        wrapper.style.display = 'flex'; 
    }
}

function closeClozlyWidget() {
    var wrapper = document.getElementById('clozly-preview-wrapper');
    var iframe = document.getElementById('tryon-preview-iframe');
    
    if (wrapper) wrapper.style.display = 'none';
    if (iframe) iframe.src = 'about:blank'; // Очищаем iframe при закрытии
}

// Добавим закрытие по кнопке Escape для удобства ПК-пользователей
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeClozlyWidget();
    }
});

