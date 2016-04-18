'use strict';

var request = require('request');
var moment = require('moment');
var util = require('util');

var RECIPE_URL = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/{id}/information';
var SEARCH_URL = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/searchComplex';

module.exports = function(key) {
  var spoonacularRequest = request.defaults({
    headers: {
      'X-Mashape-Key': key
    }
  });

  return {
    /**
     * Search for recipes on Spoonacular based on input parameters
     */
    searchRecipes: function(params, callback) {
      var query = {
        cuisine: params.cuisine || ''
      };

      if (params.ingredients) {
        query.includeIngredients = params.ingredients;
      }

      // Spoonacular API call
      spoonacularRequest({ url: SEARCH_URL, qs: query, json:true }, function(err, res, body) {
        if (err)
          return callback(err);

        var recipes = body.results
        .map(function(recipe) {
          return {
            recipe_id: recipe.id,
            recipe_name: recipe.title
          };
        });
        var results = {
          total_recipes: recipes.length,
          recipes: recipes
        };
        
        return callback(null, results);
      });
    },

    /**
     * Returns recipe information given a Spoonacular recipe ID
     */
    getRecipeInformation: function(params, callback) {
      spoonacularRequest({
        url: RECIPE_URL.replace('{id}', params.recipe_id),
        json:true
      }, function(err, res, body) {
        if (err)
          return callback(err, body);

        var recipe = {
          recipe_id: body.id,
          recipe_name: body.title,
          source_url: body.sourceUrl,
          ready_in_minutes: body.readyInMinutes,
          recipe_image: body.image,
          ingredients: body.extendedIngredients,
          display_ingredients: body.extendedIngredients.map(function(ingredient) {
            var name = ingredient.name;
            return name.charAt(0).toUpperCase() + name.slice(1);
          }).join(', ')
        };

        return callback(null, recipe);
      });
    }
  };
};
