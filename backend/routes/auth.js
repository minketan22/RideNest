const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  createAgency,
  createUser,
  findAgencyByEmail,
  findUserByEmail
} = require('../data/store');

// A secret key for your JWT tokens.
// In a real app, put this in a .env file!
const JWT_SECRET = 'your-super-secret-key'; 

/*
 * @route   POST /api/auth/register-user
 * @desc    Register a new user
 */
router.post('/register-user', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    if (!username || !email || !password || !phone) {
      return res.status(400).json({ msg: 'Please fill in all user fields' });
    }

    let user = findUserByEmail(email);
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    createUser({ username, email, password: hashedPassword, phone });

    res.status(201).json({ msg: 'User registered successfully' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * @route   POST /api/auth/login-user
 * @desc    Login a user and get a token
 */
router.post('/login-user', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }

    let user = findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 3. Create JWT Token
    const payload = {
      user: {
        id: user._id,
        role: 'user'
      }
    };

    jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token }); // Send the token to the client
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


/*
 * @route   POST /api/auth/register-agency
 * @desc    Register a new agency
 */
router.post('/register-agency', async (req, res) => {
  try {
    const { agencyName, email, password, address } = req.body;
    if (!agencyName || !email || !password || !address) {
      return res.status(400).json({ msg: 'Please fill in all agency fields' });
    }

    let agency = findAgencyByEmail(email);
    if (agency) {
      return res.status(400).json({ msg: 'Agency already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    createAgency({ agencyName, email, password: hashedPassword, address });

    res.status(201).json({ msg: 'Agency registered successfully' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/*
 * @route   POST /api/auth/login-agency
 * @desc    Login an agency and get a token
 */
router.post('/login-agency', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ msg: 'Email and password are required' });
        }

        let agency = findAgencyByEmail(email);
        if (!agency) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, agency.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // 3. Create JWT Token
        const payload = {
            user: {
                id: agency._id,
                role: 'agency'
            }
        };

        jwt.sign(payload, JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
