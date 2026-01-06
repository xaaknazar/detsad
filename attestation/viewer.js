// Загрузка и отображение категорий и файлов
let attestationData = null;

// API базовый URL
const API_BASE_VIEWER = '';

// Загрузка данных при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('attestation.html')) {
        loadAttestationData();
    }
});

// Загрузка данных
async function loadAttestationData() {
    try {
        // Сначала пробуем загрузить с сервера
        const response = await fetch(`${API_BASE_VIEWER}/api/data`);
        if (response.ok) {
            attestationData = await response.json();
            console.log('Данные загружены с сервера');
            renderCategories();
            return;
        }
    } catch (error) {
        console.log('Сервер недоступен, пробуем localStorage');
    }

    try {
        // Fallback на localStorage
        const localData = localStorage.getItem('attestationData');

        if (localData) {
            console.log('Загружено из localStorage');
            attestationData = JSON.parse(localData);
            renderCategories();
            return;
        }

        // Если в localStorage нет, пробуем загрузить из JSON
        console.log('Пробуем загрузить из data.json...');
        const response = await fetch('../attestation/data.json');
        const data = await response.json();
        attestationData = data;
        renderCategories();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);

        // Используем пустую структуру если ничего не загрузилось
        attestationData = {
            categories: []
        };
        renderCategories();
    }
}

// Отрисовка категорий
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    container.innerHTML = '';

    console.log('Рендеринг категорий:', attestationData);

    if (!attestationData || !attestationData.categories || attestationData.categories.length === 0) {
        container.innerHTML = `
            <div class="empty-message" style="grid-column: 1 / -1;">
                <i class="fas fa-folder-open"></i>
                <p>Әлі құжаттар қосылмаған. Әкімші құжаттарды жүктегеннен кейін, олар осында көрсетіледі.</p>
            </div>
        `;
        return;
    }

    // Считаем общее количество файлов
    let totalFiles = 0;
    attestationData.categories.forEach(cat => {
        if (cat.files) totalFiles += cat.files.length;
        if (cat.subcategories) {
            cat.subcategories.forEach(sub => {
                if (sub.files) totalFiles += sub.files.length;
            });
        }
    });

    console.log(`Всего файлов: ${totalFiles}`);

    attestationData.categories.forEach(category => {
        const categoryCard = createCategoryCard(category);
        container.appendChild(categoryCard);
    });
}

// Создание карточки категории
function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card';

    if (category.subcategories) {
        card.classList.add('has-subs');
    }

    // Подсчет файлов
    let fileCount = 0;
    if (category.files && Array.isArray(category.files)) {
        fileCount = category.files.length;
    }
    if (category.subcategories && Array.isArray(category.subcategories)) {
        category.subcategories.forEach(sub => {
            if (sub.files && Array.isArray(sub.files)) {
                fileCount += sub.files.length;
            }
        });
    }

    const iconClass = category.subcategories ? 'fa-folder-tree' : 'fa-folder';

    console.log(`Категория: ${category.title}, файлов: ${fileCount}`);

    card.innerHTML = `
        <h3><i class="fas ${iconClass}"></i> ${category.title}</h3>
        <div class="file-count">
            <i class="fas fa-file-pdf"></i>
            <span>${fileCount} құжат</span>
        </div>
    `;

    // Если есть подкатегории
    if (category.subcategories) {
        const subsDiv = document.createElement('div');
        subsDiv.className = 'subcategories';

        category.subcategories.forEach(sub => {
            const subItem = document.createElement('div');
            subItem.className = 'subcategory-item';
            const subFileCount = sub.files ? sub.files.length : 0;
            subItem.innerHTML = `
                <span><i class="fas fa-folder"></i> ${sub.title}</span>
                <span class="badge">${subFileCount}</span>
            `;
            subItem.onclick = (e) => {
                e.stopPropagation();
                showFilesModal(sub);
            };
            subsDiv.appendChild(subItem);
        });

        card.appendChild(subsDiv);

        // Клик по категории - раскрыть подкатегории
        card.onclick = (e) => {
            if (!e.target.classList.contains('subcategory-item')) {
                subsDiv.classList.toggle('active');
            }
        };
    } else {
        // Клик по категории без подкатегорий - показать файлы
        card.onclick = () => {
            showFilesModal(category);
        };
    }

    return card;
}

// Показать модальное окно с файлами
function showFilesModal(item) {
    const modal = document.getElementById('filesModal');
    const modalTitle = document.getElementById('modalTitle');
    const filesList = document.getElementById('filesListModal');

    console.log('Открываем модальное окно для:', item);

    modalTitle.textContent = item.title;
    filesList.innerHTML = '';

    if (!item.files || !Array.isArray(item.files) || item.files.length === 0) {
        console.log('Нет файлов в категории');
        filesList.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-file-pdf"></i>
                <p>Бұл санатта әлі құжаттар жоқ</p>
            </div>
        `;
    } else {
        console.log(`Отображаем ${item.files.length} файлов`);
        item.files.forEach((file, index) => {
            console.log(`Файл ${index + 1}:`, file);
            const fileCard = createFileCard(file);
            filesList.appendChild(fileCard);
        });
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Форматирование байтов
function formatBytesViewer(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Создание карточки файла
function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'file-card';

    // Форматируем размер файла
    const sizeText = formatBytesViewer(file.size || 0);

    card.innerHTML = `
        <div class="file-card-info">
            <div class="file-card-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="file-card-details">
                <h4>${file.name}</h4>
                <p>Жүктелген: ${file.uploadDate || 'Белгісіз'} | Өлшемі: ${sizeText}</p>
            </div>
        </div>
        <button class="view-file-btn" onclick="viewFileFromViewer(${file.id})">
            <i class="fas fa-eye"></i> Ашу
        </button>
    `;
    return card;
}

// Просмотр файла
function viewFileFromViewer(fileId) {
    // Находим файл в данных
    let foundFile = null;

    attestationData.categories.forEach(category => {
        if (category.files) {
            const file = category.files.find(f => f.id === fileId);
            if (file) foundFile = file;
        }
        if (category.subcategories) {
            category.subcategories.forEach(sub => {
                if (sub.files) {
                    const file = sub.files.find(f => f.id === fileId);
                    if (file) foundFile = file;
                }
            });
        }
    });

    if (!foundFile) {
        alert('Файл табылмады!');
        return;
    }

    // Если есть путь к файлу на сервере
    if (foundFile.path) {
        window.open(foundFile.path, '_blank');
        return;
    }

    // Если файл в base64
    if (foundFile.data) {
        const blob = base64ToBlob(foundFile.data, foundFile.type || 'application/pdf');
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        return;
    }

    alert('Файл деректері табылмады!');
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

// Закрыть модальное окно
function closeModal() {
    const modal = document.getElementById('filesModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Закрытие модального окна при клике вне его
document.addEventListener('click', (e) => {
    const modal = document.getElementById('filesModal');
    if (modal && e.target === modal) {
        closeModal();
    }
});

// Закрытие модального окна по Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});
