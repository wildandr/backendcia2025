const express = require('express')
const router = express.Router()
const { QueryTypes } = require('sequelize')
const sequelize = require('../config/database')
const authenticateToken = require('../middleware/authenticateToken')
const { Team } = require('../models/team')

/**
 * @swagger
 * /api/teams:
 *   get:
 *     tags:
 *       - Teams
 *     summary: Get all teams
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all teams with their members
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
 *                   leader:
 *                     type: object
 *                   members:
 *                     type: array
 *       404:
 *         description: No teams found
 *       500:
 *         description: Server error
 */
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const teams = await sequelize.query(`SELECT * FROM teams`, {
      type: QueryTypes.SELECT,
    })

    if (!teams.length) {
      return res.status(404).json({ message: 'Tidak ada tim ditemukan' })
    }

    const result = await Promise.all(
      teams.map(async (team) => {
        const members = await sequelize.query(
          `SELECT * FROM Members WHERE team_id = :teamId ORDER BY is_leader DESC`,
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
 * /api/teams/{team_id}/verify:
 *   put:
 *     tags:
 *       - Teams
 *     summary: Verify a team
 *     parameters:
 *       - in: path
 *         name: team_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Team successfully verified
 *       404:
 *         description: Team not found
 *       500:
 *         description: Server error
 */
router.put('/teams/:team_id/verify', async (req, res) => {
  try {
    const team = await sequelize.query(
      'SELECT * FROM teams WHERE team_id = :team_id',
      {
        replacements: { team_id: req.params.team_id },
        type: QueryTypes.SELECT,
      }
    )

    if (!team || team.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Tim tidak ditemukan',
      })
    }

    await sequelize.query(
      'UPDATE teams SET isVerified = true WHERE team_id = :team_id',
      {
        replacements: { team_id: req.params.team_id },
        type: QueryTypes.UPDATE,
      }
    )

    res.status(200).json({
      status: 'success',
      message: 'Tim Berhasil Diverifikasi',
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      status: 'error',
      message: 'Kesalahan saat memverifikasi tim',
    })
  }
})

/**
 * @swagger
 * /api/teams/update:
 *   put:
 *     tags:
 *       - Teams
 *     summary: Update team and member information
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
 *                   team_id:
 *                     type: integer
 *                   team_name:
 *                     type: string
 *               leader:
 *                 type: object
 *               members:
 *                 type: array
 *     responses:
 *       200:
 *         description: Team updated successfully
 *       500:
 *         description: Server error
 */
router.put('/teams/update', authenticateToken, async (req, res) => {
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
 * /api/teams/{team_id}/reject:
 *   put:
 *     tags:
 *       - Teams
 *     summary: Reject a team
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: team_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rejectMessage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Team rejection updated successfully
 *       500:
 *         description: Server error
 */
router.put('/teams/:team_id/reject', authenticateToken, async (req, res) => {
  try {
    const { rejectMessage } = req.body
    const { team_id } = req.params

    await sequelize.query(
      `UPDATE teams SET isRejected = :isRejected, rejectMessage = :rejectMessage WHERE team_id = :team_id`,
      {
        replacements: {
          isRejected: true,
          rejectMessage: rejectMessage,
          team_id: team_id,
        },
        type: QueryTypes.UPDATE,
      }
    )

    res.status(200).json({
      message: 'Team rejection status updated successfully',
    })
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred',
      error: error.message,
    })
  }
})

module.exports = router
