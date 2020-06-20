const fs = require('fs')

const { validationResult } = require('express-validator')
const mongoose = require('mongoose')

const HttpError = require('../models/http-error')
const Story = require('../models/story')
const User = require('../models/user')


const getStoryById = async (req, res, next) => {
  const storyId = req.params.sid

  let story
  try {
    story = await Story.findById(storyId)
  }
  catch (err) {
    const error = new HttpError('Could not find a story', 500)
    return next(error)
  }
  

  if (!story) {
    const error = new HttpError("Can't find story for the provided id", 404)
    return next(error)
  }

  res.json({ story: story.toObject({getters: true}) })

}

const getStoriesByUserId = async (req, res, next) => {
  const userId = req.params.uid


  let userWithStories
  try {
    userWithStories = await User.findById(userId).populate('stories');
  } catch (err) {
    const error = new HttpError(
      'Fetching stories failed, please try again later.',
      500
    )
    return next(error)
  }


  if (!userWithStories || userWithStories.stories.length === 0) {
    return next(
      new HttpError('Could not find stories for the provided user id.', 404)
    )
  }

  res.json({
    stories: userWithStories.stories.map(story =>
      story.toObject({ getters: true })
    )
  })
}

const createStory = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data', 422))
  }

  const { title, description, content, genre } = req.body


  const createdStory = new Story({
    title,
    description,
    content,
    genre,
    image: req.file.path,
    creator: req.userData.userId
  })

  let user

  try {
    user = await User.findById(req.userData.userId)
  }
  catch (err) {
    const error = new HttpError('Creating story failed. Please try again', 500)
    return next(error)
  }

  if(!user) {
    const error = new HttpError('Could not find user for provided id', 404)
    return next(error)
  }

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await createdStory.save({ session: sess })
    user.stories.push(createdStory)
    await user.save({ session: sess })
    await sess.commitTransaction()
  }
  catch (err) {
    const error = new HttpError('Creating story failed, please try again', 500)
    return next(error)
  }

  res.status(201).json({story: createdStory})

}

const updateStory = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      HttpError('Invalid inputs passed, please check your data', 422)
    ) 
  }

  const { title, description, content } = req.body
  const storyId = req.params.sid

  let story
  try {
    story = await Story.findById(storyId)
  } catch (err) {
    const error = new HttpError('Something went wrong. Could not update story', 500)
    return next(error)
  }

  if (story.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this story', 401)
    return next(error)
  }

  story.title = title
  story.description = description
  story.content = content

  try {
    await story.save()
  }
  catch (err) {
    const error = new HttpError('Something went wrong. Could not update story', 500)
    return next(error)
  }

  res.status(200).json({story: story.toObject({ getters: true })})

}

const deleteStory = async (req, res, next) => {
  const storyId = req.params.sid
  
  let story
  try {
    story = await Story.findById(storyId).populate('creator')
  }
  catch (err) {
    const error = new HttpError('Something went wrong. Could not delete story', 500)
    return next(error)
  }

  if (!story) {
    const error = new HttpError('Could not find story for this id', 404)
    return next(error)
  }

  if (story.creator.id !== req.userData.userId) {
    const error = new HttpError('You are not allowed to delete this story', 401)
    return next(error)
  }

  const imagePath = story.image

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await story.remove({ session: sess })
    story.creator.stories.pull(story)
    await story.creator.save({ session: sess })
    await sess.commitTransaction()
  }
  catch (err) {
    const error = new HttpError('Something went wrong. Could not delete story', 500)
    return next(error)
  }

  fs.unlink(imagePath, err => {
    console.log(err)
  })

  res.status(200).json({message: 'Deleted story'})

}

exports.getStoryById = getStoryById
exports.getStoriesByUserId = getStoriesByUserId
exports.createStory = createStory
exports.updateStory = updateStory
exports.deleteStory = deleteStory
