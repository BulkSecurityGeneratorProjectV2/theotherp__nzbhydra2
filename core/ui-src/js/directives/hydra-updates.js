angular
    .module('nzbhydraApp')
    .directive('hydraupdates', hydraupdates);

function hydraupdates() {
    return {
        templateUrl: 'static/html/directives/updates.html',
        controller: controller
    };

    function controller($scope, UpdateService) {

        $scope.loadingPromise = UpdateService.getInfos().then(function (response) {
            $scope.currentVersion = response.data.currentVersion;
            $scope.latestVersion = response.data.latestVersion;
            $scope.latestVersionIsBeta = response.data.latestVersionIsBeta;
            $scope.betaVersion = response.data.betaVersion;
            $scope.updateAvailable = response.data.updateAvailable;
            $scope.betaUpdateAvailable = response.data.betaUpdateAvailable;
            $scope.latestVersionIgnored = response.data.latestVersionIgnored;
            $scope.changelog = response.data.changelog;
            $scope.runInDocker = response.data.runInDocker;
            $scope.wrapperOutdated = response.data.wrapperOutdated;
            $scope.showUpdateBannerOnDocker = response.data.showUpdateBannerOnDocker;
            if ($scope.runInDocker && !$scope.showUpdateBannerOnDocker) {
                $scope.updateAvailable = false;
            }
            console.log(response.data);
        });

        UpdateService.getVersionHistory().then(function (response) {
            $scope.versionHistory = response.data;
        });


        $scope.update = function (version) {
            UpdateService.update(version);
        };

        $scope.showChangelog = function (version) {
            UpdateService.showChanges(version);
        };

        $scope.forceUpdate = function () {
            UpdateService.update($scope.latestVersion)
        };
    }
}

