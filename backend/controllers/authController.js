const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Streak = require('../models/Streak');
const jwt = require('jsonwebtoken');

// Helper to sign JWT token
const getSignedToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'supersecretjwtkeyfornavtaplatform',
    { expiresIn: '30d' }
  );
};

// Helper to send response with token
const sendTokenResponse = (user, statusCode, res) => {
  const token = getSignedToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, stream, qualification, bio } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student'
    });

    // Create profile based on role
    if (user.role === 'student') {
      await Student.create({
        user: user._id,
        stream: stream || 'General'
      });
      // Initialize daily streak
      await Streak.create({
        user: user._id,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: new Date()
      });
    } else if (user.role === 'teacher') {
      await Teacher.create({
        user: user._id,
        qualification: qualification || 'Qualified Educator',
        bio: bio || '',
        subjects: []
      });
    }

    sendTokenResponse(user, 201, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update streak if student
    if (user.role === 'student') {
      const streak = await Streak.findOne({ user: user._id });
      if (streak) {
        const today = new Date();
        const lastActive = new Date(streak.lastActiveDate);
        
        // Calculate difference in days
        const diffTime = Math.abs(today - lastActive);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak.currentStreak += 1;
          if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
          }
          streak.lastActiveDate = today;
          await streak.save();
        } else if (diffDays > 1) {
          streak.currentStreak = 1;
          streak.lastActiveDate = today;
          await streak.save();
        }
      }
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let profile = null;
    let streak = null;

    if (user.role === 'student') {
      profile = await Student.findOne({ user: user._id }).populate('rewardsRedeemed.reward');
      streak = await Streak.findOne({ user: user._id });
    } else if (user.role === 'teacher') {
      profile = await Teacher.findOne({ user: user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      profile,
      streak
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Mock Email Verification
// @route   POST /api/auth/verify-email
// @access  Private
exports.verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.isVerified = true;
    await user.save();
    res.status(200).json({ success: true, message: 'Email verified successfully', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Mock Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User with this email does not exist' });
    }
    res.status(200).json({ success: true, message: 'Reset password link sent (simulated)' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
