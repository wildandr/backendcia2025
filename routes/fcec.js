const express = require('express')
const router = express.Router()
const { QueryTypes } = require('sequelize')
const sequelize = require('../config/database')
const authenticateToken = require('../middleware/authenticateToken')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

// Create uploads/fcec directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads/fcec')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/fcec')
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

const uploadFields = [
  { name: 'abstract_file', maxCount: 1 },
  { name: 'originality_statement', maxCount: 1 },
  { name: 'leader_ktm', maxCount: 1 },
  { name: 'leader_active_student_letter', maxCount: 1 },
  { name: 'leader_photo', maxCount: 1 },
  { name: 'member1_ktm', maxCount: 1 },
  { name: 'member1_active_student_letter', maxCount: 1 },
  { name: 'member1_photo', maxCount: 1 },
  { name: 'member2_ktm', maxCount: 1 },
  { name: 'member2_active_student_letter', maxCount: 1 },
  { name: 'member2_photo', maxCount: 1 },
]

/**
 * @swagger
 * /api/teams/fcec:
 *   get:
 *     tags:
 *       - FCEC
 *     summary: Get all FCEC teams
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success retrieving teams
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   team:
 *                     type: object
 *                   leader:
 *                     type: object
 *                   members:
 *                     type: array
 *                   fcec:
 *                     type: array
 *       404:
 *         description: No teams found
 *       500:
 *         description: Server error
 */
