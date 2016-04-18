'use strict';

var express = require('express'),
    app = express(),
    extend = require('util')._extend,
    pkg = require('./package.json'),
    training = require('./training/setup'),
    Q = require('q');

// Bootstrap application settings
require('./config/express')(app);

var PROMPT_RECIPE_SELECTED = 'USER CLICKS RECIPE';
var PROMPT_RECIPES_RETURNED = 'UPDATE NUM_RECIPES';
var log = console.log.bind(null, ' ');

var apis = null;

// promises
var converse, updateProfile, getIntent, searchRecipes, getRecipeInformation, synthesize = null;

// train the service and create the promises with the result
training.train(function(err) {
	if (err){
    console.log('ERROR:', err.error);
  }

  apis = require('./api/services');

  converse = Q.nfbind(apis.dialog.conversation.bind(apis.dialog));
  updateProfile = Q.nfbind(apis.dialog.updateProfile.bind(apis.dialog));
  getIntent = Q.nfbind(apis.classifier.classify.bind(apis.classifier));
  searchRecipes = Q.nfbind(apis.recipeDB.searchRecipes.bind(apis.recipeDB));
  getRecipeInformation = Q.nfbind(apis.recipeDB.getRecipeInformation.bind(apis.recipeDB));
});

// create the conversation
app.post('/api/create_conversation', function(req, res, next) {
  converse(req.body)
  .then(function(result){
    res.json(result[0]);
  })
  .catch(next);
});

// converse
app.post('/api/conversation', function(req, res, next) {
  log('--------------------------');
  log('1. Classifying user intent');
  getIntent({ text: req.body.input })
  .then(function(result) {
    log('2. Updating the dialog profile with the user intent');
    var classes = result[0].classes;
    var profile = {
      client_id: req.body.client_id,
      name_values: [
        { name:'Class1', value: classes[0].class_name },
        { name:'Class1_Confidence', value: classes[0].confidence },
        { name:'Class2', value: classes[1].class_name },
        { name:'Class2_Confidence', value: classes[1].confidence }
      ]
    };
    return updateProfile(profile);
  })
  .catch(function(error ){
    log('2.', error.description || error);
  })
  .then(function() {
    log('3. Calling dialog.conversation()');
    return converse(req.body)
    .then(function(result) {
      var conversation = result[0];
      if (searchNow(conversation.response.join(' '))) {
        log('4. Dialog thinks we have information enough to search for recipes');
        var searchParameters = parseSearchParameters(conversation);
        conversation.response = conversation.response.slice(0, 1);
        log('5. Searching for recipes on spoonacular.com');
        return searchRecipes(searchParameters)
        .then(function(searchResult) {
          log('6. Updating the dialog profile with the result from spoonacular.com');
          var profile = {
            client_id: req.body.client_id,
            name_values: [
              { name:'Num_Recipes', value: searchResult.total_recipes }
            ]
          };
          return updateProfile(profile)
          .then(function() {
            log('7. Calling dialog.conversation()');
            var params = extend({}, req.body);
            params.input = PROMPT_RECIPES_RETURNED;
            return converse(params)
            .then(function(result) {
              res.json(extend(result[0], searchResult));
            });
          });
        });
      } else {
        log('4. Not enough information to search for recipes, continue the conversation');
        res.json(conversation);
      }
    });
  })
  .catch(next);
});

function searchNow(message) {
  return message.toLowerCase().indexOf('search_now') !== -1;
}

function parseSearchParameters(conversation) {
  var params = conversation.response[1].toLowerCase().slice(1, -1);
  params = params.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ');
  return JSON.parse(params);
}

app.get('/api/recipes', function(req, res, next) {
  getRecipeInformation(req.query)
  .then(function(recipe){
    var profile = {
      client_id: req.body.client_id,
      name_values: [
        { name:'Selected_Recipe', value: recipe.recipe_name },
      ]
    };
    return updateProfile(profile)
    .then(function() {
      var params = {
        client_id: req.query.client_id,
        conversation_id: req.query.conversation_id,
        input: PROMPT_RECIPE_SELECTED
      };
      return converse(params)
      .then(function(result) {
        res.json(extend(result[0], { recipes: [recipe]}));
      });
    });
  })
  .catch(next);
});

app.get('/api/synthesize', function(req, res, next) {
  var transcript = apis.textToSpeech.synthesize(req.query);
  transcript.on('error', function(error) {
    next(error);
  });
  transcript.pipe(res);
});

/**
 * Returns the classifier_id and dialog_id to the user.
 */
app.get('/api/services', function(req, res) {
  res.json({
    dialog_id: apis ? apis.dialog_id : 'Unknown',
    classifier_id: apis ? apis.classifier_id : 'Unknown'
  });
});

// Error-handler application settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 3000;
var host = process.env.VCAP_APP_HOST || 'localhost';
app.listen(port);

console.log(pkg.name + ':' + pkg.version, host + ':' + port);
