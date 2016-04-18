/* Copyright IBM Corp. 2015
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
(function () {
    'use strict';

    angular.module('dialog.preview', [])

    /**
     * @name preview
     * @module module/preview
     * @description
     *
     * Renders the preview panel within the UI. When a recipe is clicked within the list
     * of recipe results the controller's "selectedRecipe" property is updated. Once selectedRecipe
     * contains a recipe this directive is invoked. This directive is responsible for rendering
     * the entire preview pane (recipe, name, description etc.).
     *
     * @param {object}
     *            content - a reference to recipe object
     */
    .directive('preview', function ($parse, $sce) {
        return {
            'template': '<div><span class="dialog-drawer-toggle"></span>' +
                        '<div class="dialog-preview-scroll">' +
                        '<div class="dialog-recipe-info-spacing"><h4 class="dialog-recipe-name">{{recipe.recipe_name}}</h4>' +
                        '<img class="recipe-image" src={{recipe.recipe_image}}>' + 
                        '<p>Ready in {{recipe.ready_in_minutes}} minutes.</p>' + 
                        '<p>Ingredients : {{recipe.display_ingredients}}</p>' +
                        '<p><a target="_blank" ng-href="{{recipe.source_url}}"">Full recipe</a></p>' + 
                        '</span></div>',
            'restrict': 'E',
            'link': function (scope, element, attr) {
                var closeButton = null;
                var resizeContents = function () {
                    var docHeight = $(window).height();
                    var headerHeight = $('#dialog-header').outerHeight(true);
                    var previewParentHeight = $('#preview-parent')[0].scrollHeight;
                    var innerHeaderHeight = $('.dialog-drawer-toggle').outerHeight(true);
                    var previewAvailHeight = 0;
                    if (previewParentHeight === docHeight) {
                        //mobile
                        previewAvailHeight = docHeight - (innerHeaderHeight + 5);
                    }
                    else {
                        //desktop
                        previewAvailHeight = docHeight - (headerHeight + innerHeaderHeight);
                    }
                    if (docHeight < (headerHeight + previewParentHeight)) {
                        //we need to scroll the preview panel
                        $('.dialog-preview-scroll').height(previewAvailHeight);
                    }
                };

                closeButton = $('.dialog-drawer-toggle');
                closeButton.bind('touchstart click', function (e) {
                    scope.$apply(scope.dialogCtrl.clearRecipeSelection());
                    $(window).off('resize', resizeContents);
                    e.preventDefault();
                    e.stopPropagation();
                });
                $(window).resize(resizeContents);
                scope.$watch(function () {
                    return scope.dialogCtrl.getCurrentRecipe();
                }, function () {
                    var url = null;
                    var recipe = $parse(attr.content)(scope);
                    scope.recipe = recipe;
                    resizeContents();
                }, true);
            }
        };
    });
}());
