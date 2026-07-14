// Данные о продуктах
const products = {
    pants: {
        name: 'Cargo Pants',
        category: 'Брюки',
        price: 5990,
        imageFront: 'img/bruky-myself.png',
        imageBack: null,
        desc: 'Свободные карго-брюки с несколькими карманами. Плотная ткань премиум-качества, удобная посадка для повседневного ношения.',
        sizes: ['S', 'M', 'L', 'XL', 'XXL']
    },
    longsleeve: {
        name: 'Oversize Longsleeve',
        category: 'Лонгслив',
        price: 3490,
        imageFront: 'img/longa-myself.png',
        imageBack: 'img/longb-myself.png',
        desc: 'Оверсайз лонгслив с уникальным дизайном. Мягкий хлопок, свободный крой. Идеален для создания многослойного образа.',
        sizes: ['S', 'M', 'L', 'XL']
    },
    tshirt: {
        name: 'Graphic Tee',
        category: 'Футболка',
        price: 2490,
        imageFront: 'img/Tshirt-myself.png',
        imageBack: null,
        desc: 'Футболка с авторским принтом. Плотный хлопок 100%, прямая посадка. Лимитированная серия.',
        sizes: ['S', 'M', 'L', 'XL', 'XXL']
    }
};


const CLOZLY_BASE_URL = 'https://clozly.ru/telegram-tryon.html?tryon_id=fdb721d1-719a-49ce-8fdc-4549b38a8ad5';

let cart = [];
let selectedSize = 'M';
let isModalBackView = false;

// Лоадер
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 2200);
});

// Кастомный курсор
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX - 10 + 'px';
    cursor.style.top = e.clientY - 10 + 'px';
});

document.querySelectorAll('a, button, .product-card, .nav-cart').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

// Скролл навбара
window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Мобильное меню
function toggleMobile() {
    document.getElementById('hamburger').classList.toggle('active');
    document.getElementById('mobileMenu').classList.toggle('active');
    document.body.style.overflow = document.getElementById('mobileMenu').classList.contains('active') ? 'hidden' : '';
}

// Корзина
function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
    document.getElementById('cartOverlay').classList.toggle('active');
    document.body.style.overflow = document.getElementById('cartSidebar').classList.contains('active') ? 'hidden' : '';
}

function addToCart(productId) {
    const product = products[productId];
    cart.push({
        id: productId + '_' + Date.now(),
        productId: productId,
        name: product.name,
        price: product.price,
        image: product.imageFront,
        size: selectedSize || 'M'
    });
    updateCart();
    showNotification(`${product.name} добавлен в корзину`);
    
    // Анимация счетчика
    const cartCount = document.getElementById('cartCount');
    cartCount.classList.add('active');
    setTimeout(() => cartCount.classList.remove('active'), 300);
}

function removeFromCart(cartId) {
    cart = cart.filter(item => item.id !== cartId);
    updateCart();
}

function updateCart() {
    const cartBody = document.getElementById('cartBody');
    const cartFooter = document.getElementById('cartFooter');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');

    cartCount.textContent = cart.length;
    if (cart.length > 0) {
        cartCount.classList.add('active');
    } else {
        cartCount.classList.remove('active');
    }

    if (cart.length === 0) {
        cartBody.innerHTML = `
            <div class="cart-empty">
                <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>
                <p>Корзина пуста</p>
            </div>`;
        cartFooter.style.display = 'none';
    } else {
        let html = '';
        let total = 0;
        cart.forEach(item => {
            total += item.price;
            html += `
                <div class="cart-item">
                    <img class="cart-item-img" src="${item.image}" alt="${item.name}">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">₽${item.price.toLocaleString()} · Размер: ${item.size}</div>
                        <button class="cart-item-remove" onclick="removeFromCart('${item.id}')">Удалить</button>
                    </div>
                </div>`;
        });
        cartBody.innerHTML = html;
        cartTotal.textContent = `₽${total.toLocaleString()}`;
        cartFooter.style.display = 'block';
    }
}

