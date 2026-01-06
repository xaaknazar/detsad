import { list } from '@vercel/blob';

// Лимиты
const MAX_FILE_SIZE = 20 * 1024 * 1024;  // 20 MB
const MAX_STORAGE_SIZE = 1 * 1024 * 1024 * 1024;  // 1 GB

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all blobs
    const { blobs } = await list();

    // Calculate total size
    const totalSize = blobs.reduce((sum, blob) => sum + (blob.size || 0), 0);
    const available = MAX_STORAGE_SIZE - totalSize;

    return res.status(200).json({
      used: totalSize,
      max: MAX_STORAGE_SIZE,
      available: available,
      usedFormatted: formatBytes(totalSize),
      maxFormatted: formatBytes(MAX_STORAGE_SIZE),
      availableFormatted: formatBytes(available),
      percentUsed: ((totalSize / MAX_STORAGE_SIZE) * 100).toFixed(2),
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeFormatted: formatBytes(MAX_FILE_SIZE),
      fileCount: blobs.length
    });

  } catch (error) {
    console.error('Storage info error:', error);
    return res.status(500).json({
      error: 'Failed to get storage info',
      details: error.message
    });
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
