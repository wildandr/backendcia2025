const express = require('express')
const bcrypt = require('bcrypt')
const router = express.Router()
const sequelize = require('../config/database')
const Sequelize = require('sequelize')
const saltRounds = 10
const jwt = require('jsonwebtoken')
const authenticateToken = require('../middleware/authenticateToken')
const { QueryTypes } = require('sequelize')

const User = require('../models/user')

/**
 * @swagger
 * /api/user:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       404:
 *         description: No users found
 *       500:
 *         description: Server error
 */
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll()
    if (users.length === 0) {
      res.status(404).json({ message: 'No users found' })
    } else {
      res.json(users)
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'An error occurred' })
  }
})

/**
 * @swagger
 * /api/user/{user_id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/user/:user_id', authenticateToken, async (req, res) => {
  try {
    const user_id = req.params.user_id
    const user = await User.findByPk(user_id)
    if (!user) {
      res.status(404).json({
        message: 'No user found with the provided user_id',
      })
    } else {
      res.json(user)
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'An error occurred' })
  }
})

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     tags:
 *       - Users
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               isAdmin:
 *                 type: boolean
 *               eventId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Username or email already exists
 *       500:
 *         description: Server error
 */
router.post('/user/register', async (req, res) => {
  try {
    let { username, email, password, isAdmin, eventId } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Username, email, and password are required',
      })
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // If eventId is not provided, set it to null
    if (!eventId) {
      eventId = null
    }

    // If isAdmin is not provided, set it to false
    if (!isAdmin) {
      isAdmin = false
    }

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      isAdmin,
      eventId,
    })

    newUser.password = undefined

    res.status(201).json({
      message: 'User created successfully',
      user: newUser,
    })
  } catch (err) {
    console.error(err)
    if (err.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({
        message: 'Username or email already exists',
      })
    } else {
      res.status(500).json({ message: 'An error occurred' })
    }
  }
})

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     tags:
 *       - Users
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username or email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/user/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username/email and password are required',
      })
    }

    const user = await User.findOne({
      where: {
        [Sequelize.Op.or]: [{ username: username }, { email: username }],
      },
    })

    if (!user) {
      return res.status(404).json({
        message: 'No user found with the provided username/email',
      })
    }

    const match = await bcrypt.compare(password, user.password)

    if (!match) {
      return res.status(401).json({
        message: 'Password is incorrect',
      })
    }

    const token = jwt.sign({ id: user.id }, 'your-secret-key', {
      expiresIn: '60d',
    })

    user.password = undefined

    res.json({
      message: 'User logged in successfully',
      user: user,
      token: token,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'An error occurred' })
  }
})

/**
 * @swagger
 * /api/user/{user_id}/events:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user's events
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User events retrieved successfully
 *       404:
 *         description: No events found for user
 *       500:
 *         description: Server error
 */
router.get('/user/:user_id/events', authenticateToken, async (req, res) => {
  try {
    const userEvents = await sequelize.query(
      `
    SELECT 
        teams.team_id, teams.event_id, teams.team_name, teams.isVerified AS teams_isVerified, teams.isRejected AS teams_isRejected,
        events.event_name
    FROM users
    LEFT JOIN teams ON users.user_id = teams.user_id
    LEFT JOIN events ON teams.event_id = events.event_id
    WHERE users.user_id = :userId
`,
      {
        replacements: { userId: req.params.user_id },
        type: QueryTypes.SELECT,
      }
    )

    if (
      !userEvents.length ||
      userEvents.every((event) =>
        Object.values(event).every((value) => value === null)
      )
    ) {
      return res.status(404).json({
        status: 'error',
        message: 'No events found for this user',
      })
    }

    res.status(200).json({
      status: 'success',
      data: userEvents,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving the events',
    })
  }
})

module.exports = router
