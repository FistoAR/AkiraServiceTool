const router = require("express").Router();
const { askQuestion } = require("../controllers/chat.controller");

router.post("/", askQuestion);

module.exports = router;
