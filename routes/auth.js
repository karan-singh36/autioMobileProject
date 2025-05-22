const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Signup Route
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send('Email already registered');
    }

    // Create new user
    const newUser = new User({ name, email, password });
    await newUser.save();
    res.send('Signup successful');
  } catch (err) {
    console.log(err);
    res.send('Signup failed');
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.send('Invalid email or password');
    }

    res.send(`Welcome, ${user.name}`);
  } catch (err) {
    console.log(err);
    res.send('Login failed');
  }
});

module.exports = router;