router.get('/teams/fcec', authenticateToken, async (req, res) => {
  try {
    const eventId = 1

    const teams = await sequelize.query(
      `SELECT * FROM teams WHERE event_id = :eventId`,
      {
        replacements: { eventId },
        type: QueryTypes.SELECT,
      }
    )

    if (!teams.length) {
      return res.status(404).json({ message: 'No teams found for FCEC' })
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

        const fcec = await sequelize.query(
          `SELECT * FROM fcec WHERE team_id = :teamId`,
          {
            replacements: { teamId: team.team_id },
            type: QueryTypes.SELECT,
          }
        )

        const leader = members.find((member) => member.is_leader === 1)
        const memberList = members.filter((member) => member.is_leader === 0)

        return {
          team,
          leader,
          members: memberList,
          fcec,
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
 * /api/teams/fcec/{teamId}:
 *   get:
 *     tags:
 *       - FCEC
 *     summary: Get FCEC team by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the team to retrieve
 *     responses:
 *       200:
 *         description: Team details retrieved successfully
 *       404:
 *         description: Team not found
 *       500:
 *         description: Server error
 */
router.get('/teams/fcec/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params
    const eventId = 1

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

    const fcec = await sequelize.query(
      `SELECT * FROM fcec WHERE team_id = :teamId`,
      {
        replacements: { teamId },
        type: QueryTypes.SELECT,
      }
    )

    const leader = members.find((member) => member.is_leader === 1)
    const memberList = members.filter((member) => member.is_leader === 0)

    const result = {
      team,
      leader,
      members: memberList,
      fcec,
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
 * /api/teams/fcec/new:
 *   post:
 *     tags:
 *       - FCEC
 *     summary: Create new FCEC team
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
 *                 properties:
 *                   team_name:
 *                     type: string
 *                   institution_name:
 *                     type: string
 *                   payment_proof:
 *                     type: string
 *                   user_id:
 *                     type: integer
 *               leader:
 *                 type: object
 *               members:
 *                 type: array
 *               fcec:
 *                 type: array
 *     responses:
 *       201:
 *         description: Team created successfully
 *       500:
 *         description: Server error
 */
router.post(
  '/teams/fcec/new',
  authenticateToken,
  upload.fields([
    { name: 'abstract_file', maxCount: 1 },
    { name: 'originality_statement', maxCount: 1 },
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
  ]),
  async (req, res) => {
    try {
      const { team, leader, members, fcec } = JSON.parse(req.body.data)

      // Check if team name already exists
      const existingTeam = await sequelize.query(
        `SELECT team_id FROM teams WHERE team_name = :team_name AND event_id = :event_id`,
        {
          replacements: {
            team_name: team.team_name,
            event_id: 1, // FCEC event_id
          },
          type: QueryTypes.SELECT,
        }
      )

      if (existingTeam.length > 0) {
        // Delete uploaded files if team exists
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

      // Handle FCEC specific files
      const abstractFile = req.files.abstract_file
        ? req.files.abstract_file[0].path
        : null
      const originalityStatement = req.files.originality_statement
        ? req.files.originality_statement[0].path
        : null

      // Create team
      const [teamId] = await sequelize.query(
        `INSERT INTO teams (team_name, institution_name, payment_proof, event_id, user_id, email, voucher) 
         VALUES (:team_name, :institution_name, :payment_proof, :event_id, :user_id, :email, :voucher)`,
        {
          replacements: {
            ...team,
            event_id: 1,
            voucher: null,
          },
          type: QueryTypes.INSERT,
        }
      )

      // Handle leader files
      const leaderFiles = {
        ktm: req.files.leader_ktm ? req.files.leader_ktm[0].path : null,
        active_student_letter: req.files.leader_active_student_letter
          ? req.files.leader_active_student_letter[0].path
          : null,
        photo: req.files.leader_photo ? req.files.leader_photo[0].path : null,
      }

      // Insert leader
      await sequelize.query(
        `INSERT INTO members (team_id, full_name, department, batch, phone_number, line_id, email, ktm, active_student_letter, photo, twibbon_and_poster_link, is_leader) 
         VALUES (:teamId, :full_name, :department, :batch, :phone_number, :line_id, :email, :ktm, :active_student_letter, :photo, :twibbon_and_poster_link, :is_leader)`,
        {
          replacements: {
            ...leader,
            ...leaderFiles,
            teamId,
            is_leader: 1,
          },
          type: QueryTypes.INSERT,
        }
      )

      // Handle member files and insert members
      await Promise.all(
        members.map(async (member, index) => {
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
            `INSERT INTO members (team_id, full_name, department, batch, phone_number, line_id, email, ktm, active_student_letter, photo, twibbon_and_poster_link, is_leader) 
             VALUES (:teamId, :full_name, :department, :batch, :phone_number, :line_id, :email, :ktm, :active_student_letter, :photo, :twibbon_and_poster_link, :is_leader)`,
            {
              replacements: {
                ...member,
                ...memberFiles,
                teamId,
                is_leader: 0,
              },
              type: QueryTypes.INSERT,
            }
          )
        })
      )

      // Insert FCEC specific data
      await sequelize.query(
        `INSERT INTO fcec (team_id, originality_statement, abstract_title, abstract_file, abstract_video_link) 
         VALUES (:teamId, :originality_statement, :abstract_title, :abstract_file, :abstract_video_link)`,
        {
          replacements: {
            ...fcec,
            teamId,
            abstract_file: abstractFile,
            originality_statement: originalityStatement,
          },
          type: QueryTypes.INSERT,
        }
      )

      res.status(201).json({
        message: 'Team created successfully',
      })
    } catch (error) {
      // Delete uploaded files if there's an error
      if (req.files) {
        Object.values(req.files).forEach((files) => {
          files.forEach((file) => {
            fs.unlinkSync(file.path)
          })
        })
      }
      res.status(500).json({
        message: 'An error occurred',
        error: error.message,
      })
    }
  }
)

/**
 * @swagger
 * /api/teams/fcec/delete/{teamId}:
 *   delete:
 *     tags:
 *       - FCEC
 *     summary: Delete FCEC team and related data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the team to delete
 *     responses:
 *       200:
 *         description: Team deleted successfully
 *       500:
 *         description: Server error
 */
router.delete(
  '/teams/fcec/delete/:teamId',
  authenticateToken,
  async (req, res) => {
    const teamId = req.params.teamId

    try {
      // Delete from fcec table
      await sequelize.query(`DELETE FROM fcec WHERE team_id = :team_id`, {
        replacements: { team_id: teamId },
        type: QueryTypes.DELETE,
      })

      // Delete from members table
      await sequelize.query(`DELETE FROM members WHERE team_id = :team_id`, {
        replacements: { team_id: teamId },
        type: QueryTypes.DELETE,
      })

      // Delete from teams table
      await sequelize.query(`DELETE FROM teams WHERE team_id = :team_id`, {
        replacements: { team_id: teamId },
        type: QueryTypes.DELETE,
      })

      res.status(200).json({
        message: 'Team and related data have been deleted.',
      })
    } catch (error) {
      res.status(500).json({
        message: 'An error occurred',
        error: error.message,
      })
    }
  }
)

/**
 * @swagger
 * /api/fcec-participant:
 *   get:
 *     tags:
 *       - FCEC
 *     summary: Get all FCEC participants with detailed information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success retrieving participants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       data:
 *                         type: object
 *                       download:
 *                         type: object
 *       404:
 *         description: No participants found
 *       500:
 *         description: Server error
 */
router.get('/fcec-participant', authenticateToken, async (req, res) => {
  try {
    const members = await sequelize.query(
      `
  SELECT 
    members.full_name, teams.team_name, fcec.abstract_title, teams.institution_name, members.department, members.batch, members.nim, members.semester, members.phone_number, members.line_id, members.email, teams.email AS team_email, members.is_leader, members.twibbon_and_poster_link, fcec.abstract_video_link, teams.isVerified, teams.isRejected, teams.rejectMessage, fcec.originality_statement, fcec.abstract_file, members.ktm, members.photo, members.active_student_letter, teams.payment_proof, teams.voucher, teams.team_id
  FROM 
    teams
  INNER JOIN
    members
  ON
    teams.team_id = members.team_id
  INNER JOIN
    fcec
  ON
    teams.team_id = fcec.team_id
  WHERE 
    teams.event_id = 1
`,
      {
        type: QueryTypes.SELECT,
      }
    )

    if (members.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No members found',
      })
    }

    const modifiedMembers = members.map((member) => {
      const {
        voucher,
        active_student_letter,
        ktm,
        photo,
        abstract_file,
        originality_statement,
        team_name,
        team_id,
        ...otherData
      } = member
      return {
        data: { ...otherData, team_name, team_id },
        download: {
          voucher,
          active_student_letter,
          ktm,
          photo,
          abstract_file,
          originality_statement,
        },
      }
    })

    res.status(200).json({
      status: 'success',
      members: modifiedMembers,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving the members',
    })
  }
})

module.exports = router
