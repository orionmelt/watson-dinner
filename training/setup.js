#!/bin/env node

'use strict';

var watson = require('watson-developer-cloud'),
    extend = require('util')._extend,
    async = require('async'),
    fs = require('fs');

// Load environment variables
if (fs.existsSync('../.env.js')) {
  console.log('Loading environment variables from .env.js');
  extend(process.env, require('../.env.js'));
}

var dialogFile = __dirname + '/dialog_id';
var classifierFile = __dirname + '/classifier_id';

var dialogTrainingFile = __dirname + '/dialog_and_classifier.xml';
var classifierTrainingFile = __dirname + '/classifier_training.csv';

var dialogService = watson.dialog({
  url: 'https://gateway.watsonplatform.net/dialog/api',
  username: 'USERNAME',
  password: 'PASSWORD',
  version: 'v1'
});

var classifierService = watson.natural_language_classifier({
  url: 'https://gateway.watsonplatform.net/natural-language-classifier/api',
  username: 'USERNAME',
  password: 'PASSWORD',
  version: 'v1'
});

/**
 * Trains a dialog if the content of /training/dialog_id is null or empty
 */
function trainDialog(callback) {
  fs.readFile(dialogFile, 'utf8', function (err, data) {
    if (err)
      callback(err);
    else if (data === '') {
      dialogService.createDialog({
        name: 'recipes-' + new Date().valueOf(),
        file: fs.createReadStream(dialogTrainingFile)
      }, function(err, dialog) {
        if (err) {
          callback(err);
        } else {
          fs.writeFileSync(dialogFile, dialog.dialog_id);
          console.log('[dialog]: dialog trained -- id=', dialog.dialog_id);
          callback(null);
        }
      });
    } else {
      console.log('[dialog]: dialog already trained -- id=', data);
      callback(null);
    }
  });
}

/**
 * Trains a classifier if the content of /training/classifier_id is null or empty
 */
function trainClassifier(callback) {
  fs.readFile(classifierFile, 'utf8', function (err, data) {
    if (err)
      callback(err);
    else if (data === '') {
      classifierService.create({
        language: 'en',
        name: 'recipes-' + new Date().valueOf(),
        training_data: fs.createReadStream(classifierTrainingFile)
      }, function(err, classifier) {
        if (err) {
          callback(err);
        } else {
          fs.writeFileSync(classifierFile, classifier.classifier_id);
          console.log('[classifier]: classifier is being trained -- id=', classifier.classifier_id);
          callback(null);
        }
      });
    } else {
      console.log('[classifier]: classifier already trained -- id=', data);
      callback(null);
    }
  });
}


var train = function(cb) {
  console.log('Training...');

  async.parallel([trainDialog, trainClassifier], function (error) {
    if (error)
      cb(error);
    else
      cb(null);
  });
};

module.exports = { train: train };

// if running as an script
if (require.main === module)
  train(console.log);
