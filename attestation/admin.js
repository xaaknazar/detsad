// Простая проверка пароля (в реальном проекте используйте бэкенд)
const ADMIN_PASSWORD = 'admin2024';

// Глобальные переменные
let currentCategory = null;
let currentSubcategory = null;
let categoriesData = null;
let selectedFile = null;

// Проверка авторизации при загрузке
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        checkAuth();
    }
});

// Проверка авторизации
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
    if (isLoggedIn === 'true') {
        showAdminPanel();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminPanel').style.display = 'none';
    }
}

// Вход
function login() {
    const password = document.getElementById('passwordInput').value;
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
        showNotification('Сәтті кірдіңіз!', 'success');
    } else {
        showNotification('Құпия сөз қате!', 'error');
    }
}

// Выход
function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
}

// Показать админ панель
function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadCategories();
}

// Загрузка категорий
async function loadCategories() {
    try {
        const response = await fetch('attestation/data.json');
        const data = await response.json();
        categoriesData = data;
        renderCategories();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // Используем локальные данные если не удалось загрузить
        categoriesData = JSON.parse(localStorage.getItem('attestationData')) || getDefaultData();
        renderCategories();
    }
}

// Получить данные по умолчанию
function getDefaultData() {
    return {
        categories: []
    };
}

// Отрисовка категорий
function renderCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = '';

    categoriesData.categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-item';
        categoryDiv.innerHTML = `<i class="fas fa-folder"></i> ${category.title}`;
        categoryDiv.onclick = () => selectCategory(category);
        container.appendChild(categoryDiv);

        // Если есть подкатегории
        if (category.subcategories) {
            category.subcategories.forEach(sub => {
                const subDiv = document.createElement('div');
                subDiv.className = 'subcategory-item';
                subDiv.innerHTML = `<i class="fas fa-folder-open"></i> ${sub.title}`;
                subDiv.onclick = (e) => {
                    e.stopPropagation();
                    selectSubcategory(category, sub);
                };
                container.appendChild(subDiv);
            });
        }
    });
}

// Выбор категории
function selectCategory(category) {
    currentCategory = category;
    currentSubcategory = null;

    // Обновляем активный класс
    document.querySelectorAll('.category-item, .subcategory-item').forEach(el => {
        el.classList.remove('active');
    });
    event.target.classList.add('active');

    // Показываем файлы категории
    if (!category.subcategories) {
        showFiles(category);
    } else {
        document.getElementById('currentCategoryTitle').textContent = category.title;
        document.getElementById('uploadSection').style.display = 'none';
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('emptyState').innerHTML = `
            <i class="fas fa-folder-open"></i>
            <p>Ішкі санатты таңдаңыз: ${category.title}</p>
        `;
    }
}

// Выбор подкатегории
function selectSubcategory(category, subcategory) {
    currentCategory = category;
    currentSubcategory = subcategory;

    // Обновляем активный класс
    document.querySelectorAll('.category-item, .subcategory-item').forEach(el => {
        el.classList.remove('active');
    });
    event.target.classList.add('active');

    showFiles(subcategory);
}

// Показать файлы
function showFiles(item) {
    document.getElementById('currentCategoryTitle').textContent = item.title;
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';

    const filesList = document.getElementById('filesList');
    filesList.innerHTML = '';

    if (!item.files || item.files.length === 0) {
        filesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <p>Әлі файлдар жоқ. Жаңа файл жүктеңіз.</p>
            </div>
        `;
        return;
    }

    item.files.forEach((file, index) => {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file-item';
        fileDiv.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>Жүктелген: ${file.uploadDate || 'Белгісіз'}</p>
                </div>
            </div>
            <div class="file-actions">
                <button class="view-btn" onclick="viewFile('${file.path}')">
                    <i class="fas fa-eye"></i> Қарау
                </button>
                <button class="delete-btn" onclick="deleteFile(${index})">
                    <i class="fas fa-trash"></i> Өшіру
                </button>
            </div>
        `;
        filesList.appendChild(fileDiv);
    });
}

// Обработка выбора файла
function handleFileSelect(event) {
    selectedFile = event.target.files[0];
    const fileNameSpan = document.getElementById('selectedFileName');
    const uploadBtn = document.getElementById('uploadBtn');

    if (selectedFile && selectedFile.type === 'application/pdf') {
        fileNameSpan.textContent = selectedFile.name;
        uploadBtn.disabled = false;
    } else {
        fileNameSpan.textContent = '';
        uploadBtn.disabled = true;
        if (selectedFile) {
            showNotification('Тек PDF файлдарын жүктеуге болады!', 'error');
        }
    }
}

// Загрузка файла
async function uploadFile() {
    if (!selectedFile) {
        showNotification('Файлды таңдаңыз!', 'error');
        return;
    }

    if (!currentCategory) {
        showNotification('Санатты таңдаңыз!', 'error');
        return;
    }

    try {
        // В реальном проекте здесь был бы API запрос для загрузки файла на сервер
        // Сейчас сохраняем информацию о файле локально

        const targetItem = currentSubcategory || currentCategory;
        if (!targetItem.files) {
            targetItem.files = [];
        }

        const newFile = {
            name: selectedFile.name,
            path: `attestation/pdfs/${Date.now()}_${selectedFile.name}`,
            uploadDate: new Date().toLocaleDateString('ru-RU'),
            size: selectedFile.size
        };

        targetItem.files.push(newFile);

        // Сохраняем данные
        saveData();

        // Обновляем отображение
        showFiles(targetItem);

        // Сбрасываем выбор файла
        document.getElementById('pdfFile').value = '';
        document.getElementById('selectedFileName').textContent = '';
        document.getElementById('uploadBtn').disabled = true;
        selectedFile = null;

        showNotification('Файл сәтті жүктелді!', 'success');
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showNotification('Файлды жүктеуде қате!', 'error');
    }
}

// Удаление файла
function deleteFile(index) {
    if (!confirm('Файлды өшіруге сенімдісіз бе?')) {
        return;
    }

    const targetItem = currentSubcategory || currentCategory;
    targetItem.files.splice(index, 1);

    // Сохраняем данные
    saveData();

    // Обновляем отображение
    showFiles(targetItem);

    showNotification('Файл сәтті өшірілді!', 'success');
}

// Просмотр файла
function viewFile(path) {
    window.open(path, '_blank');
}

// Сохранение данных
function saveData() {
    // Сохраняем в localStorage
    localStorage.setItem('attestationData', JSON.stringify(categoriesData));

    // В реальном проекте здесь был бы API запрос для сохранения данных на сервере
    console.log('Данные сохранены:', categoriesData);
}

// Показать уведомление
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <strong>${type === 'success' ? '✓' : '✗'}</strong> ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Обработчик Enter для входа
if (document.getElementById('passwordInput')) {
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
}
