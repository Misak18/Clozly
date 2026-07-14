// Получаем элемент canvas и его 2D-контекст
const canvas = document.getElementById('gradientCanvas');
const ctx = canvas.getContext('2d');

// Цвета для градиента (темные оттенки)
const color1 = { r: 5, g: 7, b: 10 };     // Почти черный (верх)
const color2 = { r: 10, g: 26, b: 53 };    // Темно-синий (середина)
const color3 = { r: 30, g: 75, b: 138 };   // Насыщенный синий (низ/перелив)
const colors = [color1, color2, color3];

let step = 0; // Шаг для анимации (своего рода "время")

// Установка размеров canvas при загрузке и изменении размера окна
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Инициализация размера

// Функция для интерполяции (смешивания) двух цветов
// 'amount' - значение от 0 до 1, где 0 - 100% colorA, 1 - 100% colorB
function interpolateColor(colorA, colorB, amount) {
    const r = Math.round(colorA.r + (colorB.r - colorA.r) * amount);
    const g = Math.round(colorA.g + (colorB.g - colorA.g) * amount);
    const b = Math.round(colorA.b + (colorB.b - colorA.b) * amount);
    return `rgb(${r}, ${g}, ${b})`;
}

function animateGradient() {
    step += 0.003; // Чуть замедляем для плавности как в PDF

    const cyclePosition = step % colors.length;
    const amount = cyclePosition - Math.floor(cyclePosition);
    
    // Смешиваем основной акцентный цвет
    const cAccent = interpolateColor(colors[1], colors[2], amount);
    
    // 2. ИЗМЕНЕНИЕ: Делаем вертикальный градиент (от 0 до canvas.height)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    
    // Фиксируем темный верх, как в документе
    gradient.addColorStop(0, `rgb(${color1.r}, ${color1.g}, ${color1.b})`); 
    // Плавный переход в середине
    gradient.addColorStop(0.5, `rgb(${color2.r}, ${color2.g}, ${color2.b})`);
    // Светлый "тлеющий" низ, который плавно меняет оттенок
    gradient.addColorStop(1, cAccent); 

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(animateGradient);
}

// Запускаем анимацию
animateGradient();