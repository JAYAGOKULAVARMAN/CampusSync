const express = require('express');
const router = express.Router();
const {
  getResources,
  getResourceById,
  getResourceAvailability,
  createResource,
  updateResource,
  deleteResource,
} = require('../controllers/resourceController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// All resource endpoints require authentication
router.use(protect);

// Accessible by all authenticated users (ADMIN, DEPARTMENT_COORDINATOR, FACULTY, STUDENT)
router.get('/', getResources);
router.get('/:id/availability', getResourceAvailability);
router.get('/:id', getResourceById);

// Restricted to ADMIN or DEPARTMENT_COORDINATOR (Ownership validated in controller)
router.post('/', authorizeRoles('ADMIN', 'DEPARTMENT_COORDINATOR'), createResource);
router.put('/:id', authorizeRoles('ADMIN', 'DEPARTMENT_COORDINATOR'), updateResource);
router.delete('/:id', authorizeRoles('ADMIN', 'DEPARTMENT_COORDINATOR'), deleteResource);

module.exports = router;
