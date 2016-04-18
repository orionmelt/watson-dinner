'use strict';

module.exports = function() {
  console.log('Spoonacular API key not found, using mock DB');
  return {
    
    /**
     * Search for recipes on Spoonacular based on input parameters
     */
    searchRecipes: function(params, callback) {
      var results = {
        total_recipes: 2,
        recipes: [{
          recipe_id: 0,
          recipe_name: 'BBQ Burgers Jibarito Style'
        }, {
          recipe_id: 1,
          recipe_name: 'Classic Grilled Hamburger'
        }]
      };
      return callback(null, results);
    },

    /**
     * Returns recipe information given a Spoonacular recipe ID
     */
    getRecipeInformation: function(params, callback) {
      var recipes = [{
        recipe_id: 0,
        recipe_name: 'BBQ Burgers Jibarito Style',
        ready_in_minutes: 45,
        source_url: 'http://www.Kraftrecipes.com/recipes/bbq-burgers-jibarito-style-110585.aspx',
        recipe_image: 'https://spoonacular.com/recipeImages/BBQ-Burgers-Jibarito-Style-268478.jpg',
        ingredients: ['barbecue sauce', 'cream', 'garlic', 'italian dressing', 'lean ground beef'],
        display_ingredients: "Barbecue sauce, Cream, Garlic, Italian dressing, Lean ground beef"
      }, {
        recipe_id: 1,
        recipe_name: 'Classic Grilled Hamburger',
        ready_in_minutes: 60,
        source_url: 'http://cullyskitchen.com/classic-grilled-hamburger-recipe/',
        recipe_image: 'https://spoonacular.com/recipeImages/Classic-Grilled-Hamburger-526467.jpg',
        ingredients: ['dill pickle relish', 'ketchup', 'lean ground beef', 'lettuce', 'mayonnaise'],
        display_ingredients: "Dill pickle relish', Ketchup, Lean ground beef, Lettuce', Mayonnaise"
      }
    ];
    return callback(null, recipes[params.recipe_id]);
    }
  };
};
