const express = require('express')
const router = express.Router()
const { QueryTypes } = require('sequelize')
const sequelize = require('../config/database')
const authenticateToken = require('../middleware/authenticateToken')
const Team = require('../models/team')
const Member = require('../models/member')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Ensure upload directory exists
const uploadDir = './uploads/cic'
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads')
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/cic')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    )
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 20 * 1024 * 1024,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    )
    if (extname) {
      cb(null, true)
    } else {
      cb(new Error('Only .jpeg, .jpg, .png and .pdf format allowed!'))
    }
  },
})

/**
 * @swagger
 * /api/teams/cic:
 *   get:
 *     summary: Get all CIC teams
 *     tags: [CIC Teams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all CIC teams
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   team:
 *                     type: object
 *                     properties:
 *                       team_id:
 *                         type: integer
 *                       team_name:
 *                         type: string
 *                       institution_name:
 *                         type: string
 *                   leader:
 *                     $ref: '#/components/schemas/Member'
 *                   members:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Member'
 */
router.get('/teams/cic', authenticateToken, async (req, res) => {
  try {
    const eventId = 4

    const teams = await sequelize.query(
      `SELECT * FROM teams WHERE event_id = :eventId`,
      {
        replacements: { eventId },
        type: QueryTypes.SELECT,
      }
    )

    if (!teams.length) {
      return res.status(404).json({ message: 'No teams found for CIC' })
    }

    const result = await Promise.all(
      teams.map(async (team) => {
        const members = await sequelize.query(
          `SELECT * FROM members WHERE team_id = :teamId ORDER BY is_leader DESC`,
          {
            replacements: { teamId: team.team_id },
            type: QueryTypes.SELECT,
          }
        )

        if (!members.length) {
          return {
            team: {
              team_name: team.team_name,
              institution_name: team.institution_name,
              payment_proof: team.payment_proof,
            },
          }
        }

        const leader = members.find((member) => member.is_leader === 1)
        const memberList = members.filter((member) => member.is_leader === 0)

        return {
          team,
          leader,
          members: memberList,
        }
      })
    )

    res.json(result)
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/teams/cic/{teamId}:
 *   get:
 *     summary: Get a specific CIC team
 *     tags: [CIC Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 team:
 *                   $ref: '#/components/schemas/Team'
 *                 leader:
 *                   $ref: '#/components/schemas/Member'
 *                 members:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Member'
 */
router.get('/teams/cic/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params
    const eventId = 4

    const team = await sequelize.query(
      `SELECT * FROM teams WHERE team_id = :teamId AND event_id = :eventId`,
      {
        replacements: { teamId, eventId },
        type: QueryTypes.SELECT,
      }
    )

    if (!team.length) {
      return res
        .status(404)
        .json({ message: 'No team found for this id and event' })
    }

    const members = await sequelize.query(
      `SELECT * FROM members WHERE team_id = :teamId ORDER BY is_leader DESC`,
      {
        replacements: { teamId },
        type: QueryTypes.SELECT,
      }
    )

    if (!members.length) {
      return res.status(404).json({ message: 'No members found for this team' })
    }

    const leader = members.find((member) => member.is_leader === 1)
    const memberList = members.filter((member) => member.is_leader === 0)

    const result = {
      team,
      leader,
      members: memberList,
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/teams/cic/new:
 *   post:
 *     summary: Create a new CIC team
 *     tags: [CIC Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               team:
 *                 type: object
 *                 required:
 *                   - team_name
 *                   - institution_name
 *                 properties:
 *                   team_name:
 *                     type: string
 *                   institution_name:
 *                     type: string
 *                   payment_proof:
 *                     type: string
 *                   user_id:
 *                     type: integer
 *                   email:
 *                     type: string
 *                   voucher:
 *                     type: string
 *               leader:
 *                 $ref: '#/components/schemas/MemberInput'
 *               members:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/MemberInput'
 */
router.post(
  '/teams/cic/new',
  authenticateToken,
  upload.fields([
    { name: 'payment_proof', maxCount: 1 },
    { name: 'voucher', maxCount: 1 },
    // Leader files
    { name: 'leader_ktm', maxCount: 1 },
    { name: 'leader_active_student_letter', maxCount: 1 },
    { name: 'leader_photo', maxCount: 1 },
    // Member 1 files
    { name: 'member1_ktm', maxCount: 1 },
    { name: 'member1_active_student_letter', maxCount: 1 },
    { name: 'member1_photo', maxCount: 1 },
    // Member 2 files
    { name: 'member2_ktm', maxCount: 1 },
    { name: 'member2_active_student_letter', maxCount: 1 },
    { name: 'member2_photo', maxCount: 1 },
    // Member 3 files
    { name: 'member3_ktm', maxCount: 1 },
    { name: 'member3_active_student_letter', maxCount: 1 },
    { name: 'member3_photo', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Make sure data exists
      if (!req.body.data) {
        return res.status(400).json({
          message: 'Missing team data',
          error: 'DATA_MISSING',
        })
      }

      let teamData, leaderData, membersData
      const userId = req.user.user_id
      try {
        const parsedData = JSON.parse(req.body.data)
        teamData = parsedData.team
        leaderData = parsedData.leader
        membersData = parsedData.members
      } catch (error) {
        return res.status(400).json({
          message: 'Invalid JSON data format',
          error: error.message,
        })
      }

      // Validate required fields
      if (!teamData || !leaderData) {
        return res.status(400).json({
          message: 'Missing required team or leader data',
          error: 'REQUIRED_FIELDS_MISSING',
        })
      }

      // Check if team name already exists first before handling any files
      const existingTeam = await sequelize.query(
        `SELECT team_id FROM teams WHERE team_name = :team_name AND event_id = :event_id`,
        {
          replacements: {
            team_name: teamData.team_name,
            event_id: 4,
          },
          type: QueryTypes.SELECT,
        }
      )

      if (existingTeam.length > 0) {
        // Delete any uploaded files if team exists
        if (req.files) {
          Object.values(req.files).forEach((fileArray) => {
            fileArray.forEach((file) => {
              fs.unlinkSync(file.path)
            })
          })
        }

        return res.status(400).json({
          message: 'Team name already exists',
          error: 'TEAM_NAME_EXISTS',
        })
      }

      // Handle file paths
      const payment_proof = req.files.payment_proof
        ? req.files.payment_proof[0].path
        : null

      // Store voucher file path in voucher column if provided
      const voucher = req.files.voucher ? req.files.voucher[0].path : null

      await sequelize.query(
        `INSERT INTO teams (team_name, institution_name, payment_proof, event_id, user_id, email, voucher) VALUES (:team_name, :institution_name, :payment_proof, :event_id, :user_id, :email, :voucher)`,
        {
          replacements: {
            team_name: teamData.team_name,
            institution_name: teamData.institution_name,
            payment_proof: payment_proof,
            event_id: 4,
            user_id: userId,
            email: teamData.email,
            voucher: voucher,
          },
          type: QueryTypes.INSERT,
        }
      )

      const [teamResult] = await sequelize.query(
        `SELECT LAST_INSERT_ID() as team_id`,
        { type: QueryTypes.SELECT }
      )

      // Handle leader files with new field names
      const leaderFiles = {
        ktm: req.files.leader_ktm ? req.files.leader_ktm[0].path : null,
        active_student_letter: req.files.leader_active_student_letter
          ? req.files.leader_active_student_letter[0].path
          : null,
        photo: req.files.leader_photo ? req.files.leader_photo[0].path : null,
      }

      await sequelize.query(
        `INSERT INTO members (team_id, full_name, department, batch, phone_number, line_id, email, ktm, active_student_letter, photo, twibbon_and_poster_link, is_leader) VALUES (:teamId, :full_name, :department, :batch, :phone_number, :line_id, :email, :ktm, :active_student_letter, :photo, :twibbon_and_poster_link, :is_leader)`,
        {
          replacements: {
            teamId: teamResult.team_id,
            ...leaderData,
            ...leaderFiles,
            is_leader: 1,
          },
          type: QueryTypes.INSERT,
        }
      )

      // Handle member files with specific field names
      await Promise.all(
        membersData.map(async (member, index) => {
          if (index === 2 && !member.full_name.trim()) {
            return
          }

          const memberIndex = index + 1
          const memberFiles = {
            ktm: req.files[`member${memberIndex}_ktm`]
              ? req.files[`member${memberIndex}_ktm`][0].path
              : null,
            active_student_letter: req.files[
              `member${memberIndex}_active_student_letter`
            ]
              ? req.files[`member${memberIndex}_active_student_letter`][0].path
              : null,
            photo: req.files[`member${memberIndex}_photo`]
              ? req.files[`member${memberIndex}_photo`][0].path
              : null,
          }

          await sequelize.query(
            `INSERT INTO members (team_id, full_name, department, batch, phone_number, line_id, email, ktm, active_student_letter, photo, twibbon_and_poster_link, is_leader) VALUES (:teamId, :full_name, :department, :batch, :phone_number, :line_id, :email, :ktm, :active_student_letter, :photo, :twibbon_and_poster_link, :is_leader)`,
            {
              replacements: {
                teamId: teamResult.team_id,
                ...member,
                ...memberFiles,
                is_leader: 0,
              },
              type: QueryTypes.INSERT,
            }
          )
        })
      )

      res.status(201).json({
        message: 'Team and members created successfully',
      })
    } catch (error) {
      console.error('CIC team creation error:', error)
      res.status(500).json({
        message: 'An error occurred',
        error: error.message || JSON.stringify(error) || 'Unknown error',
      })
    }
  }
)

/**
 * @swagger
 * /api/teams/cic/update:
 *   put:
 *     summary: Update a CIC team
 *     tags: [CIC Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               team:
 *                 $ref: '#/components/schemas/Team'
 *               leader:
 *                 $ref: '#/components/schemas/Member'
 *               members:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Member'
 */
router.put('/teams/cic/update', authenticateToken, async (req, res) => {
  try {
    const { team, leader, members } = req.body

    await sequelize.query(
      `UPDATE teams SET team_name = :team_name, institution_name = :institution_name, payment_proof = :payment_proof, user_id = :user_id, email = :email WHERE team_id = :team_id`,
      {
        replacements: {
          team_name: team.team_name,
          institution_name: team.institution_name,
          payment_proof: team.payment_proof,
          user_id: team.user_id,
          email: team.email,
          team_id: team.team_id,
        },
        type: QueryTypes.UPDATE,
      }
    )

    await sequelize.query(
      `UPDATE members SET full_name = :full_name, department = :department, batch = :batch, phone_number = :phone_number, line_id = :line_id, email = :email, ktm = :ktm, active_student_letter = :active_student_letter, photo = :photo, twibbon_and_poster_link = :twibbon_and_poster_link WHERE member_id = :member_id`,
      {
        replacements: {
          ...leader,
          member_id: leader.member_id,
        },
        type: QueryTypes.UPDATE,
      }
    )

    await Promise.all(
      members.map(async (member) => {
        await sequelize.query(
          `UPDATE members SET full_name = :full_name, department = :department, batch = :batch, phone_number = :phone_number, line_id = :line_id, email = :email, ktm = :ktm, active_student_letter = :active_student_letter, photo = :photo, twibbon_and_poster_link = :twibbon_and_poster_link WHERE member_id = :member_id`,
          {
            replacements: {
              ...member,
              member_id: member.member_id,
            },
            type: QueryTypes.UPDATE,
          }
        )
      })
    )

    res.status(200).json({
      message: 'Team and members updated successfully',
    })
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    })
  }
})

/**
 * @swagger
 * /api/teams/cic/delete/{teamId}:
 *   delete:
 *     summary: Delete a CIC team
 *     tags: [CIC Teams]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team deleted successfully
 */
router.delete(
  '/teams/cic/delete/:teamId',
  authenticateToken,
  async (req, res) => {
    const teamId = req.params.teamId

    try {
      // Delete members first
      await sequelize.query(`DELETE FROM members WHERE team_id = :teamId`, {
        replacements: {
          teamId: teamId,
        },
        type: QueryTypes.DELETE,
      })

      // Then delete the team
      await sequelize.query(`DELETE FROM teams WHERE team_id = :teamId`, {
        replacements: {
          teamId: teamId,
        },
        type: QueryTypes.DELETE,
      })

      res.status(200).json({
        message: 'Team and members have been deleted.',
      })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Internal Server Error' })
    }
  }
)

/**
 * @swagger
 * components:
 *   schemas:
 *     Team:
 *       type: object
 *       properties:
 *         team_id:
 *           type: integer
 *         team_name:
 *           type: string
 *         institution_name:
 *           type: string
 *         payment_proof:
 *           type: string
 *         user_id:
 *           type: integer
 *         email:
 *           type: string
 *         event_id:
 *           type: integer
 *     Member:
 *       type: object
 *       properties:
 *         member_id:
 *           type: integer
 *         full_name:
 *           type: string
 *         department:
 *           type: string
 *         batch:
 *           type: string
 *         phone_number:
 *           type: string
 *         line_id:
 *           type: string
 *         email:
 *           type: string
 *         ktm:
 *           type: string
 *         active_student_letter:
 *           type: string
 *         photo:
 *           type: string
 *         twibbon_and_poster_link:
 *           type: string
 *     MemberInput:
 *       type: object
 *       required:
 *         - full_name
 *         - department
 *         - email
 *       properties:
 *         full_name:
 *           type: string
 *         department:
 *           type: string
 *         batch:
 *           type: string
 *         phone_number:
 *           type: string
 *         line_id:
 *           type: string
 *         email:
 *           type: string
 */

module.exports = router
