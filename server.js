const express = require('express')
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const bodyParser = require('body-parser')
const fs = require('fs')
const http = require('http')
const cors = require('cors')

const app = express()
const port = 5001

const userRouter = require('./routes/users')
const teamRouter = require('./routes/teams')
const cicRouter = require('./routes/cic')
const sbcRouter = require('./routes/sbc')
const fcecRouter = require('./routes/fcec')
const craftRouter = require('./routes/craft')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CIA 2025 API',
      version: '1.0.0',
      description: 'API documentation for CIA 2025',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/*.js'], // path to your API routes
}

const specs = swaggerJsdoc(options)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  res.send('Hello from the backend!')
})

app.use('/api', userRouter)
app.use('/api', cicRouter)
app.use('/api', teamRouter)
app.use('/api', sbcRouter)
app.use('/api', fcecRouter)
app.use('/api', craftRouter)

// Buat server HTTPS
const server = http.createServer(app)

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
