const products = {
    1: {
        id: 1,
        name: 'Платье с бантами',
        category: 'Платья',
        price: 5990,
        priceFormatted: '5 990 ₽',
        desc: 'Воздушное платье в нежно-голубых и белых тонах с изящными бантами на бретелях. Идеально для летних прогулок и особых случаев.',
        image: 'https://1s4oyld5dc.ucarecd.net/e10711b4-4132-4e5f-8c00-eced7ac9b81b/',
        sizes: ['XS','S','M','L']
    },
    2: {
        id: 2,
        name: 'Лавандовый топ',
        category: 'Топы',
        price: 3490,
        priceFormatted: '3 490 ₽',
        desc: 'Нежный лавандовый топ с открытыми плечами и декоративными бантиками. Лёгкая ткань создаёт романтичный и женственный образ.',
        image: 'https://1s4oyld5dc.ucarecd.net/8256e48a-9713-497d-85e3-8874378bf41d/',
        sizes: ['XS','S','M','L','XL']
    },
    3: {
        id: 3,
        name: 'Джинсы со звёздами',
        category: 'Джинсы',
        price: 4990,
        priceFormatted: '4 990 ₽',
        desc: 'Чёрные джинсы с объёмными розовыми звёздами и розовым ремнём. Уникальный дизайн для тех, кто любит выделяться.',
        image: 'https://1s4oyld5dc.ucarecd.net/4584a854-9c97-44e9-a9b4-fd8ea9d41cf7/',
        sizes: ['XS','S','M','L']
    }
};

const CLOZLY_BASE_URL = 'https://clozly.ru/telegram-tryon.html?tryon_id=a67cc466-ba57-4ab2-93d0-9852dbba0b69';

let cart = [];
let currentModalProduct = null;
let selectedModalSize = null;

try {
    const savedCart = localStorage.getItem('a10_cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
} catch (e) {
    cart = [];
}

function hideLoader() {
    var loader = document.getElementById('loader');
    if (loader && !loader.classList.contains('hidden')) {
        setTimeout(function() {
            loader.classList.add('hidden');
            document.getElementById('heroText').classList.add('show');
            document.getElementById('heroScroll').classList.add('show');
        }, 1200);
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    hideLoader();
} else {
    document.addEventListener('DOMContentLoaded', hideLoader);
}
setTimeout(hideLoader, 3000);

window.addEventListener('scroll', function() {
    var nav = document.getElementById('nav');
    var backToTop = document.getElementById('backToTop');
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
    if (window.scrollY > 500) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
});

var menuToggle = document.getElementById('menuToggle');
var navLinks = document.getElementById('navLinks');
if (menuToggle) {
    menuToggle.addEventListener('click', function() {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('open');
    });
}
if (navLinks) {
    navLinks.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('open');
        });
    });
}

var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.fade-in, .product-card').forEach(function(el) {
    observer.observe(el);
});

var counterObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
        if (entry.isIntersecting) {
            var counters = entry.target.querySelectorAll('.stat-number');
            counters.forEach(function(counter) {
                var target = parseInt(counter.getAttribute('data-count'));
                var current = 0;
                var increment = target / 60;
                var timer = setInterval(function() {
                    current += increment;
                    if (current >= target) {
                        counter.textContent = target;
                        clearInterval(timer);
                    } else {
                        counter.textContent = Math.floor(current);
                    }
                }, 30);
            });
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

var aboutStats = document.querySelector('.about-stats');
if (aboutStats) counterObserver.observe(aboutStats);

document.querySelectorAll('.product-card').forEach(function(card) {
    card.addEventListener('click', function(e) {
        if (e.target.closest('.try-on-btn')) return;
        var productId = card.getAttribute('data-product');
        openModal(productId);
    });
});

function openModal(productId) {
    var product = products[productId];
    if (!product) return;
    currentModalProduct = product;

    document.getElementById('modalImage').src = product.image;
    document.getElementById('modalImage').alt = product.name;
    document.getElementById('modalCategory').textContent = product.category;
    document.getElementById('modalName').textContent = product.name;
    document.getElementById('modalPrice').textContent = product.priceFormatted;
    document.getElementById('modalDesc').textContent = product.desc;

    var sizesContainer = document.getElementById('modalSizes');
    sizesContainer.innerHTML = '';
    product.sizes.forEach(function(size, i) {
        var btn = document.createElement('button');
        btn.className = 'modal-size-btn' + (i === 0 ? ' active' : '');
        btn.textContent = size;
        btn.setAttribute('type', 'button');
        btn.onclick = function() {
            sizesContainer.querySelectorAll('.modal-size-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            selectedModalSize = size;
        };
        sizesContainer.appendChild(btn);
    });
    selectedModalSize = product.sizes[0];

    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
});

document.getElementById('modalAddBtn').addEventListener('click', function() {
    if (currentModalProduct && selectedModalSize) {
        addToCart(currentModalProduct, selectedModalSize);
        var btn = this;
        btn.textContent = '✓ Добавлено в корзину';
        btn.style.background = '#2ecc71';
        setTimeout(function() {
            btn.textContent = 'Добавить в корзину';
            btn.style.background = '';
            closeModal();
            openCart();
        }, 1000);
    }
});

document.getElementById('modalTryOnBtn').addEventListener('click', function() {
    if (currentModalProduct) {
        closeModal();
        openClozlyWidget(currentModalProduct.id);
    }
});

function saveCart() {
    try {
        localStorage.setItem('a10_cart', JSON.stringify(cart));
    } catch (e) {}
}

function addToCart(product, size) {
    var existing = cart.find(function(item) {
        return item.id === product.id && item.size === size;
    });

    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            priceFormatted: product.priceFormatted,
            image: product.image,
            size: size,
            qty: 1
        });
    }

    saveCart();
    updateCartUI();
    showToast('success', '✓ ' + product.name + ' добавлен в корзину');
}

