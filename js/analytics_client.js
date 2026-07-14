// js/analytics_client.js

// Предполагаем, что apiRequest и getAuthData импортируются из utils.js
import { apiRequest, getAuthData } from './utils.js'; 
// Предполагаем, что Chart.js подключен

// Базовый URL, который должен соответствовать API_BASE_URL в utils.js
const API_BASE_URL = 'https://clozly.ru';

let productTryonChart = null; // Экземпляр Chart.js для графика товара
let currentProductId = null; // Текущий ID товара для графика
let userTryonChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // ⭐ ВЫЗОВ: Загрузка основных данных и списка товаров для статистики при старте
    loadAnalytics();
    setCustomDateDefaults();
    loadAverageGenerationsPerUser();

    const productPeriodSelect = document.getElementById('chart-period-select');
    const productCustomDateControls = document.getElementById('product-custom-date-controls');
    const productApplyDateBtn = document.getElementById('user1-apply-date-btn');
    const userCustomDateControls = document.getElementById('user-custom-date-controls'); 
    const userStartDateInput = document.getElementById('user-start-date');
    const userEndDateInput = document.getElementById('user-end-date');
    const userChartPeriodSelect = document.getElementById('user-chart-period-select');
    const userApplyDateBtn = document.getElementById('user-products-apply-date-btn');
    const modal = document.getElementById('image-viewer-modal');
    const closeBtn = document.getElementById('close-viewer');

    // ==========================================
    // ЛОГИКА УПРАВЛЕНИЯ ПРОБНЫМ ПЕРИОДОМ
    // ==========================================
    const trialBlock = document.getElementById('trial-promo-block');
    const trialOfferState = document.getElementById('trial-offer-state');
    const trialActiveState = document.getElementById('trial-active-state');
    const trialActivateBtn = document.getElementById('trial-activate-btn');
    const trialRefuseBtn = document.getElementById('trial-refuse-btn');
    const trialCountdownTimer = document.getElementById('trial-countdown-timer');
    const trialGensCount = document.getElementById('trial-gens-count');
    
    let timerInterval = null;

    // Функция обновления таймера каждую минуту/секунду
    function startTrialCountdown(expiresAtIsoString) {
        if (timerInterval) clearInterval(timerInterval);
        
        const targetDate = new Date(expiresAtIsoString);

        function updateTimer() {
            const now = new Date();
            const timeDiff = targetDate - now;

            if (timeDiff <= 0) {
                clearInterval(timerInterval);
                trialBlock.classList.add('hidden'); // Скрываем блок, если триал истек
                return;
            }

            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

            // Форматируем красивый вывод
            const dText = days > 0 ? `${days}д ` : '';
            const hText = String(hours).padStart(2, '0') + 'ч ';
            const mText = String(minutes).padStart(2, '0') + 'м';

            trialCountdownTimer.textContent = `${dText}${hText}${mText}`;
        }

        updateTimer();
        timerInterval = setInterval(updateTimer, 60000); // Обновляем раз в минуту
    }

    // Проверка статуса триала при загрузке страницы
    async function checkTrialStatus() {
        try {
            // Используем готовую функцию apiRequest из твоего utils.js
            const response = await apiRequest('GET', '/api/user/trial-status');
            
            if (response && response.success && response.trial) {
                const { hasTrial, canActivate, generationsLeft, expiresAt } = response.trial;

                if (hasTrial) {
                    // Исход 1: Триал уже идет
                    trialGensCount.textContent = generationsLeft;
                    trialOfferState.classList.add('hidden');
                    trialActiveState.classList.remove('hidden');
                    trialBlock.classList.remove('hidden');
                    startTrialCountdown(expiresAt);
                } else if (canActivate) {
                    // Исход 2: Баннер еще не показывался и триал доступен
                    trialActiveState.classList.add('hidden');
                    trialOfferState.classList.remove('hidden');
                    trialBlock.classList.remove('hidden');
                } else {
                    // Исход 3: Юзер уже отказался или использовал триал раньше
                    trialBlock.classList.add('hidden');
                }
            }
        } catch (err) {
            console.error('Ошибка проверки статуса пробного периода:', err);
        }
    }

    // Обработчик кнопки "Активировать"
    if (trialActivateBtn) {
        trialActivateBtn.addEventListener('click', async () => {
            trialActivateBtn.disabled = true;
            trialActivateBtn.textContent = 'Подключение...';
            try {
                const res = await apiRequest('POST', '/api/user/activate-trial');
                if (res && res.success) {
                    // Включаем CSS-анимацию переключения состояний
                    trialOfferState.style.opacity = '0';
                    setTimeout(() => {
                        trialOfferState.classList.add('hidden');
                        trialGensCount.textContent = res.generationsLeft;
                        
                        // Показываем блок с таймером
                        trialActiveState.style.opacity = '0';
                        trialActiveState.classList.remove('hidden');
                        // Небольшой reflow для анимации
                        setTimeout(() => { trialActiveState.style.opacity = '1'; }, 50);
                        
                        startTrialCountdown(res.expiresAt);
                    }, 300);
                } else {
                    alert(res.error || 'Не удалось активировать пробный период.');
                    trialActivateBtn.disabled = false;
                    trialActivateBtn.textContent = 'Активировать';
                }
            } catch (err) {
                console.error(err);
                alert('Произошла ошибка при отправке запроса.');
                trialActivateBtn.disabled = false;
                trialActivateBtn.textContent = 'Активировать';
            }
        });
    }

    // Обработчик кнопки отмены (крестика)
    if (trialRefuseBtn) {
        trialRefuseBtn.addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите скрыть это предложение? Повторно активировать пробный период будет невозможно.')) {
                try {
                    const res = await apiRequest('POST', '/api/user/refuse-trial');
                    if (res && res.success) {
                        // Плавно скрываем весь блок
                        trialBlock.style.opacity = '0';
                        trialBlock.style.transform = 'translateY(-10px)';
                        setTimeout(() => {
                            trialBlock.classList.add('hidden');
                        }, 400);
                    }
                } catch (err) {
                    console.error('Не удалось сохранить отказ от триала:', err);
                }
            }
        });
    }

    // Запускаем первичную проверку при инициализации страницы
    checkTrialStatus();


    // 1. Закрытие по крестику
    closeBtn.onclick = closePhotoViewer;

    // 2. Закрытие по клику на фон (за пределы изображения)
    modal.onclick = (e) => {
        if (e.target === modal) {
            closePhotoViewer();
        }
    };
window.openPhotoModal = function(url) {
    const modal = document.getElementById('image-viewer-modal');
    const fullImg = document.getElementById('full-res-image');
    
    if (fullImg && modal) {
        fullImg.src = url;
        modal.style.display = 'flex'; // Показываем
        modal.classList.add('open'); // Для совместимости с вашими стилями
        document.body.style.overflow = 'hidden';
    }
};
    // 3. Закрытие по кнопке Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closePhotoViewer();
        }
    });
    if (userChartPeriodSelect) {
        const initialPeriod = userChartPeriodSelect.value || '6month';
        loadUserTryonStats(initialPeriod);

        // ⭐ ДОБАВЛЕНИЕ ПРОВЕРКИ ПРИ ЗАГРУЗКЕ
        if (userChartPeriodSelect.value === 'custom' && userCustomDateControls) {
            userCustomDateControls.style.display = 'block';
        }

        // ⭐ ИСПРАВЛЕННЫЙ СЛУШАТЕЛЬ ДЛЯ СМЕНЫ ПЕРИОДА
        userChartPeriodSelect.addEventListener('change', (event) => {
            const period = event.target.value;
            if (period === 'custom') {
                if (userCustomDateControls) userCustomDateControls.style.display = 'block';
                // При 'custom' не загружаем сразу, ждем нажатия кнопки "Применить"
            } else {
                if (userCustomDateControls) userCustomDateControls.style.display = 'none';
                loadUserTryonStats(period); 
            }
        });
    }

    if (productApplyDateBtn) {
        productApplyDateBtn.addEventListener('click', () => loadProductTryonChart());
    }
    if (userApplyDateBtn) {
        userApplyDateBtn.addEventListener('click', () => {
            // ИСПРАВЛЕНИЕ: Вызываем загрузку статистики ПОЛЬЗОВАТЕЛЯ
            loadUserTryonStats('custom'); 
        });
    }

// Инициализация слушателей для навигации
document.getElementById('show-stats-btn').addEventListener('click', () => {
    switchSection('statistics-section', 'show-stats-btn'); 

    // 1. Находим элементы
    const chartCard = document.getElementById('user-tryon-stats-container');
    const topProductsSection = document.querySelector('.section-container');
    const mainCard = document.querySelector('.main-card'); // Общий родитель

    if (chartCard && topProductsSection && mainCard) {
        topProductsSection.style.display = 'block';

        // 2. Создаем или находим контейнер-ряд
        let rowWrapper = document.getElementById('chart-top-row-wrapper');
        if (!rowWrapper) {
            rowWrapper = document.createElement('div');
            rowWrapper.id = 'chart-top-row-wrapper';
            // Вставляем его перед графиком в DOM
            chartCard.parentNode.insertBefore(rowWrapper, chartCard);
        }

        // Переносим элементы внутрь нашей обертки
        rowWrapper.appendChild(chartCard);
        rowWrapper.appendChild(topProductsSection);

        // Очищаем инлайн-стили ширины и flex, которые могли быть добавлены ранее,
        // чтобы управление полностью перешло к CSS
        chartCard.style.width = '';
        chartCard.style.flex = '';
        chartCard.style.margin = '';
        
        topProductsSection.style.width = '';
        topProductsSection.style.flex = '';
        topProductsSection.style.margin = '';
    }

    loadProductsForStats(); 
    loadTopProducts();

    // 7. ПЕРЕРИСОВКА (Важно: Chart.js должен узнать о новой ширине)
    if (userTryonChart) {
        setTimeout(() => {
            userTryonChart.resize();
        }, 150); // Даем время браузеру пересчитать размеры блоков
    }
});

    document.getElementById('client-Tryon-section').addEventListener('click', () => {
        // Переключаем на вкладку "Статистика"
        switchSection('client-Tryon-section1', 'client-Tryon-section'); 
        
        loadTryonLogs();
        setInterval(loadTryonLogs, 60000); 
    });

    /**
 * ИСПРАВЛЕННЫЙ ПЕРЕКЛЮЧАТЕЛЬ СЕКЦИЙ
 */
