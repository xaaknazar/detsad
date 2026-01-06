// Простая проверка пароля (в реальном проекте используйте бэкенд)
const ADMIN_PASSWORD = 'admin2024';

// API базовый URL
const API_BASE = '';  // Пустой, так как сервер на том же домене

// Глобальные переменные
let currentCategory = null;
let currentSubcategory = null;
let categoriesData = null;
let selectedFile = null;
let storageInfo = null;

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
    loadStorageInfo();
    loadCategories();
}

// Загрузка информации о хранилище
async function loadStorageInfo() {
    try {
        const response = await fetch(`${API_BASE}/api/storage-info`);
        if (response.ok) {
            storageInfo = await response.json();
            updateStorageDisplay();
        }
    } catch (error) {
        console.log('Сервер недоступен, используем localStorage');
        storageInfo = null;
    }
}

// Обновление отображения хранилища
function updateStorageDisplay() {
    const storageDisplay = document.getElementById('storageInfo');
    if (storageDisplay && storageInfo) {
        storageDisplay.innerHTML = `
            <div class="storage-bar">
                <div class="storage-used" style="width: ${storageInfo.percentUsed}%"></div>
            </div>
            <p>Қолданылған: ${storageInfo.usedFormatted} / ${storageInfo.maxFormatted} (${storageInfo.percentUsed}%)</p>
            <p>Макс. файл өлшемі: ${storageInfo.maxFileSizeFormatted}</p>
        `;
    }
}

// Загрузка категорий
async function loadCategories() {
    try {
        // Пробуем загрузить с сервера
        const response = await fetch(`${API_BASE}/api/data`);
        if (response.ok) {
            categoriesData = await response.json();
            console.log('Admin: Данные загружены с сервера');
            renderCategories();
            return;
        }
    } catch (error) {
        console.log('Сервер недоступен, пробуем localStorage');
    }

    // Fallback на localStorage
    try {
        const localData = localStorage.getItem('attestationData');
        if (localData) {
            console.log('Admin: Загружено из localStorage');
            categoriesData = JSON.parse(localData);
            renderCategories();
            return;
        }

        // Загружаем из JSON файла
        const response = await fetch('attestation/data.json');
        const data = await response.json();
        categoriesData = data;
        renderCategories();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        categoriesData = { categories: [] };
        renderCategories();
    }
}

// Отрисовка категорий
function renderCategories() {
    const container = document.getElementById('categoriesList');
    container.innerHTML = '';

    categoriesData.categories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-item';
        categoryDiv.innerHTML = `<i class="fas fa-folder"></i> ${category.title}`;
        categoryDiv.onclick = (e) => selectCategory(category, e);
        container.appendChild(categoryDiv);

        // Если есть подкатегории
        if (category.subcategories) {
            category.subcategories.forEach(sub => {
                const subDiv = document.createElement('div');
                subDiv.className = 'subcategory-item';
                subDiv.innerHTML = `<i class="fas fa-folder-open"></i> ${sub.title}`;
                subDiv.onclick = (e) => {
                    e.stopPropagation();
                    selectSubcategory(category, sub, e);
                };
                container.appendChild(subDiv);
            });
        }
    });
}

