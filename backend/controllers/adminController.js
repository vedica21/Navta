const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Reward = require('../models/Reward');
const Result = require('../models/Result');

// @desc    Get all platform users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update user details or role
// @route   PUT /api/admin/users/:userId
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { name, role, isVerified } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (isVerified !== undefined) user.isVerified = isVerified;
    
    // If role changes, check profile creation
    if (role && role !== user.role) {
      // Create student or teacher profiles if they don't already exist
      if (role === 'student') {
        const studentExists = await Student.findOne({ user: user._id });
        if (!studentExists) {
          await Student.create({ user: user._id });
        }
      } else if (role === 'teacher') {
        const teacherExists = await Teacher.findOne({ user: user._id });
        if (!teacherExists) {
          await Teacher.create({ user: user._id, qualification: 'Qualified Educator' });
        }
      }
      user.role = role;
    }

    await user.save();
    res.status(200).json({ success: true, message: 'User updated successfully', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete user account
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Remove profiles first
    await Student.deleteOne({ user: user._id });
    await Teacher.deleteOne({ user: user._id });
    await User.deleteOne({ _id: user._id });

    res.status(200).json({ success: true, message: 'User account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create new subject category
// @route   POST /api/admin/subjects
// @access  Private (Admin)
exports.createSubject = async (req, res) => {
  try {
    const { name, code, description, category } = req.body;

    const subjectExists = await Subject.findOne({ code });
    if (subjectExists) {
      return res.status(400).json({ success: false, message: 'Subject with this code already exists' });
    }

    const subject = await Subject.create({
      name,
      code,
      description,
      category: category || 'General'
    });

    res.status(201).json({ success: true, data: subject });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create new reward item
// @route   POST /api/admin/rewards
// @access  Private (Admin)
exports.createReward = async (req, res) => {
  try {
    const { title, description, costCoins, badgeImage, type } = req.body;

    const rewardExists = await Reward.findOne({ title });
    if (rewardExists) {
      return res.status(400).json({ success: false, message: 'Reward item already exists' });
    }

    const reward = await Reward.create({
      title,
      description,
      costCoins,
      badgeImage,
      type
    });

    res.status(201).json({ success: true, data: reward });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get system global usage reports
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
exports.getDashboardStats = async (req, res) => {
  try {
    const studentsCount = await Student.countDocuments();
    const teachersCount = await Teacher.countDocuments();
    const subjectsCount = await Subject.countDocuments();
    const resultsCount = await Result.countDocuments();
    const rewardsCount = await Reward.countDocuments();

    // Average performance scoring
    const results = await Result.find();
    const totalScorePercent = results.reduce((acc, curr) => acc + curr.percentage, 0);
    const averageScore = resultsCount > 0 ? Math.round(totalScorePercent / resultsCount) : 0;

    res.status(200).json({
      success: true,
      stats: {
        studentsCount,
        teachersCount,
        subjectsCount,
        resultsCount,
        rewardsCount,
        averageScore
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
