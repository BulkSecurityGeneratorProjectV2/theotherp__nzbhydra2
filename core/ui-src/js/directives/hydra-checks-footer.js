/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

angular
    .module('nzbhydraApp')
    .directive('hydraChecksFooter', hydraChecksFooter);

function hydraChecksFooter() {
    return {
        templateUrl: 'static/html/directives/checks-footer.html',
        controller: controller
    };

    function controller($scope, UpdateService, RequestsErrorHandler, HydraAuthService, $http, $uibModal, ConfigService, GenericStorageService, ModalService, growl, NotificationService, bootstrapped) {
        $scope.updateAvailable = false;
        $scope.checked = false;
        var welcomeIsBeingShown = false;

        $scope.mayUpdate = HydraAuthService.getUserInfos().maySeeAdmin;

        $scope.$on("user:loggedIn", function () {
            if (HydraAuthService.getUserInfos().maySeeAdmin && !$scope.checked) {
                retrieveUpdateInfos();
            }
        });

        function checkForOutOfMemoryException() {
            GenericStorageService.get("outOfMemoryDetected", false).then(function (response) {
                if (response.data !== "" && response.data) {
                    //headline, message, params, size, textAlign
                    ModalService.open("Out of memory error detected", 'The log indicates that the process ran out of memory. Please increase the XMX value in the main config and restart.', {
                        yes: {
                            text: "OK"
                        }
                    }, undefined, "left");
                    GenericStorageService.put("outOfMemoryDetected", false, false);
                }
            });
        }

        function checkForOutdatedWrapper() {
            $http.get("internalapi/updates/isDisplayWrapperOutdated").then(function (response) {
                var data = response.data;
                if (data !== undefined && data !== null && data) {
                    ModalService.open("Outdated wrappers detected", 'The NZBHydra wrappers (i.e. the executables or python scripts you use to run NZBHydra) seem to be outdated. Please update them.<br><br>\n' +
                        '      Shut down NZBHydra, <a href="https://github.com/theotherp/nzbhydra2/releases/latest">download the latest version</a> and extract all the relevant wrapper files into your main NZBHydra folder.<br>\n' +
                        '      For Windows these files are:\n' +
                        '      <ul>\n' +
                        '        <li>NZBHydra2.exe</li>\n' +
                        '        <li>NZBHydra2 Console.exe</li>\n' +
                        '      </ul>\n' +
                        '      For linux these files are:\n' +
                        '      <ul>\n' +
                        '        <li>nzbhydra2</li>\n' +
                        '        <li>nzbhydra2wrapper.py</li>\n' +
                        '        <li>nzbhydra2wrapperPy3.py</li>\n' +
                        '      </ul>\n' +
                        '      Make sure to overwrite all of these files that already exist - you don\'t need to update any files that aren\'t already present.\n' +
                        '      <br><br>\n' +
                        '      Afterwards start NZBHydra again.', {
                        yes: {
                            text: "OK",
                            onYes: function () {
                                $http.put("internalapi/updates/setOutdatedWrapperDetectedWarningShown")
                            }
                        }
                    }, undefined, "left");

                }
            });
        }

        if ($scope.mayUpdate) {
            retrieveUpdateInfos();
            checkForOutOfMemoryException();
            checkForOutdatedWrapper();
        }

        function retrieveUpdateInfos() {
            $scope.checked = true;
            UpdateService.getInfos().then(function (response) {
                if (response) {
                    $scope.currentVersion = response.data.currentVersion;
                    $scope.latestVersion = response.data.latestVersion;
                    $scope.latestVersionIsBeta = response.data.latestVersionIsBeta;
                    $scope.updateAvailable = response.data.updateAvailable;
                    $scope.changelog = response.data.changelog;
                    $scope.runInDocker = response.data.runInDocker;
                    $scope.showUpdateBannerOnDocker = response.data.showUpdateBannerOnDocker;
                    $scope.showWhatsNewBanner = response.data.showWhatsNewBanner;
                    if ($scope.runInDocker && !$scope.showUpdateBannerOnDocker) {
                        $scope.updateAvailable = false;
                    }
                    $scope.automaticUpdateToNotice = response.data.automaticUpdateToNotice;


                    $scope.$emit("showUpdateFooter", $scope.updateAvailable);
                    $scope.$emit("showAutomaticUpdateFooter", $scope.automaticUpdateToNotice);
                } else {
                    $scope.$emit("showUpdateFooter", false);
                }
            });
        }

        $scope.update = function () {
            UpdateService.update($scope.latestVersion);
        };

        $scope.ignore = function () {
            UpdateService.ignore($scope.latestVersion);
            $scope.updateAvailable = false;
            $scope.$emit("showUpdateFooter", $scope.updateAvailable);
        };

        $scope.showChangelog = function () {
            UpdateService.showChanges($scope.latestVersion);
        };

        $scope.showChangesFromAutomaticUpdate = function () {
            UpdateService.showChangesFromAutomaticUpdate();
            $scope.automaticUpdateToNotice = null;
            $scope.$emit("showAutomaticUpdateFooter", false);
        };

        $scope.dismissChangesFromAutomaticUpdate = function () {
            $scope.automaticUpdateToNotice = null;
            $scope.$emit("showAutomaticUpdateFooter", false);
            console.log("Dismissing showAutomaticUpdateFooter");
            return $http.get("internalapi/updates/ackAutomaticUpdateVersionHistory").then(function (response) {
            });
        };

        function checkAndShowNews() {
            RequestsErrorHandler.specificallyHandled(function () {
                if (ConfigService.getSafe().showNews) {
                    $http.get("internalapi/news/forcurrentversion").then(function (response) {
                        var data = response.data;
                        if (data && data.length > 0) {
                            $uibModal.open({
                                templateUrl: 'static/html/news-modal.html',
                                controller: NewsModalInstanceCtrl,
                                size: "lg",
                                resolve: {
                                    news: function () {
                                        return data;
                                    }
                                }
                            });
                            $http.put("internalapi/news/saveshown");
                        }
                    });
                }
            });
        }

        function checkExpiredIndexers() {
            _.each(ConfigService.getSafe().indexers, function (indexer) {
                if (indexer.vipExpirationDate != null && indexer.vipExpirationDate !== "Lifetime") {
                    var expiryWarning;
                    var expiryDate = moment(indexer.vipExpirationDate, "YYYY-MM-DD");
                    var messagePrefix = "VIP access for indexer " + indexer.name;
                    if (expiryDate < moment()) {
                        expiryWarning = messagePrefix + " expired on " + indexer.vipExpirationDate;
                    } else if (expiryDate.subtract(7, 'days') < moment()) {
                        expiryWarning = messagePrefix + " will expire on " + indexer.vipExpirationDate;
                    }
                    if (expiryWarning) {
                        console.log(expiryWarning);
                        growl.warning(expiryWarning);
                    }
                }
            });
        }

        function checkAndShowWelcome() {
            RequestsErrorHandler.specificallyHandled(function () {
                $http.get("internalapi/welcomeshown").then(function (response) {
                    if (!response.data) {
                        $http.put("internalapi/welcomeshown");
                        var promise = $uibModal.open({
                            templateUrl: 'static/html/welcome-modal.html',
                            controller: WelcomeModalInstanceCtrl,
                            size: "md"
                        });
                        promise.opened.then(function () {
                            welcomeIsBeingShown = true;
                        });
                        promise.closed.then(function () {
                            welcomeIsBeingShown = false;
                        });
                    } else {
                        _.defer(checkAndShowNews);
                        _.defer(checkExpiredIndexers);
                    }
                }, function () {
                    console.log("Error while checking for welcome")
                });
            });
        }

        checkAndShowWelcome();

        function showUnreadNotifications(unreadNotifications, stompClient) {
            if (unreadNotifications.length > ConfigService.getSafe().notificationConfig.displayNotificationsMax) {
                growl.info(unreadNotifications.length + ' notifications have piled up. <a href=stats/notifications>Go to the notification history to view them.</a>', {disableCountDown: true});
                for (var i = 0; i < unreadNotifications.length; i++) {
                    if (unreadNotifications[i].id === undefined) {
                        console.log("Undefined ID found for notification " + unreadNotifications[i]);
                        continue;
                    }
                    stompClient.send("/app/markNotificationRead", {}, unreadNotifications[i].id);
                }
                return;
            }
            for (var j = 0; j < unreadNotifications.length; j++) {
                var notification = unreadNotifications[j];
                var body = notification.body.replace("\n", "<br>");
                switch (notification.messageType) {
                    case "INFO":
                        growl.info(body);
                        break;
                    case "SUCCESS":
                        growl.success(body);
                        break;
                    case "WARNING":
                        growl.warning(body);
                        break;
                    case "FAILURE":
                        growl.danger(body);
                        break;
                }
                if (notification.id === undefined) {
                    console.log("Undefined ID found for notification " + unreadNotifications[i]);
                    continue;
                }
                stompClient.send("/app/markNotificationRead", {}, notification.id);
            }
        }

        if (ConfigService.getSafe().notificationConfig.displayNotifications) {
            var socket = new SockJS(bootstrapped.baseUrl + 'websocket');
            var stompClient = Stomp.over(socket);
            stompClient.debug = null;
            stompClient.connect({}, function (frame) {
                stompClient.subscribe('/topic/notifications', function (message) {
                    showUnreadNotifications(JSON.parse(message.body), stompClient);
                });
            });
        }

    }
}

angular
    .module('nzbhydraApp')
    .controller('NewsModalInstanceCtrl', NewsModalInstanceCtrl);

function NewsModalInstanceCtrl($scope, $uibModalInstance, news) {
    $scope.news = news;
    $scope.close = function () {
        $uibModalInstance.dismiss();
    };
}

angular
    .module('nzbhydraApp')
    .controller('WelcomeModalInstanceCtrl', WelcomeModalInstanceCtrl);

function WelcomeModalInstanceCtrl($scope, $uibModalInstance, $state, MigrationService) {
    $scope.close = function () {
        $uibModalInstance.dismiss();
    };

    $scope.startMigration = function () {
        $uibModalInstance.dismiss();
        MigrationService.migrate();
    };

    $scope.goToConfig = function () {
        $uibModalInstance.dismiss();
        $state.go("root.config.main");
    }
}