document.getElementById('show-config-btn').addEventListener('click', () => {
    switchSection('widget-config-section', 'show-config-btn');
    // Вызываем превью, чтобы сразу подтянулись цвета из инпутов
    setTimeout(() => updatePreview(), 100);
});
    document.getElementById('show-products-btn').addEventListener('click', () => {
        // Переключаем на вкладку "Управление Товарами"
        switchSection('product-management-section', 'show-products-btn');
        loadProducts(); // Загружает товары для УПРАВЛЕНИЯ
    });

    document.getElementById('top-tovarov-like-btn').addEventListener('click', () => {
        // Переключаем на вкладку "Управление Товарами"
        switchSection('top-tovarov-like-btn1', 'top-tovarov-like-btn');
        loadTopLikedProducts(); // Загружает товары для УПРАВЛЕНИЯ
    });

    const limitSelect = document.getElementById('top-likes-limit-select');
    if (limitSelect) {
        limitSelect.addEventListener('change', loadTopLikedProducts);
    }
    const refreshBtn = document.getElementById('refresh-top-likes-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadTopLikedProducts);
    }
    
    // Инициализация модального окна добавления
    document.getElementById('add-product-btn').addEventListener('click', () => {
        openAddProductModal(); // Вызываем новую, чистую функцию для добавления
    });

    const addForm = document.getElementById('add-product-form');
    if (addForm) {
        addForm.addEventListener('submit', handleProductAddFormSubmit);
    }

    // ⭐ НОВЫЙ СЛУШАТЕЛЬ: Обработчик отправки для МОДАЛА РЕДАКТИРОВАНИЯ
    const editForm = document.getElementById('edit-product-form');
    if (editForm) {
        editForm.addEventListener('submit', handleProductEditFormSubmit); // Новый обработчик
    }

    const form = document.getElementById('add-product-form');
    if (form) {
        form.addEventListener('submit', handleProductAddFormSubmit);
    }

    // ⭐ ИСПРАВЛЕНИЕ: Обработчик закрытия модального окна графика
    // Теперь используем глобальную closeModal или удаление класса 'open'
    const chartModal = document.getElementById('product-chart-modal');
    if (chartModal) {
        chartModal.addEventListener('click', (e) => {
            // Проверяем, был ли клик по фону, крестику или элементу с атрибутом закрытия
            if (e.target === chartModal || e.target.hasAttribute('data-modal-close') || e.target.classList.contains('close-button')) {
                // Пытаемся использовать глобальную функцию closeModal (из analytics.html)
                if (typeof closeModal === 'function') {
                    closeModal('product-chart-modal'); 
                } else {
                    // Если функция недоступна, удаляем класс вручную (или используем старый резервный вариант)
                    chartModal.classList.remove('open');
                    chartModal.style.display = 'none'; // Резервный вариант
                }
            }
        });
    }

    function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// ⭐ ИСПРАВЛЕННАЯ ФУНКЦИЯ ДЛЯ ГРАФИКА ПОЛЬЗОВАТЕЛЯ (user)
function setCustomDateDefaults() {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()); 

    const endDateInput = document.getElementById('user-end-date');
    const startDateInput = document.getElementById('user-start-date');

    // ⭐ ДОБАВЛЕНЫ ПРОВЕРКИ НА NULL: устанавливаем значение, только если элемент найден
    if (endDateInput) {
        endDateInput.value = formatDate(today);
    }
    if (startDateInput) {
        startDateInput.value = formatDate(sixMonthsAgo);
    }
}


// Вспомогательная функция для получения куки (если её еще нет в этом файле)
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}


async function saveWidgetConfig() {
    try {
        const previewIframe = document.getElementById('tryon-preview-iframe');
        const iframeDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
        const styleTag = iframeDoc.getElementById('dynamic-theme');
        const cssContent = styleTag ? styleTag.innerHTML : '';

        showMessage('Сохранение настроек...', 'info');

        const response = await apiRequest('POST', '/api/save-tryon-css', {
            tryon_id: 'your-guid-here',
            css_content: cssContent
        });

        showMessage('Настройки успешно сохранены!', 'success');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showMessage('Ошибка при сохранении конфигурации.', 'error');
    }
}

// Функция для загрузки логов примерок
async function loadTryonLogs() {
    const tbody = document.getElementById('tryon-logs-body');
    if (!tbody) return;

    try {
        // Явно указываем GET, если твоя utils.js это поддерживает
        const logs = await apiRequest('GET', '/api/client/tryon-logs'); 
        
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Логов пока нет</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => {
            const date = new Date(log.created_at).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <tr>
                    <td style="font-size: 11px; color: #aaa;">${date}</td>
                    <td>
                        <div style="font-weight: 500; font-size: 13px;">${log.login || 'User ID: ' + log.user_id}</div>
                        <div style="font-size: 10px; color: #666;">${log.email || ''}</div>
                    </td>
                    <td><span class="badge-time">${log.generation_time_seconds ? log.generation_time_seconds.toFixed(1) + 's' : '—'}</span></td>
                    <td>
                        <img src="${log.source_image_url}" class="preview-thumb clickable" 
                             onclick="openPhotoModal('${log.source_image_url}')" title="Исходное фото">
                    </td>
                    <td>
                        <img src="${log.product_image_url}" class="preview-thumb clickable" 
                             onclick="openPhotoModal('${log.product_image_url}')" title="Товар">
                    </td>
                    <td>
                        <img src="${log.result_image_url}" class="preview-thumb clickable result-img" 
                             onclick="openPhotoModal('${log.result_image_url}')" title="Результат примерки">
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Ошибка: ${error.message}</td></tr>`;
    }
}

// Функция открытия модалки
function openPhotoModal(url) {
    const modal = document.getElementById('image-viewer-modal');
    const fullImg = document.getElementById('full-res-image');
    
    fullImg.src = url;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Запрещаем прокрутку страницы под модалкой
}

// Функция закрытия модалки
function closePhotoViewer() {
    const modal = document.getElementById('image-viewer-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Возвращаем прокрутку
}

// Навешиваем события после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('image-viewer-modal');
    const closeBtn = document.getElementById('close-viewer');

    // 1. Закрытие по крестику
    closeBtn.onclick = closePhotoViewer;

    // 2. Закрытие по клику на фон (за пределы изображения)
    modal.onclick = (e) => {
        if (e.target === modal) {
            closePhotoViewer();
        }
    };

    // 3. Закрытие по кнопке Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closePhotoViewer();
        }
    });
});


// ⭐ ИСПРАВЛЕННАЯ ФУНКЦИЯ ДЛЯ ГРАФИКА ТОВАРА (product)
function setProductCustomDateDefaults() {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()); 

    const endDateInput = document.getElementById('product-end-date');
    const startDateInput = document.getElementById('product-start-date');

    // ⭐ ДОБАВЛЕНЫ ПРОВЕРКИ НА NULL: устанавливаем значение, только если элемент найден
    if (endDateInput) endDateInput.value = formatDate(today);
    if (startDateInput) startDateInput.value = formatDate(sixMonthsAgo);
}
    
    // Обработчик смены периода в модальном окне графика товара
    const chartPeriodSelect = document.getElementById('chart-period-select');
    if (chartPeriodSelect) {
        chartPeriodSelect.addEventListener('change', (e) => {
            // Перезагружаем график для ТЕКУЩЕГО товара с новым периодом
            loadProductTryonChart(e.target.value);
        });
    }
    window.openAddEditModal = openEditProductModal;
    window.deleteProduct = deleteProduct; 
    window.closeModal = closeModal;
    window.handleProductAddFormSubmit = handleProductAddFormSubmit; 
    window.openProductChart = openProductChart; 
});


/**
 * Загружает и отображает статистику примерок для текущего пользователя.
 * @param {string} period - Выбранный период ('6month', 'custom' и т.д.).
 */
async function loadUserTryonStats(period) {
    const userStartDateInput = document.getElementById('user-start-date');
    const userEndDateInput = document.getElementById('user-end-date');
    // Используем ваш текущий базовый URL
    const baseUrl = '/api/analytics/user-tryon-stats'; 
    let params = { period: period };
    let timeUnit;

    // 1. Определение timeUnit и обработка custom периода
    if (period === 'custom') {
        const startDate = userStartDateInput ? userStartDateInput.value : null;
        const endDate = userEndDateInput ? userEndDateInput.value : null;

        if (!startDate || !endDate) {
            showMessage('Пожалуйста, выберите начальную и конечную дату.', 'error');
            return;
        }
        
        // Для кастомного периода timeUnit, как правило, 'day'
        timeUnit = 'day';

        // Добавляем даты к параметрам
        params.startDate = startDate;
        params.endDate = endDate;
        params.timeUnit = timeUnit;

    } else {
        // Логика для стандартных периодов (month, 6month, year, all)
        timeUnit = (period === 'day' || period === 'month' || period === '') ? 'day' : 'month';
        
        // Если период пуст при загрузке, используем '6month' по умолчанию
        if (period === '') {
             params.period = '6month'; 
        }
        params.timeUnit = timeUnit;
    }


    // 2. Формируем финальный URL-запрос с учетом параметров
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${baseUrl}?${queryString}`;

    try {
        showMessage('Загрузка статистики примерок пользователя...', 'info');
        
        // Запрос к API
        const data = await apiRequest('GET', fullUrl);
        
        if (data.length === 0) {
            // Если данных нет, показываем сообщение и уничтожаем старый график
            document.getElementById('user-tryon-chart-container').innerHTML = 
                '<canvas id="user-tryon-chart"></canvas><p style="text-align: center;">Нет данных о примерках за выбранный период.</p>';
            if (userTryonChart) userTryonChart.destroy();
            userTryonChart = null;
            return;
        }

        renderUserTryonChart(data, params.timeUnit); 
        showMessage(''); // Очищаем сообщение
        
    } catch (error) {
        console.error('Ошибка при загрузке статистики примерок пользователя:', error);
        showMessage(error.message || 'Не удалось загрузить график примерок.', 'error');
    }
}

/**
 * Рендерит график примерок (аналогично админке).
 */
function renderUserTryonChart(data, timeUnit) {
    const ctx = document.getElementById('user-tryon-chart').getContext('2d');

    if (userTryonChart) {
        userTryonChart.destroy();
    }
    
    const labels = data.map(item => item.time_label);
    const counts = data.map(item => parseInt(item.count, 10));
    
    userTryonChart = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: labels,
            datasets: [{
                label: 'Количество примерок',
                data: counts,
                fill: 'origin',
                // Сделаем сами бары чуть ярче, чтобы они не терялись
                backgroundColor: 'rgba(0, 96, 199, 0.7)', 
                borderColor: 'rgba(75, 144, 218, 0.7)',
                borderWidth: 3,
                tension: 0.3,   // Сглаживание линии (0 - ломаная, 0.4 - плавная)
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    // Линии сетки по оси Y
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' 
                    },
                    title: { 
                        display: true, 
                        text: 'Примерки',
                        color: '#ffffff' // БЕЛЫЙ текст заголовка
                    },
                    ticks: { 
                        color: '#ffffff', // БЕЛЫЕ цифры
                        callback: (value) => (Number.isInteger(value) ? value : null) 
                    }
                },
                x: {
                    // Убираем вертикальную сетку, чтобы не рябило
                    grid: {
                        display: false 
                    },
                    title: { 
                        display: true, 
                        text: timeUnit === 'day' ? 'Дата' : 'Месяц/Год',
                        color: '#ffffff' // БЕЛЫЙ текст заголовка
                    },
                    ticks: { 
                        color: '#ffffff' // БЕЛЫЕ подписи дат
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff' // БЕЛЫЙ текст легенды сверху
                    }
                },
                // Подсказка при наведении (tooltip)
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                }
            }
        }
    });
}


/**
 * Загружает и отображает список топ-товаров по лайкам.
 */
async function loadTopLikedProducts() {
    // Предполагается, что функция showMessage и apiRequest доступны
    showMessage('Загрузка топ-товаров...', 'info', 0);
    const listContainer = document.getElementById('topLikedProductsList');
    // Получаем выбранный лимит
    const limit = document.getElementById('top-likes-limit-select').value;
    
    if (!listContainer) return; 

    listContainer.innerHTML = '<p class="text-center text-secondary">Загрузка...</p>';
    
    try {
        // Вызываем новый API-маршрут
        const topProducts = await apiRequest('GET', `/api/admin/top-liked-products?limit=${limit}`);
        
        listContainer.innerHTML = ''; 

        if (topProducts.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-secondary">Нет данных о лайках.</p>';
            showMessage('Загрузка завершена. Нет данных о лайках.', 'info');
            return;
        }

        // Рендеринг карточек
        topProducts.forEach((product, index) => {
            const card = document.createElement('div');
            // Используйте классы, соответствующие вашему дизайну (например, 'product-card' и 'grid-item')
            card.className = 'product-card grid-item'; 
            card.innerHTML = `
                <div class="rank-badge">${index + 1}</div>
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h4 class="product-name">${product.name}</h4>
                    <p class="product-stats">
                        <span class="like-count">❤️ ${product.like_count} Лайков</span>
                        <span class="product-id">ID: ${product.product_id}</span>
                    </p>
                </div>
            `;
            listContainer.appendChild(card);
        });

        showMessage(`Загружено ${topProducts.length} топ-товаров.`, 'success');

    } catch (error) {
        console.error('Ошибка загрузки топ-товаров:', error);
        listContainer.innerHTML = '<p class="text-center text-error">Не удалось загрузить данные.</p>';
        showMessage(error.message || 'Ошибка загрузки топ-товаров.', 'error');
    }
}