function removeFromCart(index) {
    var item = cart[index];
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
    showToast('info', 'Товар удалён из корзины');
}

function updateCartUI() {
    var countEl = document.getElementById('cartCount');
    var itemsList = document.getElementById('cartItemsList');
    var totalEl = document.getElementById('cartTotalValue');
    var checkoutBtn = document.getElementById('cartCheckoutBtn');

    var totalQty = 0;
    var totalPrice = 0;

    cart.forEach(function(item) {
        totalQty += item.qty;
        totalPrice += item.price * item.qty;
    });

    countEl.textContent = totalQty;
    if (totalQty > 0) {
        countEl.classList.add('active');
    } else {
        countEl.classList.remove('active');
    }

    totalEl.textContent = totalPrice.toLocaleString('ru-RU') + ' ₽';
    checkoutBtn.disabled = cart.length === 0;

    if (cart.length === 0) {
        itemsList.innerHTML = '<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg><p>Корзина пуста</p><small>Добавьте товары из каталога</small></div>';
        return;
    }

    itemsList.innerHTML = cart.map(function(item, index) {
        return '<div class="cart-item">' +
            '<img src="' + item.image + '" alt="' + item.name + '" class="cart-item-img">' +
            '<div class="cart-item-info">' +
                '<h4>' + item.name + '</h4>' +
                '<p>Размер: ' + item.size + ' · Кол-во: ' + item.qty + '</p>' +
                '<div class="cart-item-price">' + (item.price * item.qty).toLocaleString('ru-RU') + ' ₽</div>' +
            '</div>' +
            '<button class="cart-item-remove" onclick="removeFromCart(' + index + ')" aria-label="Удалить">✕</button>' +
        '</div>';
    }).join('');
}

function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('navCartBtn').addEventListener('click', openCart);
document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);

document.getElementById('cartCheckoutBtn').addEventListener('click', function() {
    if (cart.length === 0) return;
    var total = cart.reduce(function(sum, item) {
        return sum + (item.price * item.qty);
    }, 0);
    showToast('success', '✓ Заказ на ' + total.toLocaleString('ru-RU') + ' ₽ оформлен!');
    cart = [];
    saveCart();
    updateCartUI();
    setTimeout(closeCart, 1500);
});

function tryOn(productId) {
    var product = products[productId];
    if (product) {
        openClozlyWidget(productId);
    }
}

function showToast(type, message) {
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;

    var icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';

    toast.innerHTML = '<div class="toast-icon">' + icon + '</div>' +
        '<div class="toast-message">' + message + '</div>' +
        '<button class="toast-close" aria-label="Закрыть">✕</button>';

    toast.querySelector('.toast-close').addEventListener('click', function() {
        removeToast(toast);
    });

    container.appendChild(toast);

    setTimeout(function() {
        removeToast(toast);
    }, 3500);
}

function removeToast(toast) {
    if (!toast || toast.classList.contains('hiding')) return;
    toast.classList.add('hiding');
    setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
}

function handleSubscribe(e) {
    e.preventDefault();
    var btn = e.target.querySelector('button');
    var input = e.target.querySelector('input');
    var email = input.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('error', 'Введите корректный email');
        return;
    }

    var originalText = btn.textContent;
    btn.textContent = 'Отправка...';
    btn.disabled = true;

    setTimeout(function() {
        showToast('success', '✓ Вы успешно подписаны на рассылку!');
        input.value = '';
        btn.textContent = originalText;
        btn.disabled = false;
    }, 1200);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
        closeCart();
        closeClozlyWidget();
    }
});

updateCartUI();

function openClozlyWidget(productId) {
    var wrapper = document.getElementById('clozly-preview-wrapper');
    var iframe = document.getElementById('tryon-preview-iframe');
    
    if (wrapper && iframe) {
        iframe.src = CLOZLY_BASE_URL + '&sku=' + productId;
        wrapper.style.display = 'flex'; 
    }
}

function closeClozlyWidget() {
    var wrapper = document.getElementById('clozly-preview-wrapper');
    var iframe = document.getElementById('tryon-preview-iframe');
    
    if (wrapper) wrapper.style.display = 'none';
    if (iframe) iframe.src = 'about:blank';
}