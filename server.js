const express = require('express')
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

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  res.send('Hello from the backend!')
})

app.use('/endpoint', userRouter)
app.use('/endpoint', cicRouter)
app.use('/endpoint', teamRouter)
app.use('/endpoint', sbcRouter)
app.use('/endpoint', fcecRouter)
app.use('/endpoint', craftRouter)

// Buat server HTTPS
const server = http.createServer(app)

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