function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

function setCustomDateDefaults() {
    const today = new Date();
    // 6 месяцев назад
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate()); 

    // Устанавливаем значения полей
    document.getElementById('user-end-date').value = formatDate(today);
    document.getElementById('user-start-date').value = formatDate(sixMonthsAgo);
}

/**
 * Читает объект File как строку Base64.
 * @param {File} file - Объект файла.
 * @returns {Promise<string>} Строка Base64.
 */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file); // Это преобразует в Base64 (включая префикс data:image/...)
    });
}

/**
 * Загружает и отображает топ товаров по количеству примерок.
 */
async function loadTopProducts() {
    try {
        // Запрашиваем топ-10
        const response = await apiRequest('GET', '/api/analytics/top-products?limit=10'); 
        const topProducts = response.topProducts;
        
        const tableBody = document.getElementById('top-products-table-body');
        tableBody.innerHTML = ''; // Очищаем содержимое
        
        if (topProducts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">Нет данных о примерках для товаров.</td></tr>';
            return;
        }

        topProducts.forEach((product, index) => {
            const row = tableBody.insertRow();
            
            // # (Рейтинг)
            row.insertCell().textContent = index + 1;
            
            // Название Товара
            row.insertCell().textContent = product.product_name;
            
            // Всего Примерок
            const cellCount = row.insertCell();
            cellCount.textContent = product.total_tryons_count;
            cellCount.style.fontWeight = 'bold';

            // 2. Изображение (Новая колонка)
            const cellImage = row.insertCell();
            const img = document.createElement('img');
            // Если product_image_url — это относительный путь, убедитесь, что сервер его отдает
            img.src = product.product_image_url || 'placeholder.png'; 
            img.alt = product.product_name;
            img.style.width = '50px';      // Фиксированный размер для таблицы
            img.style.height = '50px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '8px'; // В стиле Clozly
            img.style.border = '1px solid rgba(255,255,255,0.1)';
            cellImage.appendChild(img);
            
        });
        
    } catch (error) {
        console.error('Ошибка при загрузке топа товаров:', error);
        const tableBody = document.getElementById('top-products-table-body');
        tableBody.innerHTML = '<tr><td colspan="4">Не удалось загрузить топ товаров.</td></tr>';
    }
}


/**
 * ⭐ НОВАЯ ФУНКЦИЯ: Открывает модальное окно ДОБАВЛЕНИЯ товара и сбрасывает форму.
 */
function openAddProductModal() {
    const form = document.getElementById('add-product-form');
    const idInput = document.getElementById('add-product-id-input');
    const messageBox = document.getElementById('add-product-message');

    // 1. Очистка и сброс состояния
    form.reset();
    if (idInput) idInput.value = ''; // Гарантируем, что ID пуст для добавления
    if (messageBox) messageBox.style.display = 'none';

    // 2. Открываем модальное окно
    if (typeof openModal === 'function') {
        openModal('add-product-modal'); 
    } else {
        document.getElementById('add-product-modal').style.display = 'flex';
    }
}

// Функция создания строки размера
function addSizeRow(label = '', h = '', c = '', w = '') {
    const container = document.getElementById('size-variants-container');
    const row = document.createElement('div');
    row.className = 'size-row';
    row.style = "display: flex; gap: 5px; margin-bottom: 8px;";
    row.innerHTML = `
        <input type="text" name="size_label" placeholder="Назв. (S)" value="${label}" style="width: 25%; padding: 8px; background: #2a2a2a; border: 1px solid #444; color: white;">
        <input type="number" name="size_height" placeholder="Рост" value="${h}" style="width: 25%; padding: 8px; background: #2a2a2a; border: 1px solid #444; color: white;">
        <input type="number" name="size_chest" placeholder="Грудь" value="${c}" style="width: 25%; padding: 8px; background: #2a2a2a; border: 1px solid #444; color: white;">
        <input type="number" name="size_waist" placeholder="Талия" value="${w}" style="width: 25%; padding: 8px; background: #2a2a2a; border: 1px solid #444; color: white;">
        <button type="button" class="remove-size-btn" style="background:none; border:none; color: #ff4d4d; cursor:pointer;">&times;</button>
    `;
    
    row.querySelector('.remove-size-btn').onclick = () => row.remove();
    container.appendChild(row);
}

// Слушатель кнопки "Добавить"
//document.getElementById('add-size-row-btn').addEventListener('click', () => addSizeRow());

// Создаем одну пустую строку по умолчанию при загрузке
document.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('size-variants-container')) addSizeRow('S');
});

/**
 * Обрабатывает отправку формы ДОБАВЛЕНИЯ товара.
 * @param {Event} event 
 */
async function handleProductAddFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    
    // Проверяем, что ID пуст, т.к. это форма добавления
    const productIdInput = document.getElementById('add-product-id-input');
    if (productIdInput && productIdInput.value) {
        console.warn('Попытка редактирования через форму добавления. Сброс ID.');
        productIdInput.value = ''; // Гарантируем, что это добавление
    }
    
    const submitBtn = document.getElementById('add-product-submit-btn');
    const submitText = document.getElementById('submit-text-add');
    const loadingSpinner = document.getElementById('loading-spinner-add');
    const messageBox = document.getElementById('add-product-message');
    
    const skuInputValue = form.querySelector('[name="product_sku_add"]')?.value || '';
    const sku = skuInputValue ? parseInt(skuInputValue, 10) : null; 
    if (!skuInputValue) {
        showMessage('Ошибка: Артикул не может быть пустым.', 'error', 5000, messageBox);
        return;
    }
    // Проверяем на буквы (если ввели буквы, parseInt вернет NaN)
    if (skuInputValue && isNaN(sku)) {
        showMessage('Ошибка: Артикул должен быть целым числом без букв.', 'error', 5000, messageBox);
        resetFormState(submitBtn, loadingSpinner, submitText, 'Загрузить и Сгенерировать');
        return;
    }

    const product_price = form.product_price.value; // Получаем значение цены

    const sizeRows = form.querySelectorAll('.size-row');
    const sizeVariants = [];

    sizeRows.forEach(row => {
        const label = row.querySelector('input[name="size_label"]').value;
        const h = row.querySelector('input[name="size_height"]').value;
        const c = row.querySelector('input[name="size_chest"]').value;
        const w = row.querySelector('input[name="size_waist"]').value;

        if (label) { // Добавляем только если указано название размера (например, S)
            sizeVariants.push({
                label: label,
                height: h ? parseInt(h) : null,
                chest: c ? parseInt(c) : null,
                waist: w ? parseInt(w) : null
            });
        }
    });
    
    let base64Image = null;

    // Блокируем кнопку и показываем загрузку
    if (submitBtn) submitBtn.disabled = true;
    
    // ⭐ ИСПРАВЛЕНИЕ: Проверяем, существует ли элемент, перед использованием!
    if (submitText) {
        submitText.textContent = 'Обработка...';
    }
    if (loadingSpinner) {
        loadingSpinner.style.display = 'inline-block';
    }
    if (messageBox) {
        messageBox.style.display = 'none';
        messageBox.textContent = '';
    }
    // Проверка, что цена является допустимым числом
    if (product_price !== '' && isNaN(parseFloat(product_price))) {
        showMessage('Ошибка: Цена должна быть числом.', 'error', 5000, messageBox);
        resetFormState(submitBtn, loadingSpinner, submitText, 'Загрузить и Сгенерировать');
        return;
    }

    try {
        // --- 1. Сбор данных и файла ---
        
        // Получаем поле для загрузки файла (name="image" из вашего HTML)
        const fileInput = form.querySelector('input[name="commerce_image"]'); 
        const backFileInput = form.querySelector('input[name="commerce_back_image"]'); // Читаем новое поле
        const sku = form.querySelector('[name="product_sku_add"]')?.value || '';

        const clothingFile = fileInput.files[0];
        const backClothingFile = backFileInput ? backFileInput.files[0] : null;

        const vtonfileInput = form.querySelector('input[name="commerce_vton_image"]'); 
        const vtonbackFileInput = form.querySelector('input[name="commerce_vton_back_image"]'); // Читаем новое поле

        const vtonclothingFile = vtonfileInput.files[0];
        const vtonbackClothingFile = vtonbackFileInput ? vtonbackFileInput.files[0] : null;


        if (!clothingFile) {
            throw new Error('Пожалуйста, выберите файл изображения одежды.');
        }
        if (!vtonclothingFile) {
            throw new Error('Пожалуйста, выберите файл изображения одежды.');
        }

        // --- 2. Преобразование файла в Base64 ---
        showMessage('Преобразование изображения...', 'info', 0, messageBox);
        base64Image = await readFileAsBase64(clothingFile);

        let base64BackImage = null;
        if (backClothingFile) {
            showMessage('Преобразование вида сзади...', 'info', 0, messageBox);
            base64BackImage = await readFileAsBase64(backClothingFile);
        }

        let vtonbase64BackImage = null;
        if (vtonbackClothingFile) {
            showMessage('Преобразование вида сзади...', 'info', 0, messageBox);
            vtonbase64BackImage = await readFileAsBase64(vtonbackClothingFile);
        }

        let vtonbase64Image = null;
        if (vtonclothingFile) {
            showMessage('Преобразование вида сзади...', 'info', 0, messageBox);
            vtonbase64Image = await readFileAsBase64(vtonclothingFile);
        }

        // --- 3. Формирование JSON-объекта (Payload) ---
        const payload = {
            // Читаем все необходимые поля из формы
            name: form.querySelector('input[name="product_name"]').value,
            category_id: form.querySelector('select[name="garment_category"]').value, 
            price: parseFloat(product_price), 
            sku: sku,
            size_variants: sizeVariants,
            // ⭐ ПЕРЕДАЧА BASE64: Включаем Base64 и имя файла в JSON
            clothing_base64: base64Image,
            clothing_back_base64: base64BackImage,
            vton_clothing_base64: vtonbase64Image,
            vton_clothing_back_base64: vtonbase64BackImage,
            clothing_file_name: clothingFile.name
        };

        // --- 4. Отправка запроса как JSON ---
        // Убираем 'formData' и аргумент 'true', чтобы apiRequest отправил JSON
        const newProduct = await apiRequest('POST', '/api/products', payload); 

        showMessage(`Товар "${newProduct.name}" успешно добавлен! ID: ${newProduct.id}`, 'success', 5000, messageBox);
        
        form.reset();
        closeModal('add-product-modal');
        loadProducts(); // Обновляем список товаров
        
    } catch (error) {
        console.error('Ошибка при добавлении товара:', error);
        showMessage(error.message || 'Не удалось добавить товар.', 'error', 5000, messageBox);
    } finally {
        resetFormState(submitBtn, loadingSpinner, submitText, 'Загрузить и Сгенерировать');
    }
}

// =================================================================
// 2. ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ ТОВАРАМИ (РЕДАКТИРОВАНИЕ)
// =================================================================

/**
 * ⭐ РЕФАКТОРИНГ: Открывает модальное окно РЕДАКТИРОВАНИЯ товара и заполняет его данными.
 * @param {number} productId - ID редактируемого товара.
 */
