// Routes/unanswered.routes.js (NEW FILE)
const router = require("express").Router();
const { getUnanswered, deleteUnanswered } = require("../controllers/unanswered.controller");

router.get("/", getUnanswered);
router.delete("/:id", deleteUnanswered);

module.exports = router;