const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки хранилища
const CONFIG = {
    MAX_FILE_SIZE: 20 * 1024 * 1024,  // 20 MB
    MAX_STORAGE_SIZE: 5 * 1024 * 1024 * 1024,  // 5 GB
    UPLOAD_DIR: path.join(__dirname, 'uploads'),
    DATA_FILE: path.join(__dirname, 'server-data.json')
};

// Создаем папку uploads если не существует
if (!fs.existsSync(CONFIG.UPLOAD_DIR)) {
    fs.mkdirSync(CONFIG.UPLOAD_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(CONFIG.UPLOAD_DIR));

// Настройка Multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, CONFIG.UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Тек PDF файлдарын жүктеуге болады!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: CONFIG.MAX_FILE_SIZE },
    fileFilter: fileFilter
});

// Загрузка данных
function loadData() {
    try {
        if (fs.existsSync(CONFIG.DATA_FILE)) {
            const data = fs.readFileSync(CONFIG.DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }

    // Загружаем начальные данные из attestation/data.json
    try {
        const initialData = fs.readFileSync(path.join(__dirname, 'attestation', 'data.json'), 'utf8');
        return JSON.parse(initialData);
    } catch (error) {
        return { categories: [] };
    }
}

// Сохранение данных
function saveData(data) {
    fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Подсчет общего размера файлов
function getTotalStorageUsed() {
    let totalSize = 0;

    if (fs.existsSync(CONFIG.UPLOAD_DIR)) {
        const files = fs.readdirSync(CONFIG.UPLOAD_DIR);
        files.forEach(file => {
            const filePath = path.join(CONFIG.UPLOAD_DIR, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
        });
    }

    return totalSize;
}

// API: Получить информацию о хранилище
app.get('/api/storage-info', (req, res) => {
    const used = getTotalStorageUsed();
    const max = CONFIG.MAX_STORAGE_SIZE;
    const available = max - used;

    res.json({
        used: used,
        max: max,
        available: available,
        usedFormatted: formatBytes(used),
        maxFormatted: formatBytes(max),
        availableFormatted: formatBytes(available),
        percentUsed: ((used / max) * 100).toFixed(2),
        maxFileSize: CONFIG.MAX_FILE_SIZE,
        maxFileSizeFormatted: formatBytes(CONFIG.MAX_FILE_SIZE)
    });
});

// API: Получить все категории и файлы
app.get('/api/data', (req, res) => {
    const data = loadData();
    res.json(data);
});

// API: Загрузить файл
app.post('/api/upload', (req, res) => {
    // Проверяем доступное место
    const currentUsed = getTotalStorageUsed();
    const available = CONFIG.MAX_STORAGE_SIZE - currentUsed;

    if (available <= 0) {
        return res.status(400).json({
            success: false,
            error: 'Жад толды! Кейбір файлдарды өшіріңіз.',
            storageInfo: {
                used: formatBytes(currentUsed),
                max: formatBytes(CONFIG.MAX_STORAGE_SIZE)
            }
        });
    }

    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        error: `Файл тым үлкен! Максимум: ${formatBytes(CONFIG.MAX_FILE_SIZE)}`
                    });
                }
            }
            return res.status(400).json({
                success: false,
                error: err.message || 'Файлды жүктеуде қате!'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Файл таңдалмады!'
            });
        }

        const { categoryId, subcategoryId } = req.body;

        // Обновляем данные
        const data = loadData();
        const fileInfo = {
            id: Date.now(),
            name: req.file.originalname,
            filename: req.file.filename,
            path: `/uploads/${req.file.filename}`,
            size: req.file.size,
            uploadDate: new Date().toLocaleDateString('ru-RU'),
            type: 'application/pdf'
        };

        // Находим категорию и добавляем файл
        let added = false;
        for (let category of data.categories) {
            if (subcategoryId && category.subcategories) {
                for (let sub of category.subcategories) {
                    if (sub.id === subcategoryId || sub.title === subcategoryId) {
                        if (!sub.files) sub.files = [];
                        sub.files.push(fileInfo);
                        added = true;
                        break;
                    }
                }
            }
            if (!added && (category.id === categoryId || category.title === categoryId)) {
                if (!category.files) category.files = [];
                category.files.push(fileInfo);
                added = true;
                break;
            }
            if (added) break;
        }

        saveData(data);

        res.json({
            success: true,
            file: fileInfo,
            storageInfo: {
                used: formatBytes(getTotalStorageUsed()),
                max: formatBytes(CONFIG.MAX_STORAGE_SIZE)
            }
        });
    });
});

// API: Удалить файл
app.delete('/api/files/:fileId', (req, res) => {
    const fileId = parseInt(req.params.fileId);
    const data = loadData();
    let deleted = false;
    let deletedFile = null;

    // Ищем и удаляем файл из данных
    function removeFromFiles(files) {
        if (!files) return false;
        const index = files.findIndex(f => f.id === fileId);
        if (index !== -1) {
            deletedFile = files[index];
            files.splice(index, 1);
            return true;
        }
        return false;
    }

    for (let category of data.categories) {
        if (removeFromFiles(category.files)) {
            deleted = true;
            break;
        }
        if (category.subcategories) {
            for (let sub of category.subcategories) {
                if (removeFromFiles(sub.files)) {
                    deleted = true;
                    break;
                }
            }
        }
        if (deleted) break;
    }

    if (deleted && deletedFile) {
        // Удаляем физический файл
        const filePath = path.join(CONFIG.UPLOAD_DIR, deletedFile.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        saveData(data);

        res.json({
            success: true,
            message: 'Файл сәтті өшірілді!',
            storageInfo: {
                used: formatBytes(getTotalStorageUsed()),
                max: formatBytes(CONFIG.MAX_STORAGE_SIZE)
            }
        });
    } else {
        res.status(404).json({
            success: false,
            error: 'Файл табылмады!'
        });
    }
});

// API: Сохранить данные (структуру категорий)
app.post('/api/data', (req, res) => {
    try {
        saveData(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Деректерді сақтауда қате!'
        });
    }
});

// Форматирование байтов
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           Алтын ұя - Файл басқару сервері                 ║
╠════════════════════════════════════════════════════════════╣
║  Сервер іске қосылды: http://localhost:${PORT}              ║
║  Админ панель: http://localhost:${PORT}/admin.html          ║
╠════════════════════════════════════════════════════════════╣
║  Баптаулар:                                                ║
║  • Макс. файл өлшемі: ${formatBytes(CONFIG.MAX_FILE_SIZE).padEnd(10)}                     ║
║  • Жалпы жад лимиті: ${formatBytes(CONFIG.MAX_STORAGE_SIZE).padEnd(10)}                      ║
║  • Файлдар папкасы: /uploads                               ║
╚════════════════════════════════════════════════════════════╝
    `);
});