async function openEditProductModal(productId) {
    if (!productId) {
        console.error('Необходимо указать ID товара для редактирования.');
        showMessage('Ошибка: Не указан ID товара.', 'error');
        return;
    }

    const form = document.getElementById('edit-product-form');
    const title = document.getElementById('edit-title');
    const productIdInput = document.getElementById('edit-product-id-input'); 
    const passwordInput = document.getElementById('user-password-edit');
    const passwordError = document.getElementById('password-error-edit');
    const messageBox = document.getElementById('edit-product-message');
    
    // 1. Очистка и сброс состояния
    form.reset();
    if (passwordInput) passwordInput.value = '';
    if (passwordError) passwordError.style.display = 'none';
    if (messageBox) messageBox.style.display = 'none';

    // ⭐ РЕЖИМ РЕДАКТИРОВАНИЯ: ЗАГРУЗКА И ЗАПОЛНЕНИЕ ДАННЫХ ⭐
    
    title.textContent = `Редактировать товар ID: ${productId}`;
    productIdInput.value = productId;
    
    // Показываем модал
    if (typeof openModal === 'function') {
        openModal('edit-product-modal'); 
    } else {
        document.getElementById('edit-product-modal').style.display = 'flex';
    }

    try {
        // Запрос на сервер для получения данных
        const product = await apiRequest('GET', `/api/products/${productId}`);
        
        // ⭐ ЗАПОЛНЕНИЕ ФОРМЫ ТЕКУЩИМИ ДАННЫМИ ⭐
        
        // 1. Название товара
        const nameInput = document.getElementById('product-name-edit');
        if (nameInput) {
            nameInput.value = product.name || ''; 
        }

        // 2. Цена
        const priceInput = document.getElementById('product-price-edit');
        if (priceInput) {
            priceInput.value = product.price || '';
        }

        // 3. Артикул
        const skuInput = document.getElementById('product-sku-edit');
        if (skuInput) {
            skuInput.value = product.sku || '';
        }

        // 4. Категория
        const categorySelect = document.getElementById('garment-category-edit');
        if (categorySelect) {
            categorySelect.value = product.vton_category || ''; // Используем vton_category из БД
        }
        
        if (product.image_url) {
            const container1 = document.getElementById('commerce-image-input-edit').parentElement.querySelector('.edit-preview-container');
            if (container1) {
                container1.innerHTML = `<img src="${product.image_url}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;">`;
            }
        }

        // 2. Товар для карточки (Сзади)
        if (product.image_back_url) {
            const container2 = document.getElementById('commerce-back-image-input-edit').parentElement.querySelector('.edit-preview-container');
            if (container2) {
                container2.innerHTML = `<img src="${product.image_back_url}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;">`;
            }
        }

        // 3. Товар для генерации (Лицо)
        if (product.vton_image_url) {
            const container3 = document.getElementById('vton_commerce-image-input-edit').parentElement.querySelector('.edit-preview-container');
            if (container3) {
                container3.innerHTML = `<img src="${product.vton_image_url}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;">`;
            }
        }

        // 4. Товар для генерации (Сзади)
        if (product.vton_image_back_url) {
            const container4 = document.getElementById('vton_commerce-back-image-input-edit').parentElement.querySelector('.edit-preview-container');
            if (container4) {
                container4.innerHTML = `<img src="${product.vton_image_back_url}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 4px;">`;
            }
        }

        // 5. Изображение (поле file остается пустым, но hint-text это объясняет)

    } catch (error) {
        console.error('Ошибка загрузки данных товара для редактирования:', error);
        closeModal('edit-product-modal');
        showMessage(error.message || `Не удалось загрузить данные товара ID ${productId}.`, 'error');
    }
}

/**
 * Преобразует код категории в понятное название.
 * @param {string} categoryCode - Код категории (e.g., 'upper_body').
 * @returns {string} - Человекочитаемое название.
 */
function getCategoryDisplayName(categoryCode) {
    const mapping = {
        'upper_body': 'Верхнея одежда',
        'lower_body': 'Нижния одежда',
        'dresses': 'Платья',
        // Добавьте сюда другие категории по мере необходимости
    };
    return mapping[categoryCode] || categoryCode;
}

/**
 * ⭐ ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ФУНКЦИЯ: Обрабатывает редактирование товара.
 * Использует те же ключи, что и функция добавления (clothing_base64).
 */
