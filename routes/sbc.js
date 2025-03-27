const express = require('express')
const router = express.Router()
const { QueryTypes } = require('sequelize')
const sequelize = require('../config/database')
const authenticateToken = require('../middleware/authenticateToken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/sbc'
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true })
    }
    cb(null, uploadPath)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    )
  },
})

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true)
    } else {
      cb(new Error('Only images and PDF files are allowed!'))
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

/**
 * @swagger
 * /api/teams/sbc:
 *   get:
 *     tags:
 *       - SBC
 *     summary: Get all SBC teams
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
 *                   team: object
 *                   leader: object
 *                   members: array
 *                   dosbim: array
 *                   sbc: array
 *                   event: string
 *       404:
 *         description: No teams found
 *       500:
 *         description: Server error
 */
router.get('/teams/sbc', authenticateToken, async (req, res) => {
  try {
    const eventId = 3

    const event = await sequelize.query(
      `SELECT event_name FROM events WHERE event_id = :eventId`,
      {
        replacements: { eventId },
        type: QueryTypes.SELECT,
      }
    )

    const teams = await sequelize.query(
      `SELECT * FROM teams WHERE event_id = :eventId`,
      {
        replacements: { eventId },
        type: QueryTypes.SELECT,
      }
    )

    if (!teams.length) {
      return res.status(404).json({ message: 'No teams found for SBC' })
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

        const dosbim = await sequelize.query(
          `SELECT * FROM dosbim WHERE team_id = :teamId`,
          {
            replacements: { teamId: team.team_id },
            type: QueryTypes.SELECT,
          }
        )

        const sbc = await sequelize.query(
          `SELECT * FROM sbc WHERE team_id = :teamId`,
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
          dosbim,
          sbc,
          event: event[0].event_name,
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
 * /api/teams/sbc/{teamId}:
 *   get:
 *     tags:
 *       - SBC
 *     summary: Get SBC team by ID
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
 *         description: Team details retrieved successfully
 *       404:
 *         description: Team not found
 *       500:
 *         description: Server error
 */
router.get('/teams/sbc/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params
    const eventId = 3

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

    const dosbim = await sequelize.query(
      `SELECT * FROM dosbim WHERE team_id = :teamId`,
      {
        replacements: { teamId },
        type: QueryTypes.SELECT,
      }
    )

    const sbc = await sequelize.query(
      `SELECT * FROM sbc WHERE team_id = :teamId`,
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
      dosbim,
      sbc,
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
 * /api/teams/sbc/new:
 *   post:
 *     tags:
 *       - SBC
 *     summary: Create new SBC team
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
 *                   team_name: string
 *                   institution_name: string
 *                   payment_proof: string
 *                   user_id: integer
 *                   voucher: string
 *               leader:
 *                 type: object
 *               members:
 *                 type: array
 *               dosbim:
 *                 type: array
 *               sbc:
 *                 type: array
 *     responses:
 *       201:
 *         description: Team created successfully
 *       500:
 *         description: Server error
 */
router.post(
  '/teams/sbc/new',
  authenticateToken,
  upload.fields([
    { name: 'payment_proof', maxCount: 1 },
    { name: 'voucher', maxCount: 1 },
    { name: 'leader_ktm', maxCount: 1 },
    { name: 'leader_active_student_letter', maxCount: 1 },
    { name: 'leader_photo', maxCount: 1 },
    { name: 'member1_ktm', maxCount: 1 },
    { name: 'member1_active_student_letter', maxCount: 1 },
    { name: 'member1_photo', maxCount: 1 },
    { name: 'member2_ktm', maxCount: 1 },
    { name: 'member2_active_student_letter', maxCount: 1 },
    { name: 'member2_photo', maxCount: 1 },
    { name: 'dosbim_photo', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { team, leader, members, dosbim, sbc } = JSON.parse(req.body.data)
      const userId = req.user.user_id

      // Process uploaded files
      const payment_proof = req.files['payment_proof']
        ? req.files['payment_proof'][0].path
        : null
      const voucher = req.files['voucher'] ? req.files['voucher'][0].path : null

      const createdTeam = await sequelize.query(
        `INSERT INTO teams (team_name, institution_name, payment_proof, user_id, event_id, voucher) VALUES (:team_name, :institution_name, :payment_proof, :user_id, 3, :voucher)`,
        {
          replacements: {
            team_name: team.team_name,
            institution_name: team.institution_name,
            payment_proof: payment_proof,
            user_id: userId,
            voucher: voucher,
          },
          type: QueryTypes.INSERT,
        }
      )

      const teamId = createdTeam[0]

      // Process leader files
      const leaderFiles = {
        ktm: req.files['leader_ktm'] ? req.files['leader_ktm'][0].path : null,
        active_student_letter: req.files['leader_active_student_letter']
          ? req.files['leader_active_student_letter'][0].path
          : null,
        photo: req.files['leader_photo']
          ? req.files['leader_photo'][0].path
          : null,
      }

      const createdLeader = await sequelize.query(
        `INSERT INTO members (team_id, full_name, batch, phone_number, line_id, email, ktm, active_student_letter, photo, twibbon_and_poster_link, is_leader, nim) VALUES (:team_id, :full_name, :batch, :phone_number, :line_id, :email, :ktm, :active_student_letter, :photo, :twibbon_and_poster_link, 1, :nim)`,
        {
          replacements: {
            ...leader,
            team_id: teamId,
            ktm: leaderFiles.ktm,
            active_student_letter: leaderFiles.active_student_letter,
            photo: leaderFiles.photo,
          },
          type: QueryTypes.INSERT,
        }
      )

      // Process members files and create members
      const createdmembers = await Promise.all(
        members.map(async (member, index) => {
          const memberFiles = {
            ktm: req.files[`member${index + 1}_ktm`]
              ? req.files[`member${index + 1}_ktm`][0].path
              : null,
            active_student_letter: req.files[
              `member${index + 1}_active_student_letter`
            ]
              ? req.files[`member${index + 1}_active_student_letter`][0].path
              : null,
            photo: req.files[`member${index + 1}_photo`]
              ? req.files[`member${index + 1}_photo`][0].path
              : null,
          }

          return sequelize.query(
            `INSERT INTO members (team_id, full_name, batch, phone_number, line_id, email, ktm, active_student_letter, photo, twibbon_and_poster_link, is_leader, nim) VALUES (:team_id, :full_name, :batch, :phone_number, :line_id, :email, :ktm, :active_student_letter, :photo, :twibbon_and_poster_link, 0, :nim)`,
            {
              replacements: {
                ...member,
                team_id: teamId,
                ktm: memberFiles.ktm,
                active_student_letter: memberFiles.active_student_letter,
                photo: memberFiles.photo,
              },
              type: QueryTypes.INSERT,
            }
          )
        })
      )

      // Process dosbim photo
      const dosbimPhoto = req.files['dosbim_photo']
        ? req.files['dosbim_photo'][0].path
        : null

      const createdDosbim = await sequelize.query(
        `INSERT INTO dosbim (team_id, full_name, nip, email, phone_number, photo) VALUES (:team_id, :full_name, :nip, :email, :phone_number, :photo)`,
        {
          replacements: {
            ...dosbim[0],
            team_id: teamId,
            photo: dosbimPhoto,
          },
          type: QueryTypes.INSERT,
        }
      )

      const createdSbc = await sequelize.query(
        `INSERT INTO sbc (team_id, bridge_name) VALUES (:team_id, :bridge_name)`,
        {
          replacements: {
            ...sbc[0],
            team_id: teamId,
          },
          type: QueryTypes.INSERT,
        }
      )

      res.status(201).json({
        message: 'Team created successfully',
        team: createdTeam,
        leader: createdLeader,
        members: createdmembers,
        dosbim: createdDosbim,
        sbc: createdSbc,
      })
    } catch (error) {
      // Delete uploaded files if there's an error
      if (req.files) {
        Object.values(req.files).forEach((fileArray) => {
          fileArray.forEach((file) => {
            fs.unlink(file.path, (err) => {
              if (err) console.error('Error deleting file:', err)
            })
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
 * /api/teams/sbc/delete/{teamId}:
 *   delete:
 *     tags:
 *       - SBC
 *     summary: Delete SBC team and related data
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
 *       500:
 *         description: Server error
 */
router.delete(
  '/teams/sbc/delete/:teamId',
  authenticateToken,
  async (req, res) => {
    try {
      const teamId = req.params.teamId

      await sequelize.query(`DELETE FROM dosbim WHERE team_id = :team_id`, {
        replacements: { team_id: teamId },
        type: QueryTypes.DELETE,
      })

      await sequelize.query(`DELETE FROM sbc WHERE team_id = :team_id`, {
        replacements: { team_id: teamId },
        type: QueryTypes.DELETE,
      })

      await sequelize.query(`DELETE FROM members WHERE team_id = :team_id`, {
        replacements: { team_id: teamId },
        type: QueryTypes.DELETE,
      })

      await sequelize.query(`DELETE FROM teams WHERE team_id = :team_id`, {
        replacements: { team_id: teamId },
        type: QueryTypes.DELETE,
      })

      res.status(200).json({
        message: 'All related data has been deleted.',
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
 * /api/sbc-participant:
 *   get:
 *     tags:
 *       - SBC
 *     summary: Get all SBC participants with detailed information
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
 *                 status: string
 *                 participants: array
 *       404:
 *         description: No participants found
 *       500:
 *         description: Server error
 */
router.get('/sbc-participant', authenticateToken, async (req, res) => {
  try {
    const participants = await sequelize.query(
      `
  SELECT 
    members.*, teams.*, sbc.bridge_name, dosbim.advisor_id AS dosbim_advisor_id, dosbim.team_id AS dosbim_team_id, dosbim.full_name AS dosbim_full_name, dosbim.nip AS dosbim_nip, dosbim.email AS dosbim_email, dosbim.phone_number AS dosbim_phone_number, dosbim.photo AS dosbim_photo
  FROM 
    members
  INNER JOIN
    teams
  ON
    members.team_id = teams.team_id
  INNER JOIN
    sbc
  ON
    teams.team_id = sbc.team_id
  INNER JOIN
    dosbim
  ON
    teams.team_id = dosbim.team_id
  WHERE 
    teams.event_id = 3
`,
      {
        type: QueryTypes.SELECT,
      }
    )

    if (participants.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No participants found',
      })
    }

    const modifiedParticipants = participants.map((participant) => {
      const {
        dosbim_advisor_id,
        dosbim_team_id,
        dosbim_full_name,
        dosbim_nip,
        dosbim_email,
        dosbim_phone_number,
        dosbim_photo,
        ktm,
        active_student_letter,
        photo,
        payment_proof,
        voucher,
        ...otherData
      } = participant
      return {
        ...otherData,
        dosbim: {
          advisor_id: dosbim_advisor_id,
          team_id: dosbim_team_id,
          full_name: dosbim_full_name,
          nip: dosbim_nip,
          email: dosbim_email,
          phone_number: dosbim_phone_number,
          photo: dosbim_photo,
        },
        download: {
          ktm,
          active_student_letter,
          photo,
          payment_proof,
          voucher,
        },
      }
    })

    res.status(200).json({
      status: 'success',
      participants: modifiedParticipants,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while retrieving the participants',
    })
  }
})
module.exports = router
