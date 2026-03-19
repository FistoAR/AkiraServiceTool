const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure directories exist
const createDirectories = () => {
  const dirs = ["./source/images", "./source/videos"];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createDirectories();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, "./source/images");
    } else if (file.mimetype.startsWith("video/")) {
      cb(null, "./source/videos");
    } else {
      cb(new Error("Invalid file type"), null);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const originalName = path.basename(file.originalname, ext);
    
    // Store both original and converted name in metadata
    const filename = `${timestamp}${ext}`;
    
    // Attach metadata to request for later use
    req.fileMetadata = {
      originalName: file.originalname,
      convertedName: filename,
      timestamp: timestamp,
      path: file.mimetype.startsWith("image/") 
        ? `source/images/${filename}` 
        : `source/videos/${filename}`
    };
    
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|mkv|webm/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only images and videos are allowed!"));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: fileFilter,
});

module.exports = upload;