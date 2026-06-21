const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ErrorResponse = require('../utils/ErrorResponse');

const uploadDir = path.resolve('data/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const mimeExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) =>
    cb(null, `${crypto.randomUUID()}${mimeExtensions[file.mimetype] || ''}`),
});

const uploader = multer({
  storage,
  limits: { files: 1, fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, Boolean(mimeExtensions[file.mimetype])),
}).single('icon');

const hasValidSignature = (filePath) => {
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
  fs.closeSync(fd);
  const bytes = buffer.subarray(0, bytesRead);

  return (
    bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ||
    bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) ||
    (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') ||
    bytes.subarray(0, 4).equals(Buffer.from('00000100', 'hex'))
  );
};

const getSafeUploadPath = (candidatePath) => {
  try {
    const root = fs.realpathSync.native(uploadDir);
    const resolvedCandidate = path.resolve(candidatePath);
    const realCandidate = fs.realpathSync.native(resolvedCandidate);
    const relative = path.relative(root, realCandidate);

    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return realCandidate;
  } catch (_err) {
    return null;
  }
};

module.exports = (req, res, next) => {
  uploader(req, res, (error) => {
    if (error) return next(new ErrorResponse(error.message, 400));
    if (!req.file) return next();

    const safeFilePath = getSafeUploadPath(req.file.path);
    if (!safeFilePath) {
      req.file = undefined;
      return next(new ErrorResponse('Invalid upload path', 400));
    }

    if (!hasValidSignature(safeFilePath)) {
      fs.unlinkSync(safeFilePath);
      req.file = undefined;
      return next(new ErrorResponse('Invalid image file', 400));
    }

    next();
  });
};