async function handleProductEditFormSubmit(event) {
    event.preventDefault();
    const form = event.target;

    const productIdInput = document.getElementById('edit-product-id-input');
    const messageBox = document.getElementById('edit-product-message');
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitText = document.getElementById('submit-text-edit'); 
    const loadingSpinner = document.getElementById('loading-spinner-edit');

    const productId = productIdInput ? productIdInput.value : null;

    if (messageBox) {
        messageBox.style.display = 'none';
        messageBox.className = 'message-box'; 
    }

    if (!productId) {
        if (typeof showMessage === 'function') showMessage('Ошибка: ID товара не определен.', 'error', 5000, messageBox);
        return;
    }

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    try {
        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.textContent = 'Обработка фото...';
        if (loadingSpinner) loadingSpinner.style.display = 'inline-block';

        // Формируем плоский объект (JSON)
        const payload = {
            name: form.querySelector('[name="product_name"]').value,
            price: form.querySelector('[name="product_price"]').value,
            vton_category: form.querySelector('[name="garment_category"]').value,
            sku: form.querySelector('[name="product_sku"]')?.value || '',
        };

        // Ключи синхронизированы с твоим методом POST (clothing_base64)
        const fileFields = {
            'commerce_image': 'clothing_base64',
            'commerce_back_image': 'clothing_back_base64',
            'vton_commerce_image': 'vton_clothing_base64',
            'vton_commerce_back_image': 'vton_clothing_back_base64'
        };

        for (const [inputName, jsonKey] of Object.entries(fileFields)) {
            const fileInput = form.querySelector(`[name="${inputName}"]`);
            if (fileInput && fileInput.files[0]) {
                payload[jsonKey] = await toBase64(fileInput.files[0]);
            }
        }

        if (submitText) submitText.textContent = 'Сохранение...';

        // Отправляем PUT запрос
        const result = await apiRequest('PUT', `/api/products/${productId}`, payload);

        if (typeof showMessage === 'function') {
            showMessage(result.message || 'Данные товара обновлены.', 'success', 3000, messageBox);
        }

        setTimeout(() => {
            if (typeof closeModal === 'function') closeModal('edit-product-modal');
            if (typeof loadProducts === 'function') loadProducts();
        }, 1000);

    } catch (error) {
        console.error('Edit Error:', error);
        if (typeof showMessage === 'function') {
            showMessage(error.message || 'Ошибка при обновлении данных.', 'error', 5000, messageBox);
        }
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Сохранить изменения';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

/**
 * ⭐ АДАПТИРОВАННАЯ ЛОГИКА ДЛЯ ОБНОВЛЕНИЯ существующего товара с проверкой пароля.
 * Использует новые ID элементов.
 * @param {number} productId - ID товара.
 * @param {HTMLFormElement} form - Элемент формы.
 * @param {string} userPassword - Пароль для подтверждения.
 */
async function updateProductLogicNew(productId, form, userPassword) {
    const submitBtn = document.getElementById('edit-product-save-btn');
    const submitTextElement = document.getElementById('submit-text-edit');
    const loadingSpinner = document.getElementById('loading-spinner-edit');
    const passwordError = document.getElementById('password-error-edit');
    const messageBox = document.getElementById('edit-product-message');

    // Безопасное получение элемента текста, чтобы избежать ошибок если submitTextElement не найден
    const submitText = submitTextElement ? submitTextElement : { textContent: 'Сохранить изменения' };
    
    submitBtn.disabled = true;
    submitText.textContent = 'Обновление...';
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    if (passwordError) passwordError.style.display = 'none';
    if (messageBox) messageBox.style.display = 'none';

    // Сбор данных для PUT-запроса
    const formData = new FormData(form);
    
    // Добавляем пароль для проверки на сервере
    formData.append('password', userPassword);

    try {
        // Вызываем API для обновления существующего товара (PUT)
        const updatedProduct = await apiRequest('PUT', `/api/products/${productId}`, formData, true); // true для FormData

        showMessage(`Товар ID ${productId} успешно обновлен.`, 'success', 5000, messageBox);
        
        // Очистка пароля в форме
        form.querySelector('#user-password-edit').value = ''; 
        
        closeModal('edit-product-modal');
        loadProducts(); // Обновляем список товаров

    } catch (error) {
        console.error('Ошибка при обновлении товара:', error);
        
        if (error.status === 401 && error.message.includes('Неверный пароль')) {
            passwordError.textContent = 'Неверный пароль. Попробуйте снова.';
            passwordError.style.display = 'block';
        } else {
            showMessage(error.message || `Не удалось обновить товар ID ${productId}.`, 'error', 5000, messageBox);
        }
    } finally {
        resetFormState(submitBtn, loadingSpinner, submitText, 'Сохранить изменения', passwordError);
    }
}


/**
 * Вспомогательная функция для сброса состояния формы.
 * @param {HTMLButtonElement} submitBtn
 * @param {HTMLElement} loadingSpinner
 * @param {HTMLElement} submitText
 * @param {string} defaultText
 * @param {HTMLElement} [passwordError=null]
 */
function resetFormState(submitBtn, loadingSpinner, submitText, defaultText, passwordError = null) {
    if (submitBtn) submitBtn.disabled = false;
    if (submitText) submitText.textContent = defaultText;
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    // Не сбрасываем passwordError, если он показан, чтобы пользователь мог исправить пароль
    if (passwordError && passwordError.style.display === 'block' && passwordError.textContent !== 'Неверный пароль. Попробуйте снова.') {
        passwordError.style.display = 'none';
    }
}



// =================================================================
// 1. ФУНКЦИИ ДЛЯ РАЗДЕЛА СТАТИСТИКИ (Выбор товара для графика)
// =================================================================
async function openAddEditModal(productId = null) {
    const form = document.getElementById('add-edit-form');
    const title = document.getElementById('add-edit-title');
    // Теперь этот элемент гарантированно существует, так как мы добавили его в HTML
    const productIdInput = document.getElementById('product-id-input'); 

    // --- Элементы для Пароля ---
    const passwordContainer = document.getElementById('password-check-container');
    const passwordInput = document.getElementById('user-password');
    const passwordError = document.getElementById('password-error');
    
    // 1. Очистка и сброс состояния
    if (form) { // <-- Добавлена проверка на существование формы
        form.reset();
    }
    if (passwordInput) passwordInput.value = '';
    if (passwordError) passwordError.style.display = 'none';

    if (productId) {
        // ⭐ РЕЖИМ РЕДАКТИРОВАНИЯ: ЗАГРУЗКА И ЗАПОЛНЕНИЕ ДАННЫХ ⭐
        
        title.textContent = `Редактировать товар ID: ${productId}`;
        productIdInput.value = productId;
        
        // Показываем блок для пароля
        if (passwordContainer) passwordContainer.style.display = 'block'; 

        try {
            // Запрос на сервер для получения данных (перестал выдавать 404)
            const product = await apiRequest('GET', `/api/products/${productId}`);
            
            // ⭐ ЗАПОЛНЕНИЕ ФОРМЫ ТЕКУЩИМИ ДАННЫМИ (как вы и просили) ⭐
            
            // 1. Название товара (поля БД: name, поле формы: product_name)
            const nameInput = form.querySelector('input[name="product_name"]');
            if (nameInput) {
                nameInput.value = product.name || ''; 
            }

            // 2. Цена (поля БД: price, поле формы: product_price)
            const priceInput = form.querySelector('input[name="product_price"]');
            if (priceInput) {
                // Приводим к строке, чтобы избежать проблем с '0.00'
                priceInput.value = String(product.price || 0); 
            }

            // 3. Категория (поля БД: category_id, поле формы: garment_category)
            const categorySelect = form.querySelector('select[name="garment_category"]');
            if (categorySelect) {
                categorySelect.value = product.vton_category || ''; 
            }
            
            // Если нужно, сделайте поле загрузки файла необязательным
            const fileInput = form.querySelector('input[name="commerce_image"]');
            if (fileInput) {
                fileInput.removeAttribute('required');
            }


        } catch (error) {
            // В случае ошибки загрузки данных
            showMessage(`Не удалось загрузить данные товара ID ${productId}. ${error.message}`, 'error');
            console.error('Ошибка загрузки данных товара:', error);
            return;
        }

    } else {
        // РЕЖИМ ДОБАВЛЕНИЯ:
        title.textContent = 'Добавить товар';
        productIdInput.value = '';
        
        // Скрываем блок для пароля
        if (passwordContainer) passwordContainer.style.display = 'none';
        
        // В режиме добавления файл обязателен
        const fileInput = form.querySelector('input[name="commerce_image"]');
        if (fileInput) {
            fileInput.setAttribute('required', 'required');
        }
    }

    // Открываем модальное окно (запускает анимацию благодаря классу 'open')
    openModal('add-edit-modal');
}

/**
 * ⭐ ФУНКЦИЯ: Загружает список ВСЕХ товаров для раздела статистики.
 * Использует общий маршрут /api/products.
 */
async function loadProductsForStats() {
    try {
        showMessage('Загрузка товаров для статистики...', 'info');
        // Используем общий маршрут /api/products
        const products = await apiRequest('GET', '/api/products'); 
        
        // ⭐ НОВАЯ ФУНКЦИЯ: Рендерит список без кнопок управления
        renderStatsProducts(products);
        showMessage('Список товаров для статистики загружен. Нажмите на товар для просмотра графика.', 'success');
    } catch (error) {
        console.error('Ошибка при загрузке товаров для статистики:', error);
        showMessage('Не удалось загрузить список товаров для статистики.', 'error');
    }
}

/**
 * ⭐ ОБНОВЛЕНО: Рендерит список товаров в ТАБЛИЦЕ (ПК) и КАРТОЧКАХ (Мобильная).
 * @param {Array<Object>} products - Список товаров.
 */
function renderStatsProducts(products) {
    // 1. КОНТЕЙНЕРЫ
    const tableBody = document.querySelector('#top-products-table tbody'); 
    // НОВЫЙ контейнер для мобильных карточек
    const cardsContainer = document.getElementById('stats-products-cards'); 

    // Очистка обоих контейнеров
    tableBody.innerHTML = ''; 
    if (cardsContainer) { 
        cardsContainer.innerHTML = ''; 
    }

    if (!Array.isArray(products) || products.length === 0) {
        const emptyMessage = '<tr><td colspan="4" style="text-align: center;">Товары отсутствуют.</td></tr>';
        tableBody.innerHTML = emptyMessage;
        
        if (cardsContainer) {
            cardsContainer.innerHTML = '<div class="empty-state-message">Товары отсутствуют.</div>';
        }
        return;
    }

    products.sort((a, b) => a.id - b.id); 

    products.forEach((product) => {
        const productName = product.name || `Товар ID ${product.id}`;
        const productNameEscaped = productName.replace(/'/g, "\\'");
        const categoryName = getCategoryDisplayName(product.vton_category);
        // 2. ГЕНЕРАЦИЯ ТАБЛИЧНОЙ СТРОКИ (Для ПК) - ОСТАВЛЯЕМ КАК ЕСТЬ
        const row = tableBody.insertRow();
        row.className = 'cursor-pointer clickable-row'; 
        // Предполагаем, что функция openProductChart существует
        row.setAttribute('onclick', `openProductChart(${product.id}, '${productNameEscaped}')`); 

        row.innerHTML = `
            <td>${productName}</td>
            <td>${categoryName || 'Не указано'}</td>
            <td>
                ${product.image_url 
                    ? `<a href="${API_BASE_URL}${product.image_url}" target="_blank" class="image-preview-link"><img src="${API_BASE_URL}${product.image_url}" class="product-image-preview" onerror="this.onerror=null;this.src='https://placehold.co/60x60/333/fff?text=Товар'" alt="Original Image"></a>` 
                    : 'Нет'}
            </td>
        `;
        
        // 3. ГЕНЕРАЦИЯ КАРТОЧКИ (Для Мобильных)
        if (cardsContainer) {
            cardsContainer.insertAdjacentHTML('beforeend', createStatsProductCard(product));
        }
    });
}

/**
 * Открывает модальное окно с графиком примерок для конкретного товара.
 */
function openProductChart(productId, productName) {
    if (window.productChart instanceof Chart) {
        window.productChart.destroy();
    }

    // Здесь должен быть твой fetch запрос к API для получения данных
    // const data = await apiRequest('GET', `/api/analytics/product/${currentProductId}?period=${period}`);

    window.productChart = new Chart(ctx, {
        type: 'line', 
        data: {
            // Твои данные (labels и datasets)
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgb(255, 255, 255)' // Белые линии сетки (полупрозрачные)
                    },
                    ticks: {
                        color: '#ffffff', // Белый текст по вертикали
                        font: { family: 'Roboto' }
                    }
                },
                x: {
                    grid: {
                        display: false // Скрываем вертикальные линии сетки
                    },
                    ticks: {
                        color: '#ffffff', // Белый текст по горизонтали
                        font: { family: 'Roboto' }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff', // Белый текст легенды
                        font: { size: 14, family: 'Roboto' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Темный фон подсказки
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff'
                }
            }
        }
    });
    currentProductId = productId;
    
    // Настраиваем заголовок модального окна
    document.getElementById('product-chart-name').textContent = `График примерок: ${productName}`;
    
    // ⭐ ИСПРАВЛЕНИЕ: Используем функцию openModal, которая управляет CSS-классами
    if (typeof openModal === 'function') {
        openModal('product-chart-modal'); 
    } else {
        // Резервный вариант, если openModal недоступна
        document.getElementById('product-chart-modal').style.display = 'flex';
    }
    
    // Загружаем график за период по умолчанию
    const defaultPeriod = '6month';
    const chartPeriodSelect = document.getElementById('chart-period-select');
    if (chartPeriodSelect) {
        chartPeriodSelect.value = defaultPeriod;
    }
    loadProductTryonChart(defaultPeriod);
}

/**
 * Рассчитывает разницу между двумя датами в днях.
 * @param {string} startDate - Начальная дата (YYYY-MM-DD).
 * @param {string} endDate - Конечная дата (YYYY-MM-DD).
 * @returns {number} - Разница в днях.
 */
 async function getDayDifference(startDate, endDate) {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    // Для расчета разницы в днях (1000 мс * 60 с * 60 мин * 24 ч)
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
}

/**
 * Определяет оптимальную единицу времени для графика 
 * на основе разницы в днях между start и end датами.
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {string} timeUnit ('day', 'week', 'month', 'year')
 */
function determineTimeUnit(startDate, endDate) {
    // Разница в миллисекундах
    const diffTime = Math.abs(endDate - startDate);
    // Разница в днях
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 60) {
        // Меньше или равно 60 дней -> По дням
        return 'day';
    } else if (diffDays <= 365) {
        // От 61 до 365 дней -> По месяцам
        return 'month';
    } else {
        // Больше 365 дней -> По годам
        return 'year';
    }
}

/**
 * Определяет timeUnit на основе разницы между датами.
 * @param {string} startDateString - Дата начала в формате YYYY-MM-DD.
 * @param {string} endDateString - Дата окончания в формате YYYY-MM-DD.
 * @returns {string} 'day' или 'month'.
 */
function getAppropriateTimeUnit(startDateString, endDateString) {
    const start = new Date(startDateString);
    const end = new Date(endDateString);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    // Используем критерий 90 дней, как в вашей рабочей функции
    if (diffDays > 90) { 
        return 'month'; 
    }
    return 'day';
}

/**
 * Загружает и отображает линейный график примерок для текущего товара.
 * @param {string} period - Период для выборки данных.
 */
async function loadProductTryonChart(period) {
    if (!currentProductId) return;

    try {
        showMessage(`Загрузка данных графика за ${period}...`, 'info');
        const productChartContainer = document.getElementById('product-chart-container');
        
        // Вызов API-маршрута для конкретного товара по ID (берет данные из tryon_history)
        const url = `/api/auth/admin/analytics/tryon-history-by-product/${currentProductId}?period=${period}`;
        const data = await apiRequest('GET', url);

        // ⭐ УЖЕ БЫЛО ПРАВИЛЬНО: Уничтожаем старый график и обнуляем ссылку
        if (productTryonChart) {
            productTryonChart.destroy(); // Уничтожаем старый график
            productTryonChart = null;
        }
        
        if (data && data.length > 0) {
            // Подготовка данных
            const labels = data.map(item => item.time_unit); 
            const counts = data.map(item => parseInt(item.tryon_count, 10));

            // ⭐ УЖЕ БЫЛО ПРАВИЛЬНО: Очищаем и создаем элемент Canvas
            productChartContainer.innerHTML = '<canvas id="tryon-chart"></canvas>';
            const ctx = document.getElementById('tryon-chart').getContext('2d');
            
            productTryonChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Количество примерок',
                        data: counts,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)', // Чуть прозрачнее фон под линией
                        tension: 0.3, 
                        fill: true,
                        pointBackgroundColor: '#ffffff', // Точки сделаем ярко-белыми
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)' // Тонкие белые линии сетки
                            },
                            ticks: {
                                color: '#ffffff' // БЕЛЫЕ цифры слева
                            },
                            title: { 
                                display: true, 
                                text: 'Количество примерок',
                                color: '#ffffff' // БЕЛЫЙ заголовок оси Y
                            }
                        },
                        x: {
                            grid: {
                                display: false // Убираем вертикальные линии сетки для чистоты
                            },
                            ticks: {
                                color: '#ffffff' // БЕЛЫЕ даты снизу
                            },
                            title: { 
                                display: true, 
                                text: 'Период',
                                color: '#ffffff' // БЕЛЫЙ заголовок оси X
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#ffffff' // БЕЛЫЙ текст легенды ("Количество примерок")
                            }
                        }
                    }
                }
            });
            showMessage(`Данные графика за ${period} загружены.`, 'success');
        } else {
             productChartContainer.innerHTML = '<p style="text-align:center;">Нет данных по примеркам за выбранный период.</p>';
             showMessage(`Нет данных по примеркам за ${period}.`, 'info', 5000);
        }
        
    } catch (error) {
        console.error('Ошибка при загрузке данных для графика:', error);
        showMessage('Не удалось загрузить данные для графика.', 'error');
    }
}



// =================================================================
// 2. ФУНКЦИИ ДЛЯ РАЗДЕЛА УПРАВЛЕНИЯ И ОБЩИЕ ФУНКЦИИ
// =================================================================

/**
 * Загружает общую аналитику и вызывает loadProductsForStats(), если вкладка статистики активна.
 */
