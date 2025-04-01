const express = require('express');
const multer = require('multer');
const { CreateContent,CreateOutline } = require('../controllers/contentController');

const router = express.Router();
const upload = multer(); // Middleware multer để xử lý form-data

// Route xử lý yêu cầu chat từ người dùng
router.post('/create-content', upload.none(), CreateContent);
router.post('/create-outline', upload.none(), CreateOutline);
module.exports = router;