// Переключение вида лонгслива в карточке
function toggleLongsleeve(side) {
    const front = document.getElementById('lsCardFront');
    const back = document.getElementById('lsCardBack');
    const btnFront = document.getElementById('cardToggleFront');
    const btnBack = document.getElementById('cardToggleBack');

    if (side === 'back') {
        front.style.opacity = '0';
        back.style.opacity = '1';
        btnFront.classList.remove('active');
        btnBack.classList.add('active');
    } else {
        front.style.opacity = '1';
        back.style.opacity = '0';
        btnFront.classList.add('active');
        btnBack.classList.remove('active');
    }
}

// Модальное окно
function openModal(productId) {
    const product = products[productId];
    isModalBackView = false;

    document.getElementById('modalImgFront').src = product.imageFront;
    document.getElementById('modalImgFront').style.opacity = '1';
    document.getElementById('modalImgBack').style.opacity = '0';

    if (product.imageBack) {
        document.getElementById('modalImgBack').src = product.imageBack;
        document.getElementById('modalToggleWrap').style.display = 'flex';
        document.getElementById('modalTryon').checked = false;
    } else {
        document.getElementById('modalToggleWrap').style.display = 'none';
    }

    document.getElementById('modalCategory').textContent = product.category;
    document.getElementById('modalName').textContent = product.name;
    document.getElementById('modalPrice').textContent = `₽${product.price.toLocaleString()}`;
    document.getElementById('modalDesc').textContent = product.desc;

    const sizeOptions = document.getElementById('sizeOptions');
    sizeOptions.innerHTML = '';
    product.sizes.forEach(size => {
        const btn = document.createElement('button');
        btn.className = 'size-btn' + (size === 'M' ? ' active' : '');
        btn.textContent = size;
        btn.onclick = function() {
            sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedSize = size;
        };
        sizeOptions.appendChild(btn);
    });

    selectedSize = 'M';

    // Привязка добавления в корзину
    const addBtn = document.getElementById('modalAddCart');
    addBtn.onclick = function() {
        addToCart(productId);
        closeModalDirect();
    };

    // НАСТРОЙКА КНОПКИ ПРИМЕРКИ В МОДАЛЬНОМ ОКНЕ
    const tryOnBtn = document.getElementById('modalTryOnBtn');
    if (tryOnBtn) {
        tryOnBtn.onclick = function() {
            closeModalDirect(); // Сначала закрываем карточку товара
            openClozlyWidget(productId); // Открываем виджет Clozly
        };
    }

    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Вспомогательная функция для вызова примерки напрямую из карточек каталога
function tryOnDirect(productId) {
    openClozlyWidget(productId);
}

function toggleModalView(showBack) {
    const frontImg = document.getElementById('modalImgFront');
    const backImg = document.getElementById('modalImgBack');

    if (showBack) {
        frontImg.style.opacity = '0';
        backImg.style.opacity = '1';
        isModalBackView = true;
    } else {
        frontImg.style.opacity = '1';
        backImg.style.opacity = '0';
        isModalBackView = false;
    }
}

function closeModal(e) {
    if (e.target === document.getElementById('modalOverlay')) {
        closeModalDirect();
    }
}

function closeModalDirect() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
    isModalBackView = false;
}

// Оформление заказа
function checkout() {
    if (cart.length === 0) return;
    
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    showNotification(`Заказ оформлен на сумму ₽${total.toLocaleString()}! Спасибо за покупку!`);
    cart = [];
    updateCart();
    toggleCart();
}

// Уведомления
function showNotification(message) {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

// Подписка на рассылку
function handleSubscribe(e) {
    e.preventDefault();
    showNotification('Спасибо за подписку! Скидка 10% отправлена на ваш email.');
    e.target.reset();
}

// Анимация появления при скролле
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

// Управление с клавиатуры (Escape)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModalDirect();
        if (document.getElementById('cartSidebar').classList.contains('active')) {
            toggleCart();
        }
        if (document.getElementById('mobileMenu').classList.contains('active')) {
            toggleMobile();
        }
    }
});

function openClozlyWidget(productId) {
    if (productId == 'pants') {
        productId = 1;
    } else if (productId == 'longsleeve') {
        productId = 2;
    } else if (productId == 'tshirt') {
        productId = 3;
    }
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