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
        // СНАЧАЛА проверяем localStorage
        const localData = localStorage.getItem('attestationData');

        if (localData) {
            console.log('Admin: Загружено из localStorage');
            categoriesData = JSON.parse(localData);
            renderCategories();
            return;
        }

        // Если в localStorage нет, загружаем из JSON
        console.log('Admin: Загрузка из data.json...');
        const response = await fetch('attestation/data.json');
        const data = await response.json();
        categoriesData = data;

        // Сохраняем в localStorage для будущего использования
        saveData();
        renderCategories();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        // Используем пустую структуру
        categoriesData = getDefaultData();
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

        // Форматируем размер файла
        const sizeInKB = file.size ? (file.size / 1024).toFixed(2) : 0;
        const sizeText = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(2)} MB` : `${sizeInKB} KB`;

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
        // Проверяем размер файла (рекомендуется до 2 MB)
        const sizeInMB = selectedFile.size / (1024 * 1024);

        if (sizeInMB > 5) {
            showNotification('Файл тым үлкен! 5 MB-тан аспауы керек.', 'error');
            fileNameSpan.textContent = '';
            uploadBtn.disabled = true;
            event.target.value = '';
            selectedFile = null;
            return;
        }

        if (sizeInMB > 2) {
            showNotification(`Ескерту: Файл өлшемі ${sizeInMB.toFixed(2)} MB. Кішірек файл жүктеу ұсынылады.`, 'error');
        }

        fileNameSpan.textContent = `${selectedFile.name} (${sizeInMB.toFixed(2)} MB)`;
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

        // Читаем файл как base64
        const base64Data = await readFileAsBase64(selectedFile);

        const targetItem = currentSubcategory || currentCategory;
        if (!targetItem.files) {
            targetItem.files = [];
        }

        const newFile = {
            id: Date.now(),
            name: selectedFile.name,
            data: base64Data, // Сохраняем base64 данные
            uploadDate: new Date().toLocaleDateString('ru-RU'),
            size: selectedFile.size,
            type: selectedFile.type
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

// Чтение файла как base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsDataURL(file);
    });
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
function viewFile(fileId) {
    const targetItem = currentSubcategory || currentCategory;
    const file = targetItem.files.find(f => f.id === fileId);

    if (!file || !file.data) {
        showNotification('Файл табылмады!', 'error');
        return;
    }

    // Создаем blob из base64
    const blob = base64ToBlob(file.data, file.type || 'application/pdf');
    const blobUrl = URL.createObjectURL(blob);

    // Открываем в новой вкладке
    window.open(blobUrl, '_blank');

    // Очищаем URL через некоторое время
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
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
        // Сохраняем в localStorage
        localStorage.setItem('attestationData', JSON.stringify(categoriesData));
        console.log('Данные сохранены успешно');
    } catch (error) {
        console.error('Ошибка сохранения:', error);

        if (error.name === 'QuotaExceededError') {
            showNotification('LocalStorage толды! Кейбір файлдарды өшіріңіз.', 'error');

            // Показываем подробную информацию
            const dataSize = new Blob([JSON.stringify(categoriesData)]).size;
            const sizeInMB = (dataSize / (1024 * 1024)).toFixed(2);
            console.warn(`Деректер өлшемі: ${sizeInMB} MB`);

            alert(`Браузер жадысы толды!\n\nСақталған деректер: ${sizeInMB} MB\n\nКейбір файлдарды өшіріп, қайта көріңіз.`);
        } else {
            showNotification('Деректерді сақтауда қате!', 'error');
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
