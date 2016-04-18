'use strict';

var watson = require('watson-developer-cloud'),
    fs = require('fs'),
    trim = require('trim');

var dialogFile = __dirname + '/../training/dialog_id';
var classifierFile = __dirname + '/../training/classifier_id';

// Spoonacular API key - we could set this in .env.js
var SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || '';

// Dialog ID - see training/setup.js
var DIALOG_ID = '';
if (fs.existsSync(dialogFile))
  DIALOG_ID = trim(fs.readFileSync(dialogFile, 'utf8'));

// Classifier ID - see training/setup.js
var CLASSIFIER_ID = '';
if (fs.existsSync(classifierFile))
  CLASSIFIER_ID = trim(fs.readFileSync(classifierFile, 'utf8'));


module.exports = {
  dialog : watson.dialog({
    username: '<username>',
    password: '<password>',
    version: 'v1',
    path: { dialog_id: DIALOG_ID }
  }),
  dialog_id : DIALOG_ID,

  // if an API key for Spoonacular isn't provided, use the mock module to mimic the API
  recipeDB: require(SPOONACULAR_API_KEY ? './recipedb' : './recipedb-mock')(SPOONACULAR_API_KEY),

  classifier: watson.natural_language_classifier({
    username: '<username>',
    password: '<password>',
    version: 'v1',
    path: { classifier_id: CLASSIFIER_ID }
  }),
  classifier_id : CLASSIFIER_ID,

  textToSpeech: watson.text_to_speech({
    username: '<username>',
    password: '<password>',
    version: 'v1'
  })
};
