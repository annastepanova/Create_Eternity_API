if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const fs = require('fs')
const path = require('path')

const express = require('express')
const bodyParser = require('body-parser')
const mongoose =  require('mongoose')

const storiesRoutes = require('./routes/stories-routes')
const usersRoutes = require('./routes/users-routes')
const HttpError = require('./models/http-error')

const app = express()

app.use(bodyParser.json())

app.use('/uploads/images', express.static(path.join('uploads', 'images')))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
  next()
})

app.use('/api/stories', storiesRoutes)
app.use('/api/users', usersRoutes)

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route', 404)
  throw error
})

app.use((error, req, res, next) => {
  if(req.file) {
    fs.unlink(req.file.path, err => {
      console.log(err)
    })
  }

  if (res.headerSent) {
    return next(error)
  }
  res.status(error.code || 500)
  res.json({message: error.message || 'Unknown error occurred'})
})

const port = process.env.PORT || 5000

mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-xdon8.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`)
.then(() => {
  app.listen(port, () => { console.log(`API listening on ${port}`) })
})
.catch(err => {
  console.log(err)
})


