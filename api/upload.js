import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Максимальный размер файла: 20 MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
    }

    // Parse multipart form data
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Extract boundary
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'No boundary found in content-type' });
    }
    const boundary = boundaryMatch[1] || boundaryMatch[2];

    // Parse form data
    const formData = parseMultipart(buffer, boundary);

    if (!formData.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, data, contentType: fileContentType } = formData.file;

    // Validate file type
    if (fileContentType !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Validate file size
    if (data.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`
      });
    }

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${filename}`;

    // Upload to Vercel Blob
    const blob = await put(uniqueFilename, data, {
      access: 'public',
      contentType: fileContentType,
    });

    const fileInfo = {
      id: Date.now(),
      name: filename,
      url: blob.url,
      path: blob.url,
      size: data.length,
      uploadDate: new Date().toLocaleDateString('ru-RU'),
      type: fileContentType,
    };

    return res.status(200).json({
      success: true,
      file: fileInfo,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message
    });
  }
}

// Simple multipart parser
function parseMultipart(buffer, boundary) {
  const result = {};
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const parts = [];

  let start = 0;
  let pos = buffer.indexOf(boundaryBuffer, start);

  while (pos !== -1) {
    if (start > 0) {
      // Remove trailing \r\n from previous part
      let end = pos - 2;
      if (end > start) {
        parts.push(buffer.slice(start, end));
      }
    }
    start = pos + boundaryBuffer.length + 2; // Skip boundary and \r\n
    pos = buffer.indexOf(boundaryBuffer, start);
  }

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headerSection = part.slice(0, headerEnd).toString();
    const body = part.slice(headerEnd + 4);

    // Parse headers
    const nameMatch = headerSection.match(/name="([^"]+)"/);
    const filenameMatch = headerSection.match(/filename="([^"]+)"/);
    const contentTypeMatch = headerSection.match(/Content-Type:\s*([^\r\n]+)/i);

    if (nameMatch) {
      const fieldName = nameMatch[1];

      if (filenameMatch) {
        result[fieldName] = {
          filename: filenameMatch[1],
          data: body,
          contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
        };
      } else {
        result[fieldName] = body.toString().trim();
      }
    }
  }

  return result;
}
