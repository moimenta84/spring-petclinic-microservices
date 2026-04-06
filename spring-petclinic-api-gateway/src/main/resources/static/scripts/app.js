'use strict';
/* App Module */
var petClinicApp = angular.module('petClinicApp', [
    'ui.router', 'infrastructure', 'layoutNav', 'layoutFooter', 'layoutWelcome',
    'ownerList', 'ownerDetails', 'ownerForm', 'petForm', 'visits', 'vetList']);

petClinicApp.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$httpProvider', function(
    $stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {

    // safari turns to be lazy sending the Cache-Control header
    $httpProvider.defaults.headers.common["Cache-Control"] = 'no-cache';
    $httpProvider.interceptors.push('HttpErrorHandlingInterceptor');

    $locationProvider.hashPrefix('!');

    $urlRouterProvider.otherwise('/welcome');
    $stateProvider
        .state('app', {
            abstract: true,
            url: '',
            template: '<ui-view></ui-view>'
        })
        .state('welcome', {
            parent: 'app',
            url: '/welcome',
            template: '<layout-welcome></layout-welcome>'
        });
}]);

['nav', 'footer'].forEach(function(c) {
    var mod = 'layout' + c.toUpperCase().substring(0, 1) + c.substring(1);
    angular.module(mod, []);
    angular.module(mod).component(mod, {
        templateUrl: "scripts/fragments/" + c + ".html"
    });
});

angular.module('layoutWelcome', []);
angular.module('layoutWelcome').component('layoutWelcome', {
    templateUrl: "scripts/fragments/welcome.html",
    controller: ['$http', function($http) {
        var self = this;
        self.stats = { owners: 0, pets: 0, vets: 0, loading: true };

        $http.get('api/customer/owners').then(function(resp) {
            self.stats.owners = resp.data.length;
            self.stats.pets = resp.data.reduce(function(total, owner) {
                return total + (owner.pets ? owner.pets.length : 0);
            }, 0);
            self.stats.loading = false;
        });

        $http.get('api/vet/vets').then(function(resp) {
            self.stats.vets = resp.data.length;
        });
    }]
});