// Выбор категории
function selectCategory(category, e) {
    currentCategory = category;
    currentSubcategory = null;

    // Обновляем активный класс
    document.querySelectorAll('.category-item, .subcategory-item').forEach(el => {
        el.classList.remove('active');
    });
    e.target.classList.add('active');

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
function selectSubcategory(category, subcategory, e) {
    currentCategory = category;
    currentSubcategory = subcategory;

    // Обновляем активный класс
    document.querySelectorAll('.category-item, .subcategory-item').forEach(el => {
        el.classList.remove('active');
    });
    e.target.classList.add('active');

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

        // Форматируем размер файла
        const sizeText = formatBytes(file.size || 0);

        fileDiv.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>Жүктелген: ${file.uploadDate || 'Белгісіз'} | Өлшемі: ${sizeText}</p>
                </div>
            </div>
            <div class="file-actions">
                <button class="view-btn" onclick="viewFile(${file.id})">
                    <i class="fas fa-eye"></i> Қарау
                </button>
                <button class="delete-btn" onclick="deleteFile(${file.id}, ${index})">
                    <i class="fas fa-trash"></i> Өшіру
                </button>
            </div>
        `;
        filesList.appendChild(fileDiv);
    });
}

// Форматирование байтов
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Обработка выбора файла
function handleFileSelect(event) {
    selectedFile = event.target.files[0];
    const fileNameSpan = document.getElementById('selectedFileName');
    const uploadBtn = document.getElementById('uploadBtn');

    const maxSize = storageInfo ? storageInfo.maxFileSize : 20 * 1024 * 1024; // 20 MB

    if (selectedFile && selectedFile.type === 'application/pdf') {
        if (selectedFile.size > maxSize) {
            showNotification(`Файл тым үлкен! Максимум: ${formatBytes(maxSize)}`, 'error');
            fileNameSpan.textContent = '';
            uploadBtn.disabled = true;
            event.target.value = '';
            selectedFile = null;
            return;
        }

        fileNameSpan.textContent = `${selectedFile.name} (${formatBytes(selectedFile.size)})`;
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
        showNotification('Файл жүктелуде...', 'success');

        const targetItem = currentSubcategory || currentCategory;

        // Пробуем загрузить на сервер
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('categoryId', currentCategory.id || currentCategory.title);
        if (currentSubcategory) {
            formData.append('subcategoryId', currentSubcategory.id || currentSubcategory.title);
        }

        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();

            if (result.success) {
                // Обновляем локальные данные
                if (!targetItem.files) targetItem.files = [];
                targetItem.files.push(result.file);

                // Обновляем информацию о хранилище
                if (result.storageInfo) {
                    loadStorageInfo();
                }

                showFiles(targetItem);
                resetFileInput();
                showNotification('Файл сәтті жүктелді!', 'success');
            } else {
                showNotification(result.error || 'Файлды жүктеуде қате!', 'error');
            }
        } else {
            throw new Error('Server error');
        }
    } catch (error) {
        console.error('Ошибка загрузки на сервер:', error);

        // Fallback на localStorage
        await uploadFileToLocalStorage();
    }
}

// Загрузка в localStorage (fallback)
async function uploadFileToLocalStorage() {
    try {
        const base64Data = await readFileAsBase64(selectedFile);
        const targetItem = currentSubcategory || currentCategory;

        if (!targetItem.files) targetItem.files = [];

        const newFile = {
            id: Date.now(),
            name: selectedFile.name,
            data: base64Data,
            uploadDate: new Date().toLocaleDateString('ru-RU'),
            size: selectedFile.size,
            type: selectedFile.type
        };

        targetItem.files.push(newFile);
        saveDataToLocalStorage();
        showFiles(targetItem);
        resetFileInput();
        showNotification('Файл сәтті жүктелді! (localStorage)', 'success');
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showNotification('Файлды жүктеуде қате!', 'error');
    }
}

// Сброс поля выбора файла
function resetFileInput() {
    document.getElementById('pdfFile').value = '';
    document.getElementById('selectedFileName').textContent = '';
    document.getElementById('uploadBtn').disabled = true;
    selectedFile = null;
}

// Чтение файла как base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// Удаление файла
async function deleteFile(fileId, index) {
    if (!confirm('Файлды өшіруге сенімдісіз бе?')) {
        return;
    }

    const targetItem = currentSubcategory || currentCategory;

    try {
        // Пробуем удалить на сервере
        const response = await fetch(`${API_BASE}/api/files/${fileId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                targetItem.files.splice(index, 1);
                if (result.storageInfo) {
                    loadStorageInfo();
                }
                showFiles(targetItem);
                showNotification('Файл сәтті өшірілді!', 'success');
                return;
            }
        }
        throw new Error('Server error');
    } catch (error) {
        console.log('Удаление через localStorage');
        // Fallback на localStorage
        targetItem.files.splice(index, 1);
        saveDataToLocalStorage();
        showFiles(targetItem);
        showNotification('Файл сәтті өшірілді!', 'success');
    }
}

// Просмотр файла
function viewFile(fileId) {
    const targetItem = currentSubcategory || currentCategory;
    const file = targetItem.files.find(f => f.id === fileId);

    if (!file) {
        showNotification('Файл табылмады!', 'error');
        return;
    }

    // Если есть путь к файлу на сервере
    if (file.path) {
        window.open(file.path, '_blank');
        return;
    }

    // Если файл в base64
    if (file.data) {
        const blob = base64ToBlob(file.data, file.type || 'application/pdf');
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
    }

    showNotification('Файл деректері табылмады!', 'error');
}

// Конвертация base64 в Blob
function base64ToBlob(base64, mimeType) {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeType });
}

// Сохранение в localStorage
function saveDataToLocalStorage() {
    try {
        localStorage.setItem('attestationData', JSON.stringify(categoriesData));
        console.log('Данные сохранены в localStorage');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        if (error.name === 'QuotaExceededError') {
            showNotification('LocalStorage толды! Кейбір файлдарды өшіріңіз.', 'error');
        }
    }
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