async function loadAnalytics() {
    const authData = getAuthData();
    if (!authData || !authData.token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const data = await apiRequest('GET', '/api/analytics/client');
        const stats = data.generalStats;

        // 1. Обновляем "Всего генераций"
        document.getElementById('total-tryons-display').textContent = stats.totalTryons;
        
        // 2. Обновляем "Осталось" (из нового поля в БД)
        const remainingEl = document.getElementById('remaining-generations-display');
        if (remainingEl) remainingEl.textContent = stats.remainingGenerations ?? 0;

        // 3. Обновляем "Среднее время" (из нового поля в БД)
        const avgTimeEl = document.getElementById('avg-generation-time-display');
        if (avgTimeEl) avgTimeEl.textContent = stats.averageGenerationTime ?? '0.0';

        // 4. Загружаем данные для "Примерок за сегодня" (если у вас это отдельная функция)
        await loadTotalGenerationsToday();

        // ⭐ ВЫЗОВ: Загружаем список товаров, если вкладка "Статистика" активна по умолчанию.
        // Добавлена проверка существования элемента перед доступом к style
        const statsSection = document.getElementById('statistics-section');
        if (statsSection && statsSection.style.display !== 'none') {

    const chartCard = document.getElementById('user-tryon-stats-container');
    const topProductsSection = document.querySelector('.section-container');

    if (chartCard && topProductsSection) {
        // 1. Создаем или находим контейнер-ряд
        let rowWrapper = document.getElementById('chart-top-row-wrapper');
        if (!rowWrapper) {
            rowWrapper = document.createElement('div');
            rowWrapper.id = 'chart-top-row-wrapper';
            // Добавляем наш "магический" класс
            rowWrapper.className = 'stats-layout-row'; 
        
            // Вставляем его в DOM
            chartCard.parentNode.insertBefore(rowWrapper, chartCard);
        }

        // 2. Просто переносим элементы в обертку (стили подхватятся из CSS автоматически)
        rowWrapper.appendChild(chartCard);
        rowWrapper.appendChild(topProductsSection);
    
        // Показываем секцию
        topProductsSection.style.display = 'block';
    }

    loadProductsForStats(); 
    loadTopProducts();

    // 7. ПЕРЕРИСОВКА (Важно: Chart.js должен узнать о новой ширине)
    if (userTryonChart) {
        setTimeout(() => {
            userTryonChart.resize();
        }, 150); // Чуть больше задержка, чтобы стили успели примениться
    }
        }
        
    } catch (error) {
        console.error('Ошибка при загрузке аналитики:', error);
        showMessage('Не удалось загрузить данные аналитики. Пожалуйста, войдите снова.', 'error');
    }
}

/**
 * Загружает список всех товаров пользователя и его дефолтный товар (для вкладки "Управление товарами").
 */
async function loadProducts() {
    try {
        showMessage('Загрузка товаров...', 'info');
        
        // Запускаем оба запроса одновременно, чтобы не терять время
        const [products, defaultData] = await Promise.all([
            apiRequest('GET', '/api/products'),
            apiRequest('GET', '/api/products/default')
        ]);

        // Извлекаем id из ответа бэкенда
        const defaultProductId = defaultData ? defaultData.defaultProductId : null;

        // Передаем список товаров и ID дефолтного в функцию рендеринга
        renderProducts(products, defaultProductId); 
        
        showMessage('', 'info', 0); // Скрываем сообщение
    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
        showMessage('Не удалось загрузить список товаров.', 'error');
    }
}

/**
 * Загружает и отображает среднее число примерок на пользователя.
 */
async function loadAverageGenerationsPerUser() {
    try {
        const response = await apiRequest('GET', '/api/analytics/avg-generations-per-user');
        const average = response.averageGenerations;

        // Находим нужный блок. Предполагаем, что блок "Использованно AI кредитов" имеет ID 'total-credits-used-value'
        const avgGenerationsElement = document.getElementById('total-credits-used-value');

        if (avgGenerationsElement) {
            avgGenerationsElement.textContent = average;
        }

        // Обновляем заголовок, чтобы он соответствовал новому значению
        const titleElement = document.querySelector('[data-stat-id="total-credits-used"] .stat-title');
        if (titleElement) {
             titleElement.textContent = 'Среднее число примерок';
        }

    } catch (error) {
        console.error('Ошибка при загрузке среднего числа примерок:', error);
        // Можно обновить элемент с ошибкой или оставить старое значение
    }
}

/**
 * Загружает и отображает общее число примерок за сегодня.
 */
async function loadTotalGenerationsToday() {
    try {
        const response = await apiRequest('GET', '/api/analytics/generations-today');
        const total = response.totalGenerationsToday;
        
        const totalTodayElement = document.getElementById('total-generations-today-value');
        
        if (totalTodayElement) {
            totalTodayElement.textContent = total;
        }
        
    } catch (error) {
        console.error('Ошибка при загрузке общего числа примерок за день:', error);
        // showMessage('Не удалось загрузить статистику за день.', 'error'); // Можно добавить, если нужно уведомление
    }
}

/**
 * ⭐ ИСПРАВЛЕНО: Рендерит список товаров для УПРАВЛЕНИЯ в ТАБЛИЦЕ (ПК) и КАРТОЧКАХ (Мобильная версия).
 * @param {Array<Object>} products - Список товаров.
 * @param {number|null} defaultProductId - ID товара, который сейчас по умолчанию.
 */
function renderProducts(products, defaultProductId = null) {
    // 1. КОНТЕЙНЕРЫ
    const tableBody = document.querySelector('#management-products-table tbody'); 
    const cardsContainer = document.getElementById('management-products-cards'); 

    // Очистка обоих контейнеров
    if (tableBody) tableBody.innerHTML = '';
    if (cardsContainer) cardsContainer.innerHTML = ''; 

    if (!Array.isArray(products) || products.length === 0) {
        // Предполагаем, что таблица управления имеет 6 колонок
        const emptyMessage = '<tr><td colspan="6" style="text-align: center;">Товары отсутствуют.</td></tr>'; 
        if (tableBody) tableBody.innerHTML = emptyMessage;
        
        if (cardsContainer) {
             cardsContainer.innerHTML = '<div class="empty-state-message">Товары отсутствуют.</div>';
        }
        return;
    }

    products.sort((a, b) => a.id - b.id); 

    products.forEach((product) => {
        const productName = product.name || `Товар ID ${product.id}`;
        const categoryName = getCategoryDisplayName(product.vton_category);
        
        // Проверяем, является ли текущий товар дефолтным
        const isDefault = product.id === defaultProductId;
        
        // Формируем блок названия: обычный текст или имя + бейдж "по умолчанию" с кнопкой (i)
        const nameColumnHTML = isDefault 
            ? `
                <div class="product-name-wrapper">
                    <span class="product-main-name">${productName}</span>
                    <div class="default-badge-container">
                        <span class="default-text">по умолчанию</span>
                        <div class="tooltip-wrapper">
                            <button class="tooltip-btn" onclick="event.stopPropagation();">i</button>
                            <span class="tooltip-popup">Этот товар будет использоваться для демонстрации работы примерочной в разделе "Настройка виджета"</span>
                        </div>
                    </div>
                </div>
              `
            : `<span class="product-main-name">${productName}</span>`;

        if (tableBody) { 
             const row = tableBody.insertRow();
             
             row.innerHTML = `
                 <td>${nameColumnHTML}</td>
                 <td>${categoryName || 'Не указано'}</td>
                 <td>${product.price ? `${product.price} ₽` : '—'}</td>
                 <td>
                     ${product.image_url 
                        ? `<a href="${API_BASE_URL}${product.image_url}" target="_blank" class="image-preview-link"><img src="${API_BASE_URL}${product.image_url}" class="product-image-preview" onerror="this.onerror=null;this.src='https://placehold.co/60x60/333/fff?text=Товар'" alt="Original Image"></a>` 
                        : 'Нет'}
                    ${product.image_back_url 
                        ? `<a href="${API_BASE_URL}${product.image_back_url}" target="_blank" class="image-preview-link"><img src="${API_BASE_URL}${product.image_back_url}" class="product-image-preview" onerror="this.onerror=null;this.src='https://placehold.co/60x60/333/fff?text=Товар'" alt="Original Image"></a>` 
                        : 'Нет'}
                 </td>
                 <td><button class="button primary small button-spaced" onclick="openAddEditModal(${product.id})">Редактировать</button></td>
                 <td><button class="button primary small" onclick="deleteProduct(${product.id})">Удалить</button></td>
             `;
        }
        
        // 3. ГЕНЕРАЦИЯ КАРТОЧКИ (Для Мобильных)
        // Передаем флаг isDefault в функцию карточки, чтобы там тоже можно было красиво вывести этот текст
        if (cardsContainer) {
            cardsContainer.insertAdjacentHTML('beforeend', createManagementProductCard(product, isDefault));
        }
    });
}

