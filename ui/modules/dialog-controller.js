(function () {
    'use strict';

    /**
     * @name DialogController
     * @module dialog/controller
     * @description
     *
     * Controls the state of the Dialog view. At any given point of time, the Dialog is in one of the following states:
     *
     * - initial  The "home" view displayed to the user when launching dialog
     * - chatting  The view displayed when user is typing a new response/question
     * - preview  The view is showing a recipe preview
     *
     */
    var DialogController = function (_, $rootScope, $scope, $location, $anchorScroll, $timeout, gettextCatalog, dialogService) {
        var self = this;
        var placeholderText = null;
        var states = {
            'intro': {
                'key': 'intro',
                'class': 'intro',
                'placeholder': 'Loading. Please wait...',
                'introText': ''
            },
            'chatting': {
                'key': 'chatting',
                'class': 'chatting',
                'placeholder': 'Start typing...',
                'introText': ''
            },
            'preview': {
                'key': 'preview',
                'class': 'preview',
                'placeholder': 'Start typing...',
                'introText': ''
            }
        };

        var setState = function (state) {
            self.state = _.cloneDeep(state);
        };

        self.selectedRecipes = [];
        self.selectedRecipe = {};

        /**
         * Called when a user clicks on a recipe within the UI.
         * This util method first checked if the selected
         * recipe was previously clicked on. If it was the cached recipe
         * details are displayed and a REST call
         * is made to the WDS API to inform it of the current selection.
         * If the recipe is not cached (not previously clicked on) a
         * REST call is made to retrieve the recipe
         * details and to inform WDS of the current selection.
         * Once the recipe details are retrieved
         * they are cached (for the duration of the session) so
         * that further REST calls are not needed
         * in order to populate the preview UI.
         *
         * @public
         */
        self.selectRecipe = function (recipe) {
            var recipe_name = null;
            var recipe_id = null;
            var result = null;
            var keys = null;
            var objKeys = null;
            var query = null;
            var scrollable = null;
            if (recipe) {
                recipe_name = recipe.recipe_name;
                recipe_id = recipe.recipe_id;
            }
            else {
                return null;
            }
            result = _.find(self.selectedRecipes, { 'recipe_id': recipe_id, 'recipe_name': recipe_name });
            if (result) {
                keys = _.keys(self.selectedRecipe);
                if (keys) {
                    keys.forEach(function (key) {
                        delete self.selectedRecipe[key];
                    });
                }
                _.assign(self.selectedRecipe, result);
                //We don't need to wait for a response here, we already have cached info.
                //We are just notifying WDS of the selection.
                dialogService.getRecipeInfo(recipe_name, recipe_id);
                scrollable = $('#scrollable-div');
                if (scrollable[0]) {
                    scrollable.animate({ 'scrollTop': scrollable[0].scrollHeight }, 1000);
                }
                //Reduce space between chat box and chat messages
                if ( $('#scrollable-div').height() > $('#conversationParent').height() ) {
                    $('.dialog-center').css({ 'top': $('#scrollable-div').height() - $('#conversationParent').height() - 10 + 'px' });
                    setState(states.preview);
                    return result;
                }
                $('.dialog-center').css({ 'top': '0px' });
                setState(states.preview);
                return result;
            }
            else {
                query = dialogService.getRecipeInfo(recipe_name, recipe_id);
                query.then(function (segment) {
                    if (segment.error === true) {
                        setState(states.chatting);
                    }
                    else {
                        setState(states.preview);
                    }
                    objKeys = _.keys(self.selectedRecipe);
                    if (objKeys) {
                        objKeys.forEach(function (objKey) {
                            delete self.selectedRecipe[objKey]; //reset selected recipe
                        });
                    }
                    _.assign(self.selectedRecipe, segment);
                    if (segment.error !== true) {
                        self.selectedRecipes.push(segment);
                    }
                    $('#scrollable-div').animate({ 'scrollTop': $('#scrollable-div')[0].scrollHeight }, 1000);
                    //Reduce space between chat box and chat messages
                    if ( $('#scrollable-div').height() > $('#conversationParent').height() ) {
                        $('.dialog-center').css({ 'top': $('#scrollable-div').height() - $('#conversationParent').height() - 10 + 'px' });
                        return self.selectedRecipe;
                    }
                    $('.dialog-center').css({ 'top': '0px' });
                    return self.selectedRecipe;
                });
            }
        };
        /**
         * Sets the 'selectedRecipe' object back to an empty object.
         *
         */
        self.clearRecipeSelection = function () {
            var objKeys = _.keys(self.selectedRecipe);
            if (objKeys) {
                objKeys.forEach(function (objKey) {
                    delete self.selectedRecipe[objKey]; //reset selected recipe
                });
            }
            setState(states.chatting);
        };

        /**
         * Returns the recipe currently selected by the user.
         * @public
         * @return {object} The recipe selected by the user.
         */
        self.getCurrentRecipe = function () {
            return self.selectedRecipe;
        };

        setState(states.intro);
        //gets the conversation array such that it can be tracked for additions
        self.conversation = dialogService.getConversation();
        self.question = null;

        if (!self.placeHolder) {
            //if we haven't received the placeholder, make a call to initChat API to get welcome message
            self.placeHolder = (function () {
                var init = dialogService.initChat();
                return init.then(function (response) {
                    placeholderText = response.welcomeMessage;
                    states.intro.introText = placeholderText.replace(/\n\n/g, ' '); //for placeholder attr use spaces
                    states.intro.placeholder = 'Start typing...';
                    $('#question').removeAttr('disabled');
                    setState(states.intro);
                    $('#question').focus();
                });
            }());
        }

        /**
         * Submits the current question using dialogService
         */
        self.submit = function () {
            var child = null;
            var timeout = null;
            var footer = null;
            if (!self.question || self.question.length === 0) {
                $('#question').focus();
                return;
            }
            if (self.conversation.length > 1 && self.conversation[self.conversation.length - 1].options) {
                self.conversation[self.conversation.length - 1].options = null;
            }
            if (self.selectedRecipe) {
                self.selectedRecipe.commentary = null;
            }
            $('#question').attr('disabled', '');
            timeout = $timeout(function () {
                    var scrollable = $('#scrollable-div');
                    if (scrollable[0]) {
                        scrollable[0].scrollTop = scrollable[0].scrollHeight;
                    }
                }, 500);

            dialogService.query(self.question, true).then(function (response) {
                $('#question').removeAttr('disabled');
                $('#question').val('');
                if ($.isArray(response)) {
                    response = response[response.length - 1];
                    //If we are displaying recipes on a mobile device (less than 750 tall) we do
                    //not want to put focus into the field! (we don't want the keyboard popping up)
                    if (!response.recipes || $(window).height() > 750) {
                        $('#question').focus();
                    }
                }
                //This is not a great hack, but the only fix I could find for compensating
                //for the width of the scrollbars. When the scrollbar appears it
                if ($('#scrollable-div').prop('clientHeight') < $('#scrollable-div').prop('scrollHeight')) {
                    child = document.getElementById('resize-footer-col');
                    child.style.display = 'table-cell';
                    footer = document.getElementById('dialog-footer');
                    footer.style.overflowY = 'scroll';
                    if (timeout) {
                        $timeout.cancel(timeout);
                    }
                    timeout = $timeout(function () {
                        var scrollableDiv = $('#scrollable-div');
                        child.style.display = 'none';
                        if (scrollableDiv[0]) {
                            scrollableDiv[0].scrollTop = scrollableDiv[0].scrollHeight;
                        }
                     }, 500);
                }
                else {
                    child = document.getElementById('resize-footer-col');
                    child.style.display = 'table-cell';
                    footer = document.getElementById('dialog-footer');
                    footer.style.overflowY = 'hidden';
                    if (timeout) {
                        $timeout.cancel(timeout);
                    }
                    timeout = $timeout(function () {
                        var scrollableDiv = $('#scrollable-div');
                        child.style.display = 'none';
                        if (scrollableDiv[0]) {
                            scrollableDiv[0].scrollTop = scrollableDiv[0].scrollHeight;
                        }
                    }, 500);
                }
            });
            delete self.question;
        };

        self.submitLink = function (textToSubmit) {
            $('#question').val(textToSubmit);
            self.question = textToSubmit;
            self.submit();
        };

        self.switchToChatting = function () {
            $location.path('chatting');
        };

        $scope.$on('$viewContentLoaded', function (next, current) {
            if (placeholderText) {
                $('#question').removeAttr('disabled');
                $('#question').focus();
            }
        });

        //Watch the conversation array.. If a segment is added then update the state
        $scope.$watch(function () {
            return self.conversation;
        }, function () {
            // We have a new response, switch to 'answered' state
            if (!_.isEmpty(self.conversation)) {
                if (self.conversation.length === 1) {
                   states.intro.introText = self.conversation[0].responses;
                    $('body').addClass('dialog-body-running');
                    if (self.state.key !== states.preview.key) {
                        setState(states.chatting);
                    }
                }
            }
        }, true);
    };

    angular.module('dialog.controller', [ 'gettext', 'lodash', 'ngRoute', 'ngSanitize', 'ngAnimate', 'dialog.service' ]).config(
            function ($routeProvider) {
                $routeProvider.when('/', {
                    'templateUrl': 'modules/home.html',
                    'reloadOnSearch': false
                }).when('/chatting', {
                    'templateUrl': 'modules/dialog.html',
                    'reloadOnSearch': false
                });
            }).controller('DialogController', DialogController);
}());
