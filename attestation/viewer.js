// Загрузка и отображение категорий и файлов
let attestationData = null;

// Загрузка данных при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('attestation.html')) {
        loadAttestationData();
    }
});

// Загрузка данных
async function loadAttestationData() {
    try {
        const response = await fetch('../attestation/data.json');
        const data = await response.json();
        attestationData = data;
    } catch (error) {
        console.log('Загрузка из localStorage...');
        attestationData = JSON.parse(localStorage.getItem('attestationData'));
    }

    if (!attestationData || !attestationData.categories) {
        attestationData = {
            categories: []
        };
    }

    renderCategories();
}

// Отрисовка категорий
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    container.innerHTML = '';

    if (attestationData.categories.length === 0) {
        container.innerHTML = `
            <div class="empty-message" style="grid-column: 1 / -1;">
                <i class="fas fa-folder-open"></i>
                <p>Әлі құжаттар қосылмаған. Әкімші құжаттарды жүктегеннен кейін, олар осында көрсетіледі.</p>
            </div>
        `;
        return;
    }

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
    if (category.files) {
        fileCount = category.files.length;
    }
    if (category.subcategories) {
        category.subcategories.forEach(sub => {
            if (sub.files) {
                fileCount += sub.files.length;
            }
        });
    }

    const iconClass = category.subcategories ? 'fa-folder-tree' : 'fa-folder';

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

    modalTitle.textContent = item.title;
    filesList.innerHTML = '';

    if (!item.files || item.files.length === 0) {
        filesList.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-file-pdf"></i>
                <p>Бұл санатта әлі құжаттар жоқ</p>
            </div>
        `;
    } else {
        item.files.forEach(file => {
            const fileCard = createFileCard(file);
            filesList.appendChild(fileCard);
        });
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Создание карточки файла
function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'file-card';

    // Форматируем размер файла
    const sizeInKB = file.size ? (file.size / 1024).toFixed(2) : 0;
    const sizeText = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(2)} MB` : `${sizeInKB} KB`;

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

    if (!foundFile || !foundFile.data) {
        alert('Файл табылмады немесе зақымдалған!');
        return;
    }

    // Создаем blob из base64
    const blob = base64ToBlob(foundFile.data, foundFile.type || 'application/pdf');
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
