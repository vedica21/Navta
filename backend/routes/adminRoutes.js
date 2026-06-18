const express = require('express');
const { getUsers, updateUser, deleteUser, createSubject, createReward, getDashboardStats } = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/users', getUsers);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.post('/subjects', createSubject);
router.post('/rewards', createReward);
router.get('/dashboard-stats', getDashboardStats);

module.exports = router;
