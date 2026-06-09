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
    controller: ['$http', '$q', function($http, $q) {
        var self = this;

        // Cifras de la clínica (se rellenan desde el sondeo de customers/vets)
        self.stats = { owners: 0, pets: 0, vets: 0, loading: true };

        // Panel de estado de los microservicios
        self.health = {
            checking: false,
            overall: 'checking',
            overallLabel: 'Comprobando servicios…',
            lastLabel: '',
            services: [
                { key: 'gateway',   name: 'API Gateway',      route: 'GET /api/gateway/owners/1', status: 'checking', label: 'Comprobando', latency: null },
                { key: 'customers', name: 'Customers Service', route: 'GET /api/customer/owners',  status: 'checking', label: 'Comprobando', latency: null },
                { key: 'vets',      name: 'Vets Service',      route: 'GET /api/vet/vets',         status: 'checking', label: 'Comprobando', latency: null },
                { key: 'visits',    name: 'Visits Service',    route: 'GET /api/visit/pets/visits', status: 'checking', label: 'Comprobando', latency: null }
            ]
        };

        var STATE_LABELS = { up: 'Operativo', warn: 'Lento', down: 'Caído', checking: 'Comprobando' };
        var SLOW_MS = 800;

        function byKey(k) {
            return self.health.services.filter(function(s) { return s.key === k; })[0];
        }

        function probe(svc, url) {
            svc.status = 'checking';
            svc.label = STATE_LABELS.checking;
            svc.latency = null;
            var started = Date.now();
            return $http.get(url, { timeout: 8000 }).then(function(resp) {
                svc.latency = Date.now() - started;
                svc.status = svc.latency > SLOW_MS ? 'warn' : 'up';
                svc.label = STATE_LABELS[svc.status];
                return resp;
            }, function(err) {
                svc.latency = Date.now() - started;
                svc.status = 'down';
                svc.label = STATE_LABELS.down;
                return $q.reject(err);
            });
        }

        function summarize() {
            var statuses = self.health.services.map(function(s) { return s.status; });
            if (statuses.indexOf('down') !== -1) {
                self.health.overall = 'down';
                self.health.overallLabel = 'Servicios con incidencias';
            } else if (statuses.indexOf('warn') !== -1) {
                self.health.overall = 'warn';
                self.health.overallLabel = 'Rendimiento degradado';
            } else {
                self.health.overall = 'up';
                self.health.overallLabel = 'Todos los servicios operativos';
            }
            self.health.lastLabel = 'Actualizado ' + new Date().toLocaleTimeString('es-ES');
        }

        self.checkHealth = function() {
            if (self.health.checking) { return; }
            self.health.checking = true;

            var pCustomers = probe(byKey('customers'), 'api/customer/owners').then(function(resp) {
                self.stats.owners = resp.data.length;
                self.stats.pets = resp.data.reduce(function(total, owner) {
                    return total + (owner.pets ? owner.pets.length : 0);
                }, 0);
            }, angular.noop);

            var pVets = probe(byKey('vets'), 'api/vet/vets').then(function(resp) {
                self.stats.vets = resp.data.length;
            }, angular.noop);

            var pVisits = probe(byKey('visits'), 'api/visit/pets/visits?petId=1').catch(angular.noop);
            var pGateway = probe(byKey('gateway'), 'api/gateway/owners/1').catch(angular.noop);

            $q.all([pCustomers, pVets, pVisits, pGateway]).finally(function() {
                self.stats.loading = false;
                self.health.checking = false;
                summarize();
            });
        };

        self.checkHealth();
    }]
});