function createStatsProductCard(product) {
    const tryonCount = product.tryon_count || 0; 
    const imagePlaceholder = 'https://placehold.co/150x150/333/fff?text=Товар';
    const imageUrl = product.image_url ? `${API_BASE_URL}${product.image_url}` : imagePlaceholder;
    const productNameEscaped = (product.name || `Товар ID ${product.id}`).replace(/'/g, "\\'"); 
    const categoryName = getCategoryDisplayName(product.vton_category);
    return `
        <div class="product-card" data-product-id="${product.id}" onclick="openProductChart(${product.id}, '${productNameEscaped}')">
            <img src="${imageUrl}" class="product-card-image" onerror="this.onerror=null;this.src='${imagePlaceholder}'" alt="Изображение товара">
            
            <div class="product-name-card">${product.name || `Товар ID ${product.id}`}</div>
            
            <div class="product-detail-line">
                <span class="product-label-card">Категория</span>
            </div>

            <div class="product-detail-line">
                <span class="product-value-card">${categoryName || 'Не указана'}</span>
            </div>
        </div>
    `;
}

function createManagementProductCard(product) {
    const tryonCount = product.tryon_count || 0;
    const categoryName = getCategoryDisplayName(product.vton_category);
    const imagePlaceholder = 'https://placehold.co/150x150/333/fff?text=Товар';
    const imageUrl = product.image_url ? `${API_BASE_URL}${product.image_url}` : imagePlaceholder;
    const price = product.price ? `${product.price} ₽` : '—'; 
    const productName = product.name || `Товар ID ${product.id}`;

    return `
        <div class="product-card" data-product-id="${product.id}">
            <img src="${imageUrl}" class="product-card-image" onerror="this.onerror=null;this.src='${imagePlaceholder}'" alt="Изображение товара">
            
            <div class="product-name-card">${productName}</div>
            
            <div class="product-detail-line">
                <span class="product-label-card">Категория</span>
            </div>
            <div class="product-detail-line">
                <span class="product-value-card">${categoryName || 'Не указана'}</span>
            </div>
            <div class="product-detail-line">
                <span class="product-label-card">Цена</span>
            </div>
            <div class="product-detail-line">
                <span class="product-value-card">${price}</span>
            </div>


            <div class="btn-primary">
                <button 
                    class="button primary small" 
                    onclick="openAddEditModal(${product.id})"
                >
                    Редактировать
                </button>
                <button 
                    class="button primary small" 
                    onclick="deleteProduct(${product.id})"
                >
                    Удалить
                </button>
            </div>
        </div>
    `;
}

/**
 * Вспомогательная логика для ДОБАВЛЕНИЯ нового товара.
 * @param {HTMLFormElement} form - Элемент формы.
 */
async function addNewProductLogic(form) {
    const submitBtn = document.getElementById('save-product-btn');
    const submitText = submitBtn ? (submitBtn.querySelector('.button-text') || { textContent: 'Загрузить и Сгенерировать' }) : { textContent: 'Загрузить и Сгенерировать' };
    const loadingSpinner = document.getElementById('loading-spinner');
    const messageBox = document.getElementById('add-product-message') || document.getElementById('message');

    const product_price = form.product_price.value;

    // Блокируем кнопку и показываем загрузку
    submitBtn.disabled = true;
    submitText.textContent = 'Обработка...';
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    if (messageBox) {
        messageBox.style.display = 'none';
        messageBox.textContent = '';
    }

    let base64Image = null;

    try {
        // --- 1. Сбор данных и файла ---
        const fileInput = form.querySelector('input[name="commerce_image"]');
        const clothingFile = fileInput.files[0];

        if (!clothingFile) {
            throw new Error('Пожалуйста, выберите файл изображения одежды.');
        }

        base64Image = await readFileAsBase64(clothingFile);

        // --- 2. Формирование JSON-объекта ---
        const payload = {
            product_name: form.querySelector('input[name="product_name"]').value,
            garment_category: form.querySelector('select[name="garment_category"]').value,
            mannequin_id: form.querySelector('select[name="mannequin_id"]').value,
            price: parseFloat(product_price),
            clothing_base64: base64Image,
            clothing_file_name: clothingFile.name
        };

        // --- 3. Отправка запроса как JSON ---
        const result = await apiRequest('POST', '/api/new-product-generation', payload);

        // --- 4. Успех ---
        showMessage(result.message || 'Товар успешно добавлен и отправлен на генерацию.', 'success');

        if (typeof closeModal === 'function') {
            setTimeout(() => {
                closeModal('add-edit-modal');
                loadProducts();
            }, 1000);
        }

    } catch (error) {
        // --- 5. Ошибка ---
        console.error('Ошибка добавления товара:', error);
        showMessage(error.message || 'Произошла неизвестная ошибка при добавлении товара.', 'error');

    } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Загрузить и Сгенерировать';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

/**
 * Вспомогательная логика для ОБНОВЛЕНИЯ существующего товара с проверкой пароля.
 * @param {number} productId - ID товара.
 * @param {HTMLFormElement} form - Элемент формы.
 * @param {string} userPassword - Пароль для подтверждения.
 */
async function updateProductLogic(productId, form, userPassword) {
    const submitBtn = document.getElementById('save-product-btn');
    const submitText = submitBtn ? (submitBtn.querySelector('.button-text') || { textContent: 'Сохранить' }) : { textContent: 'Сохранить' };
    const loadingSpinner = document.getElementById('loading-spinner');
    const passwordError = document.getElementById('password-error');

    submitBtn.disabled = true;
    submitText.textContent = 'Обновление...';
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    if (passwordError) passwordError.style.display = 'none';

    // Сбор данных для PUT-запроса
    const payload = {
        product_name: form.querySelector('input[name="product_name"]').value,
        garment_category: form.querySelector('select[name="garment_category"]').value,
        mannequin_id: form.querySelector('select[name="mannequin_id"]').value,
        price: parseFloat(form.product_price.value),
        user_password: userPassword, // ⭐ Передаем пароль для проверки на сервере ⭐
    };

    const fileInput = form.querySelector('input[name="commerce_image"]');
    const clothingFile = fileInput.files[0];

    // Если выбран новый файл, читаем его в Base64
    if (clothingFile) {
        payload.clothing_base64 = await readFileAsBase64(clothingFile);
        payload.clothing_file_name = clothingFile.name;
    }

    try {
        // Отправка запроса на обновление (PUT)
        const result = await apiRequest('PUT', `/api/products/${productId}`, payload);

        showMessage(result.message || `Товар ID ${productId} успешно обновлен.`, 'success');

        if (typeof closeModal === 'function') {
            setTimeout(() => {
                closeModal('add-edit-modal');
                loadProducts();
            }, 1000);
        }

    } catch (error) {
        console.error('Ошибка редактирования товара:', error);

        // Обработка ошибки неверного пароля (от сервера)
        if (error.message.includes('Неверный пароль')) {
            if (passwordError) {
                passwordError.textContent = 'Неверный пароль. Попробуйте снова.';
                passwordError.style.display = 'block';
            }
        } else {
            showMessage(error.message || `Не удалось обновить товар ID ${productId}.`, 'error');
        }

    } finally {
        submitBtn.disabled = false;
        submitText.textContent = 'Сохранить';
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }
}

/**
 * Переключает видимость секций и класс активности кнопок.
 */
function switchSection(sectionId, buttonId) {
    const sections = ['statistics-section', 'product-management-section', 'top-tovarov-btn1', 'top-tovarov-like-btn1', 'client-Tryon-section1', 'widget-config-section'];
    const buttons = ['show-stats-btn', 'show-products-btn', 'top-tovarov-btn', 'top-tovarov-like-btn', 'client-Tryon-section', 'show-config-btn'];

    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = (id === sectionId) ? 'block' : 'none';
    });

    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
             btn.classList.toggle('active', id === buttonId);
        }
    });
}

/**
 * Удаляет товар по ID.
 * @param {number} productId 
 */
async function deleteProduct(productId) {
    if (!confirm(`Вы уверены, что хотите удалить товар ID: ${productId}? Это действие нельзя отменить.`)) {
        return;
    }
    
    try {
        showMessage(`Удаление товара ID ${productId}...`, 'info');
        
        // Предполагается, что API принимает DELETE запрос с ID в URL
        await apiRequest('DELETE', `/api/products/${productId}`); 
        
        showMessage(`Товар ID ${productId} успешно удален.`, 'success');
        
        // Обновляем список товаров после удаления
        loadProducts();
    } catch (error) {
        console.error('Ошибка при удалении товара:', error);
        showMessage(error.message || `Не удалось удалить товар ID ${productId}.`, 'error');
    }
}

/**
 * Отображает сообщение пользователю.
 * @param {string} text - Текст сообщения.
 * @param {string} type - Тип сообщения ('info', 'success', 'error').
 * @param {number} duration - Время отображения в мс. 0 для бесконечности.
 */
function showMessage(text, type = 'info', duration = 3000) {
}

function updatePreview() {
        const config = {
            btnTextColor: document.getElementById('cfg-btn-text').value,
            bgColor: document.getElementById('cfg-bg-color').value,
            bgImg: document.getElementById('cfg-bg-img-url').value
        };

        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'UPDATE_WIDGET_STYLE',
                payload: config
            }, '*');
        }
    }

