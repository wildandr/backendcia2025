const express = require('express')
const Craft = require('../models/craft.js')
const authenticateToken = require('../middleware/authenticateToken.js')
const router = express.Router()
const { ValidationError } = require('sequelize')

/**
 * @swagger
 * /api/crafts:
 *   get:
 *     tags: [Craft]
 *     summary: Get all craft participants
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all craft participants
 *       500:
 *         description: Internal Server Error
 */
router.get('/crafts', authenticateToken, async (req, res) => {
  try {
    const crafts = await Craft.findAll()
    res.json(crafts)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/**
 * @swagger
 * /api/crafts/participant/{participant_id}:
 *   get:
 *     tags: [Craft]
 *     summary: Get craft participant by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participant_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Craft participant details
 *       404:
 *         description: Participant not found
 *       500:
 *         description: Internal Server Error
 */
router.get(
  '/crafts/participant/:participant_id',
  authenticateToken,
  async (req, res) => {
    try {
      const craft = await Craft.findOne({
        where: { participant_id: req.params.participant_id },
      })
      if (craft === null) {
        return res
          .status(404)
          .json({ message: 'Data peserta craft tidak ditemukan' })
      }
      res.json(craft)
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

/**
 * @swagger
 * /api/crafts/user/{user_id}:
 *   get:
 *     tags: [Craft]
 *     summary: Get craft participant by user ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Craft participant details
 *       404:
 *         description: No registration history found
 *       500:
 *         description: Internal Server Error
 */
// Ambil data peserta craft berdasarkan id pengguna
router.get('/crafts/user/:user_id', authenticateToken, async (req, res) => {
  try {
    const craft = await Craft.findOne({
      where: { user_id: req.params.user_id },
    })
    if (craft === null) {
      return res.status(404).json({
        message: 'Akun ini tidak memiliki riwayat pendaftaran CRAFT',
      })
    }
    res.json(craft)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/**
 * @swagger
 * /api/crafts/register:
 *   post:
 *     tags: [Craft]
 *     summary: Register new craft participant
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               institution_name:
 *                 type: string
 *               user_id:
 *                 type: string
 *               activity_choice:
 *                 type: string
 *               whatsapp_number:
 *                 type: string
 *               isMahasiswaDTSL:
 *                 type: boolean
 *               ktm:
 *                 type: string
 *               payment_proof:
 *                 type: string
 *               email:
 *                 type: string
 *               bukti_follow_cia:
 *                 type: string
 *               bukti_follow_pktsl:
 *                 type: string
 *               bukti_story:
 *                 type: string
 *               bundling_member:
 *                 type: string
 *     responses:
 *       201:
 *         description: Successfully registered
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal Server Error
 */
router.post('/crafts/register', authenticateToken, async (req, res) => {
  try {
    const craft = await Craft.create({
      full_name: req.body.full_name,
      institution_name: req.body.institution_name,
      user_id: req.body.user_id,
      activity_choice: req.body.activity_choice,
      whatsapp_number: req.body.whatsapp_number,
      isMahasiswaDTSL: req.body.isMahasiswaDTSL,
      ktm: req.body.ktm,
      payment_proof: req.body.payment_proof,
      email: req.body.email,
      isVerified: req.body.isVerified,
      bukti_follow_cia: req.body.bukti_follow_cia,
      bukti_follow_pktsl: req.body.bukti_follow_pktsl,
      bukti_story: req.body.bukti_story,
      bundling_member: req.body.bundling_member,
    })
    res.status(201).json({
      message: 'Berhasil menambahkan peserta craft baru',
      data: craft,
    })
  } catch (err) {
    console.error(err)
    if (err instanceof ValidationError) {
      res.status(400).json({ message: err.message })
    } else {
      res.status(500).json({ message: 'Internal Server Error' })
    }
  }
})

/**
 * @swagger
 * /api/crafts/verify/{participant_id}:
 *   put:
 *     tags: [Craft]
 *     summary: Verify craft participant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participant_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant verified successfully
 *       404:
 *         description: Participant not found
 *       500:
 *         description: Internal Server Error
 */
// Update isVerified field to true
router.put(
  '/crafts/verify/:participant_id',
  authenticateToken,
  async (req, res) => {
    try {
      const craft = await Craft.findOne({
        where: { participant_id: req.params.participant_id },
      })
      if (!craft) {
        return res.status(404).json({ message: 'Participant not found' })
      }
      craft.isVerified = true
      await craft.save()
      res.json({ message: 'Participant has been verified', data: craft })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Internal Server Error' })
    }
  }
)

/**
 * @swagger
 * /api/crafts/reject/{participant_id}:
 *   put:
 *     tags: [Craft]
 *     summary: Reject craft participant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participant_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant rejected successfully
 *       404:
 *         description: Participant not found
 *       500:
 *         description: Internal Server Error
 */
// Update isRejected field to true
router.put(
  '/crafts/reject/:participant_id',
  authenticateToken,
  async (req, res) => {
    try {
      const craft = await Craft.findOne({
        where: { participant_id: req.params.participant_id },
      })
      if (!craft) {
        return res.status(404).json({ message: 'Participant not found' })
      }
      craft.isRejected = true
      craft.rejectMessage = req.body.rejectMessage
      await craft.save()
      res.json({ message: 'Participant has been rejected', data: craft })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Internal Server Error' })
    }
  }
)

/**
 * @swagger
 * /api/crafts/edit/{participant_id}:
 *   put:
 *     tags: [Craft]
 *     summary: Edit craft participant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participant_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               institution_name:
 *                 type: string
 *               user_id:
 *                 type: string
 *               activity_choice:
 *                 type: string
 *               whatsapp_number:
 *                 type: string
 *               isMahasiswaDTSL:
 *                 type: boolean
 *               ktm:
 *                 type: string
 *               payment_proof:
 *                 type: string
 *               email:
 *                 type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Participant edited successfully
 *       404:
 *         description: Participant not found
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal Server Error
 */
// Update data peserta craft
router.put(
  '/crafts/edit/:participant_id',
  authenticateToken,
  async (req, res) => {
    try {
      const craft = await Craft.update(
        {
          full_name: req.body.full_name,
          institution_name: req.body.institution_name,
          user_id: req.body.user_id,
          activity_choice: req.body.activity_choice,
          whatsapp_number: req.body.whatsapp_number,
          isMahasiswaDTSL: req.body.isMahasiswaDTSL,
          ktm: req.body.ktm,
          payment_proof: req.body.payment_proof,
          email: req.body.email,
          isVerified: req.body.isVerified,
        },
        {
          where: {
            participant_id: req.params.participant_id,
          },
        }
      )
      if (craft[0] === 0) {
        res.status(404).json({
          message: 'Peserta craft dengan ID tersebut tidak ditemukan',
        })
      } else {
        res.status(200).json({
          message: 'Berhasil memperbarui data peserta craft',
          data: craft,
        })
      }
    } catch (err) {
      console.error(err)
      if (err instanceof ValidationError) {
        res.status(400).json({ message: err.message })
      } else {
        res.status(500).json({ message: 'Internal Server Error' })
      }
    }
  }
)

/**
 * @swagger
 * /api/crafts/delete/{participantId}:
 *   delete:
 *     tags: [Craft]
 *     summary: Delete craft participant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Participant deleted successfully
 *       404:
 *         description: Participant not found
 *       500:
 *         description: Internal Server Error
 */
router.delete(
  '/crafts/delete/:participantId',
  authenticateToken,
  async (req, res) => {
    const participantId = req.params.participantId

    try {
      const craft = await Craft.destroy({
        where: {
          participant_id: participantId,
        },
      })

      if (craft) {
        res.status(200).json({
          message: 'Participant has been deleted.',
        })
      } else {
        res.status(404).json({ message: 'Participant not found.' })
      }
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Internal Server Error' })
    }
  }
)

module.exports = router
