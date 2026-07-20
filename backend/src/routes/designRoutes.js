const express = require('express');
const router = express.Router();
const designController = require('../controllers/designController');
const { protect } = require('../middleware/authMiddleware');

// We will create these controller functions in the next steps

// router.post('/', protect, designController.saveDesign);
// router.get('/', protect, designController.getDesigns);
// router.get('/:id', protect, designController.getDesignById);
// router.put('/:id', protect, designController.updateDesign);
// router.delete('/:id', protect, designController.deleteDesign);

module.exports = router;