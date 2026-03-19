const router = require("express").Router();
const upload = require("../middleware/upload");

// Upload single file
router.post("/", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        convertedName: req.file.filename,
        path: req.file.path,
        url: `${req.protocol}://${req.get("host")}/${req.file.path}`,
        type: req.file.mimetype.startsWith("image/") ? "image" : "video",
        size: req.file.size,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple files
router.post("/multiple", upload.array("files", 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const files = req.files.map((file) => ({
      originalName: file.originalname,
      convertedName: file.filename,
      path: file.path,
      url: `${req.protocol}://${req.get("host")}/${file.path}`,
      type: file.mimetype.startsWith("image/") ? "image" : "video",
      size: file.size,
      timestamp: Date.now(),
    }));

    res.json({
      success: true,
      files: files,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;