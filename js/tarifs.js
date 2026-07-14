import { apiRequest, getAuthData, displayMessage } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const payBtn = document.querySelector('.btn-pay');

    // 1. Загружаем данные и помечаем купленный тариф
    await refreshUserData();
    await loadAndMarkActiveTariff();

    // 2. Логика кнопки оплаты
    if (payBtn) {
        payBtn.addEventListener('click', async () => {
            const genCount = document.getElementById('genSlider').value;
            const price = document.getElementById('btnPrice').innerText;

            // Используем переменные из window, которые меняет скрипт в HTML
            const isTopUp = window.isTopUpMode;
            const tariffId = window.selectedTariffId;

            const confirmMsg = isTopUp 
                ? `Купить ${genCount} доп. генераций за ${price} ₽?`
                : `Активировать тариф за ${price} ₽?`;

            if (!confirm(confirmMsg)) return;

            try {
                let result;
                if (isTopUp) {
                    // Маршрут для покупки "на развес"
                    result = await apiRequest('POST', '/api/buy-generations', {
                        genCount: parseInt(genCount)
                    });
                } else {
                    // Маршрут для покупки целого тарифа
                    result = await apiRequest('POST', '/api/purchase-tariff', {
                        tariffId: tariffId,
                        isAnnual: false
                    });
                }

                if (result.requiresPayment && result.confirmationUrl) {
                    window.location.href = result.confirmationUrl;
                } else if (result.success) {
                    alert('Успешно!');
                    location.reload();
                }
            } catch (err) {
                alert(err.message || 'Ошибка запроса');
            }
        });
    }
});

async function loadAndMarkActiveTariff() {
    const tbody = document.querySelector('.history-section table tbody');
    try {
        const data = await apiRequest('GET', '/api/admin/user-tariffs/me');
        
        if (data.success && data.tariffs) {
            // --- ЛОГИКА ОТРИСОВКИ ТАБЛИЦЫ ---
            if (tbody) {
                tbody.innerHTML = ''; // Очищаем статические "заглушки" (ID 88, 87)
                
                data.tariffs.forEach(item => {
                    const row = document.createElement('tr');
                    const date = new Date(item.start_date).toLocaleDateString('ru-RU');
                    
                    // Если tariff_name null (как в твоем ответе для ID 13), пишем "Доп. генерации"
                    const name = item.tariff_name 
                        ? `Пакет: ${item.tariff_name}` 
                        : `Доп. пакет (${item.generations} ген.)`;

                    row.innerHTML = `
                        <td></td>
                        <td>${date}</td>
                        <td>${name}</td>
                        <td>${parseFloat(item.price).toLocaleString('ru-RU')} ₽</td>
                        <td><span class="status-paid">Оплачено</span></td>
                    `;
                    tbody.appendChild(row);
                });
            }

            // --- ЛОГИКА ПОДСВЕТКИ КАРТОЧКИ ---
            const active = data.tariffs.find(t => t.status === 'paid' || t.status === 'active');
            if (active && active.active_tariff_id) {
                window.activeTariffId = active.active_tariff_id;
                
                const cards = document.querySelectorAll('.tariff-card');
                // Проверяем существование карточки (индекс -1 так как ID обычно с 1)
                const target = cards[active.active_tariff_id - 1];
                if (target) {
                    target.classList.add('active-purchased');
                    target.style.background = 'rgba(76, 175, 80, 0.1)';
                    target.style.borderColor = '#4caf50';
                    // Добавляем галочку, если её еще нет
                    if (!target.querySelector('.fa-check-circle')) {
                        target.querySelector('h4').innerHTML += ' <i class="fas fa-check-circle" style="color: #4caf50"></i>';
                    }
                }
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки истории или тарифов:', e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="5">Ошибка загрузки данных</td></tr>';
    }
}

// refreshUserData оставляешь без изменений
async function refreshUserData() {
    try {
        const response = await apiRequest('GET', '/api/user/usage-stats/me');
        if (response.success && response.data) {
            const { currentBalance, totalLimit, usedPercent } = response.data;
            const balanceVal = document.querySelector('.stat-grid .stat-card:nth-child(1) .stat-value');
            if (balanceVal) balanceVal.innerHTML = `${currentBalance} <span style="font-size: 1rem; color: var(--gray-text);">генераций</span>`;
            document.querySelector('.progress-fill').style.width = `${usedPercent}%`;
            document.querySelector('.progress-text').innerText = `${totalLimit - currentBalance} из ${totalLimit}`;
        }
    } catch (err) {}
}