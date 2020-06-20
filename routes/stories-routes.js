const express = require('express')
const { check } = require('express-validator')

const storiesControllers = require('../controllers/stories-controller')
const fileUpload = require('../middleware/file-upload')
const checkAuth = require('../middleware/check-auth')

const router = express.Router()

router.get('/:sid', storiesControllers.getStoryById )

router.get('/user/:uid', storiesControllers.getStoriesByUserId)

router.use(checkAuth)

router.post(
  '/', 
  fileUpload.single('image'),
  [
    check('title').not().isEmpty(), 
    check('description').isLength({ min: 5 }),
    check('content').isLength({min: 25 }),
    check('genre').not().isEmpty()
  ],
    storiesControllers.createStory
)

router.patch('/:sid', 
  [
    check('title').not().isEmpty(),
    check('description').isLength({ min: 5 }),
    check('content').isLength({ min: 25 })
  ], 
storiesControllers.updateStory )

router.delete('/:sid', storiesControllers.deleteStory)

module.exports = router
