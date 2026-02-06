const router = require("express").Router();
const {
  createSolution,
  getSolutions,
  deleteSolution,
  updateSolution
} = require("../controllers/solution.controller");

router.post("/", createSolution);
router.get("/", getSolutions);
router.delete("/:id", deleteSolution);
router.put("/:id", updateSolution);

module.exports = router;