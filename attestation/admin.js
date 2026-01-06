// Простая проверка пароля
const ADMIN_PASSWORD = 'admin2024';

// API URLs
const API_UPLOAD = '/api/upload';
const API_DELETE = '/api/delete';
const API_STORAGE = '/api/storage';

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
        const response = await fetch(API_STORAGE);
        if (response.ok) {
            storageInfo = await response.json();
            updateStorageDisplay();
        }
    } catch (error) {
        console.log('Storage API not available');
        // Показываем localStorage режим
        const storageDisplay = document.getElementById('storageInfo');
        if (storageDisplay) {
            storageDisplay.innerHTML = `
                <p><i class="fas fa-database"></i> localStorage режимі</p>
                <p>Макс. файл: 5 MB | Жалпы: ~10 MB</p>
            `;
        }
    }
}

// Обновление отображения хранилища
function updateStorageDisplay() {
    const storageDisplay = document.getElementById('storageInfo');
    if (storageDisplay && storageInfo) {
        let barClass = '';
        if (parseFloat(storageInfo.percentUsed) > 80) {
            barClass = 'danger';
        } else if (parseFloat(storageInfo.percentUsed) > 50) {
            barClass = 'warning';
        }

        storageDisplay.innerHTML = `
            <div class="storage-bar">
                <div class="storage-used ${barClass}" style="width: ${storageInfo.percentUsed}%"></div>
            </div>
            <p><i class="fas fa-cloud"></i> Vercel Blob: ${storageInfo.usedFormatted} / ${storageInfo.maxFormatted}</p>
            <p>Макс. файл: ${storageInfo.maxFileSizeFormatted} | Файлдар: ${storageInfo.fileCount || 0}</p>
        `;
    }
}

// Загрузка категорий
async function loadCategories() {
    try {
        // Сначала проверяем localStorage
        const localData = localStorage.getItem('attestationData');
        if (localData) {
            categoriesData = JSON.parse(localData);
            console.log('Loaded from localStorage');
            renderCategories();
            return;
        }

        // Загружаем из JSON файла
        const response = await fetch('attestation/data.json');
        if (response.ok) {
            categoriesData = await response.json();
            // Сохраняем в localStorage
            localStorage.setItem('attestationData', JSON.stringify(categoriesData));
            renderCategories();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
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

    document.querySelectorAll('.category-item, .subcategory-item').forEach(el => {
        el.classList.remove('active');
    });
    e.target.classList.add('active');

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

    const maxSize = storageInfo ? storageInfo.maxFileSize : 20 * 1024 * 1024;

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

    const targetItem = currentSubcategory || currentCategory;
    showNotification('Файл жүктелуде...', 'success');

    try {
        // Пробуем загрузить через Vercel Blob API
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('categoryId', currentCategory.id || currentCategory.title);
        if (currentSubcategory) {
            formData.append('subcategoryId', currentSubcategory.id || currentSubcategory.title);
        }

        const response = await fetch(API_UPLOAD, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                if (!targetItem.files) targetItem.files = [];
                targetItem.files.push(result.file);
                saveData();
                showFiles(targetItem);
                resetFileInput();
                loadStorageInfo();
                showNotification('Файл сәтті жүктелді!', 'success');
                return;
            }
        }

        throw new Error('API upload failed');

    } catch (error) {
        console.log('Vercel API not available, using localStorage');
        await uploadFileToLocalStorage();
    }
}

// Загрузка в localStorage (fallback)
async function uploadFileToLocalStorage() {
    try {
        // Проверка размера для localStorage (5 MB лимит)
        if (selectedFile.size > 5 * 1024 * 1024) {
            showNotification('localStorage режимінде файл 5 MB-тан аспауы керек!', 'error');
            return;
        }

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
        saveData();
        showFiles(targetItem);
        resetFileInput();
        showNotification('Файл сәтті жүктелді! (localStorage)', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        if (error.name === 'QuotaExceededError') {
            showNotification('localStorage толды! Кейбір файлдарды өшіріңіз.', 'error');
        } else {
            showNotification('Файлды жүктеуде қате!', 'error');
        }
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
    const file = targetItem.files[index];

    try {
        // Если есть URL (Vercel Blob), удаляем через API
        if (file.url || file.path) {
            const response = await fetch(API_DELETE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: file.url || file.path })
            });

            if (!response.ok) {
                console.log('API delete failed, removing from local data only');
            }
        }
    } catch (error) {
        console.log('Delete API error:', error);
    }

    // Удаляем из локальных данных
    targetItem.files.splice(index, 1);
    saveData();
    showFiles(targetItem);
    loadStorageInfo();
    showNotification('Файл сәтті өшірілді!', 'success');
}

// Просмотр файла
function viewFile(fileId) {
    const targetItem = currentSubcategory || currentCategory;
    const file = targetItem.files.find(f => f.id === fileId);

    if (!file) {
        showNotification('Файл табылмады!', 'error');
        return;
    }

    // Если есть URL (Vercel Blob)
    if (file.url || file.path) {
        window.open(file.url || file.path, '_blank');
        return;
    }

    // Если файл в base64 (localStorage)
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

// Сохранение данных
function saveData() {
    try {
        localStorage.setItem('attestationData', JSON.stringify(categoriesData));
    } catch (error) {
        console.error('Save error:', error);
        if (error.name === 'QuotaExceededError') {
            showNotification('localStorage толды!', 'error');
        }
    }
}

// Показать уведомление
function showNotification(message, type = 'success') {
    // Удаляем предыдущие уведомления
    document.querySelectorAll('.notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <strong>${type === 'success' ? '✓' : '✗'}</strong> ${message}
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}

// Обработчик Enter для входа
if (document.getElementById('passwordInput')) {
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
}