function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// js/analytics_client.js
var ClozlyAdmin = {
    // 1. Отправка данных для "живого" превью в iframe (Генерирует МОНОЛИТНЫЙ CSS)
    updateLivePreview: function() {
        var iframe = document.getElementById('tryon-preview-iframe');
        if (!iframe || !iframe.contentWindow) return;

        var opacity = document.getElementById('cfg-bg-opacity').value;
        var scale = document.getElementById('cfg-bg-scale').value;

        // Синхронизируем текстовые индикаторы процентов в интерфейсе админки
        var opacityValEl = document.getElementById('cfg-bg-opacity-val');
        var scaleValEl = document.getElementById('cfg-bg-scale-val');
        if (opacityValEl) opacityValEl.textContent = opacity + '%';
        if (scaleValEl) scaleValEl.textContent = scale + '%';
        var btnTextColortryon = document.getElementById('cfg-btn-text-tryon').value;
        var btnTextColor = document.getElementById('cfg-btn-text').value;
        var bgColor = document.getElementById('cfg-bg-color').value;
        var liveBgUrl = document.getElementById('cfg-bg-img-url').value; 

        
        var btnprimerkaColora = document.getElementById('primerka-btn-color-a').value;
        var btnprimerkaColord = btnprimerkaColora + '80';

        // Единый полный CSS-шаблон высокого приоритета (html body ...)
        var fullCssTemplate = `
html body, html .bg-gray-50, html #app { 
    background-color: ${bgColor} !important; 
}
html body::before {
    content: "" !important;
    position: fixed !important;
    top: 0; left: 0; width: 100%; height: 100%;
    z-index: -1 !important;
    background-image: ${liveBgUrl ? `url('${liveBgUrl}')` : 'none'} !important;
    background-size: ${scale}% auto !important;
    background-repeat: no-repeat !important;
    background-position: top center !important;
    display: block !important;
    opacity: ${opacity / 100} !important;
}
@media (min-width: 1024px) { 
    html body::before { background-size: ${scale}% auto !important; } 
}
html body .action-btn, 
html body button[onclick*="Select"],
html body #tryOnButton { color: ${btnTextColor} !important; }
html body .textcolor { color: ${btnTextColor} !important;}
html body .textcolortryon { color: ${btnTextColortryon} !important;}
html body .vsyakayalala {
    color: ${btnTextColor} !important;
}
html body #tryOnButton { color: ${btnTextColor} !important; background-color: ${btnprimerkaColora} !important;}
html body #tryOnButton:disabled { color: ${btnTextColor} !important; background-color: ${btnprimerkaColord} !important;}
html body .product-card { 
    background: rgba(255, 255, 255, 0.05) !important; 
    backdrop-filter: blur(8px) !important; 
}
`.trim();

        // Передаем монолитный CSS код в iframe
        iframe.contentWindow.postMessage({ 
            type: 'CLOZLY_LIVE', 
            payload: {
                txt: btnTextColor,
                bg: bgColor,
                img: liveBgUrl,
                cssContent: fullCssTemplate // Отправляем готовый код
            } 
        }, '*');
    },

    // 2. Обработка выбора файла (локальный предпросмотр)
    handleFileSelect: function(e) {
        var file = e.target.files[0];
        var label = document.getElementById('file-label-text');
        var hiddenInput = document.getElementById('cfg-bg-img-url');

        if (file) {
            label.textContent = "Выбрано: " + file.name;
            var reader = new FileReader();
            reader.onload = function(event) {
                hiddenInput.value = event.target.result; 
                ClozlyAdmin.updateLivePreview(); 
            };
            reader.readAsDataURL(file);
        }
    },

    // 3. Финальное сохранение сгенерированного CSS шаблона на сервер
    saveConfig: async function() {
        var saveBtn = document.getElementById('save-widget-config');
        var fileInput = document.getElementById('cfg-bg-file');
        var file = fileInput.files[0];
        var finalBgUrl = "";

        saveBtn.disabled = true;
        var originalText = saveBtn.textContent;
        saveBtn.textContent = 'Загрузка...';

        try {
            if (file) {
                var formData = new FormData();
                formData.append('bgImage', file);
                var uploadRes = await fetch('/api/upload-widget-bg', { method: 'POST', body: formData });
                var uploadData = await uploadRes.json();
                if (!uploadData.success) throw new Error('Ошибка загрузки изображения');
                finalBgUrl = uploadData.publicUrl;
            } else {
                var currentUrl = document.getElementById('cfg-bg-img-url').value;
                if (currentUrl && !currentUrl.startsWith('data:')) {
                    finalBgUrl = currentUrl;
                }
            }
            var btnTextColor = document.getElementById('cfg-btn-text').value;
            var btnTextColortryon = document.getElementById('cfg-btn-text-tryon').value;
            var bgColor = document.getElementById('cfg-bg-color').value;
            var opacity = document.getElementById('cfg-bg-opacity').value / 100;
            var scale = document.getElementById('cfg-bg-scale').value;


            var btnprimerkaColora = document.getElementById('primerka-btn-color-a').value;
            var btnprimerkaColord = btnprimerkaColora + '80';
            var getCookie = (n) => {
                var m = document.cookie.match(new RegExp("(?:^|; )" + n.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
                return m ? decodeURIComponent(m[1]) : undefined;
            };
            var tryonId = getCookie('tryonId');

            // Абсолютно такой же CSS шаблон отправляется в БД
            var cssTemplate = `
html body, html .bg-gray-50, html #app { 
    background-color: ${bgColor} !important; 
}
html body::before {
    content: "" !important;
    position: fixed !important;
    top: 0; left: 0; width: 100%; height: 100%;
    z-index: -1 !important;
    background-image: ${finalBgUrl ? `url('${finalBgUrl}')` : 'none'} !important;
    background-size: ${scale}% auto !important;
    background-repeat: no-repeat !important;
    background-position: top center !important;
    display: block !important;
    opacity: ${opacity} !important;
}
@media (min-width: 1024px) { 
    html body::before { background-size: ${scale}% auto !important; } 
}
html body .action-btn, 
html body button[onclick*="Select"],
html body .vsyakayalala {
    color: ${btnTextColor} !important;
}
html body .textcolor { color: ${btnTextColor} !important;}
html body .textcolortryon { color: ${btnTextColortryon} !important;}
html body #tryOnButton { color: ${btnTextColor} !important; background-color: ${btnprimerkaColora} !important;}
html body #tryOnButton:disabled { color: ${btnTextColor} !important; background-color: ${btnprimerkaColord} !important;}
html body .product-card { 
    background: rgba(255, 255, 255, 0.05) !important; 
    backdrop-filter: blur(8px) !important; 
}
`.trim();

            var response = await fetch('/api/save-css', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tryonId, cssContent: cssTemplate })
            });

            var result = await response.json();
            if (result.success) alert('Конфигурация сохранена!');
            else throw new Error(result.error);

        } catch (err) {
            alert('Ошибка: ' + err.message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    },
    // Новая функция для загрузки текущих настроек
    loadConfig: async function() {
        var getCookie = (n) => {
            var m = document.cookie.match(new RegExp("(?:^|; )" + n.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"));
            return m ? decodeURIComponent(m[1]) : undefined;
        };
        var tryonId = getCookie('tryonId');
        if (!tryonId) {
            ClozlyAdmin.setDefaultValues();
            return;
        }

        try {
            // Делаем запрос к твоему существующему эндпоинту
            var response = await fetch(`/api/get-css/${tryonId}`);
            if (!response.ok) throw new Error('Стили не найдены');
            
            var text = await response.text();
            if (!text || text.trim() === "" || text.includes('<!DOCTYPE')) {
                // Если записи в БД нет или вернулась пустая строка/ошибка
                ClozlyAdmin.setDefaultValues();
                return;
            }

            // Извлекаем значения регулярными выражениями из шаблона CSS
            
            // 1. Фон подложки (background-color у html body)
            var bgMatch = text.match(/html body, html \.bg-gray-50, html #app \{\s*background-color:\s*([^!;\s]+)/);
            if (bgMatch) document.getElementById('cfg-bg-color').value = bgMatch[1].trim();

            // 2. Фоновое изображение (url)
            var imgMatch = text.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/);
            if (imgMatch && imgMatch[1] !== 'none') {
                document.getElementById('cfg-bg-img-url').value = imgMatch[1];
                document.getElementById('file-label-text').textContent = "Фон загружен";
            } else {
                document.getElementById('cfg-bg-img-url').value = "";
                document.getElementById('file-label-text').textContent = "Нажмите, чтобы выбрать фото";
            }

            // 3. Масштаб изображения (background-size)
            var scaleMatch = text.match(/background-size:\s*(\d+)%/);
            if (scaleMatch) document.getElementById('cfg-bg-scale').value = scaleMatch[1];

            // 4. Прозрачность (opacity)
            var opacityMatch = text.match(/opacity:\s*([^!;\s]+)/);
            if (opacityMatch) {
                var opacityVal = parseFloat(opacityMatch[1]) * 100;
                document.getElementById('cfg-bg-opacity').value = opacityVal;
            }

            // 5. Цвет основного текста кнопок (.action-btn)
            var txtMatch = text.match(/html body \.action-btn,[\s\S]*?color:\s*([^!;\s]+)/);
            if (txtMatch) document.getElementById('cfg-btn-text').value = txtMatch[1].trim();

            // 6. Цвет текста «Виртуальная примерочная» (.textcolortryon)
            var tryonTxtMatch = text.match(/html body \.textcolortryon \{\s*color:\s*([^!;\s]+)/);
            if (tryonTxtMatch) document.getElementById('cfg-btn-text-tryon').value = tryonTxtMatch[1].trim();

            // 7. Цвет кнопки примерки (#tryOnButton background-color)
            var btnColorMatch = text.match(/html body #tryOnButton \{\s*color:[^;]+;\s*background-color:\s*([^!;\s]+)/);
            if (btnColorMatch) document.getElementById('primerka-btn-color-a').value = btnColorMatch[1].trim();

            // Синхронизируем спаны процентов в интерфейсе
            document.getElementById('cfg-bg-opacity-val').textContent = document.getElementById('cfg-bg-opacity').value + '%';
            document.getElementById('cfg-bg-scale-val').textContent = document.getElementById('cfg-bg-scale').value + '%';

            // Когда все инпуты заполнены — пушим это в iframe превью
            ClozlyAdmin.updateLivePreview();

        } catch (err) {
            console.log('Кастомных стилей нет или ошибка, ставим дефолтные:', err.message);
            ClozlyAdmin.setDefaultValues();
        }
    },
    setDefaultValues: function() {
        document.getElementById('primerka-btn-color-a').value = '#3f5eff'; // Тот самый индиго из --color-primary
        document.getElementById('cfg-btn-text').value = '#ffffff';         // Белый текст для кнопок
        document.getElementById('cfg-bg-color').value = '#f9fafb';         // Светлый фон bg-gray-50
        document.getElementById('cfg-btn-text-tryon').value = '#111827';   // Темный текст заголовков
        document.getElementById('cfg-bg-opacity').value = '100';
        document.getElementById('cfg-bg-scale').value = '100';
        document.getElementById('cfg-bg-img-url').value = '';
        
        // Синхронизируем текстовые индикаторы процентов в интерфейсе
        var opacityValEl = document.getElementById('cfg-bg-opacity-val');
        var scaleValEl = document.getElementById('cfg-bg-scale-val');
        if (opacityValEl) opacityValEl.textContent = '100%';
        if (scaleValEl) scaleValEl.textContent = '100%';

        // Запускаем обновление превью, чтобы применить эти стили к iframe
        ClozlyAdmin.updateLivePreview();
    }
};

// Инициализация событий при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    ['cfg-btn-color', 'cfg-btn-text', 'cfg-bg-color', 'cfg-btn-text-tryon', 'primerka-btn-color-a', 'cfg-bg-opacity', 'cfg-bg-scale'].forEach(id => {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', ClozlyAdmin.updateLivePreview);
    });

    var fInp = document.getElementById('cfg-bg-file');
    if (fInp) fInp.addEventListener('change', ClozlyAdmin.handleFileSelect);

    var sBtn = document.getElementById('save-widget-config');
    if (sBtn) sBtn.addEventListener('click', ClozlyAdmin.saveConfig);

    var iframe = document.getElementById('tryon-preview-iframe');
    if (iframe) iframe.onload = function() {
        ClozlyAdmin.loadConfig();
    };
});

document.addEventListener('DOMContentLoaded', function() {
    const saveLimitsBtn = document.getElementById('save-widget-limits');
    
    if (saveLimitsBtn) {
        saveLimitsBtn.addEventListener('click', async () => {
            const limitDay = document.getElementById('cfg-tryon-limit-day').value;
            const limitHour = document.getElementById('cfg-tryon-limit-hour').value;
            const limitMessage = document.getElementById('cfg-limit-message').value;

            if (limitDay === '' || limitHour === '' || !limitMessage) {
                alert('Пожалуйста, заполните все поля!');
                return;
            }

            const originalText = saveLimitsBtn.textContent;
            saveLimitsBtn.disabled = true;
            saveLimitsBtn.textContent = 'Сохранение...';

            try {
                // Вызываем строго через твою обертку apiRequest
                const result = await apiRequest('POST', '/api/user/save-limits', {
                    tryonLimitDay: parseInt(limitDay),
                    tryonLimitHour: parseInt(limitHour),
                    limitMessage: limitMessage
                });

                if (result && result.success) {
                    alert('Лимиты успешно сохранены!');
                } else {
                    throw new Error(result.message || 'Ошибка при сохранении');
                }
            } catch (err) {
                if (err.status !== 401) {
                    alert('Ошибка: ' + err.message);
                }
            } finally {
                if (saveLimitsBtn) {
                    saveLimitsBtn.disabled = false;
                    saveLimitsBtn.textContent = originalText;
                }
            }
        });
    }
    // --- Логика переключателя режима загрузки (Clozly Tin / Spinner) ---
    const modeToggle = document.getElementById('cfg-loading-mode-toggle');
    const modeStatusText = document.getElementById('clozly-switch-status-text');

    // 1. Автоматический GET запрос при загрузке страницы для определения статуса
    async function loadCurrentLoadingMode() {
        try {
            // Используем стандартную функцию apiRequest, если она объявлена в модуле,
            // либо обычный fetch с заголовками авторизации
            const response = await fetch('/api/user/widget-loading-mode', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Если авторизация требует передачи токенов из ваших утилит getAuthData():
                    ...((typeof getAuthData === 'function') ? { 'Authorization': `Bearer ${getAuthData().token}` } : {})
                }
            });
            const data = await response.json();

            if (data && data.success) {
                if (data.mode === 'ClozlyTin') {
                    modeToggle.checked = true;
                    modeStatusText.textContent = 'Clozly Tin';
                    modeStatusText.style.color = '#49b7f7'; // Цвет активного акцента
                    modeStatusText.style.opacity = '1';
                } else {
                    modeToggle.checked = false;
                    modeStatusText.textContent = 'Обычный спиннер';
                    modeStatusText.style.color = '#fff';
                    modeStatusText.style.opacity = '0.6';
                }
            }
        } catch (err) {
            console.error('Не удалось загрузить текущий режим отображения:', err);
        }
    }

    // Запускаем получение статуса
    loadCurrentLoadingMode();

    // 2. Обработчик изменения состояния (POST запрос при клике)
    if (modeToggle) {
        modeToggle.addEventListener('change', async function() {
            // Определяем, какой режим отправить на сервер на основе положения свитча
            const selectedMode = this.checked ? 'ClozlyTin' : 'spinner';
            
            // Визуальный фидбек до ответа сервера
            modeStatusText.textContent = this.checked ? 'Включение...' : 'Выключение...';

            try {
                const response = await fetch('/api/user/widget-loading-mode', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...((typeof getAuthData === 'function') ? { 'Authorization': `Bearer ${getAuthData().token}` } : {})
                    },
                    body: JSON.stringify({ mode: selectedMode })
                });
                const data = await response.json();

                if (data && data.success) {
                    // Синхронизируем интерфейс по реальному ответу от сервера
                    if (data.mode === 'ClozlyTin') {
                        this.checked = true;
                        modeStatusText.textContent = 'Clozly Tin';
                        modeStatusText.style.color = '#49b7f7';
                        modeStatusText.style.opacity = '1';
                    } else {
                        this.checked = false;
                        modeStatusText.textContent = 'Обычный спиннер';
                        modeStatusText.style.color = '#fff';
                        modeStatusText.style.opacity = '0.6';
                    }
                    
                    // Опционально: Обновляем превью iframe, чтобы изменения применились в реальном времени
                    const iframe = document.getElementById('tryon-preview-iframe');
                    if (iframe) iframe.contentWindow.location.reload();

                } else {
                    throw new Error(data.error || 'Ошибка изменения режима');
                }
            } catch (err) {
                alert('Не удалось сохранить режим загрузки: ' + err.message);
                // Откатываем положение ползунка назад в случае сбоя сети или ошибки
                this.checked = !this.checked;
                modeStatusText.textContent = this.checked ? 'Clozly Tin' : 'Обычный спиннер';
                modeStatusText.style.color = this.checked ? '#49b7f7' : '#fff';
                modeStatusText.style.opacity = this.checked ? '1' : '0.6';
            }
        });
    }
});