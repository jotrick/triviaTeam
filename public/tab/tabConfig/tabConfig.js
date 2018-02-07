var microsoftTeams;
microsoftTeams.initialize();

function getTeamLeaderboard() {
    microsoftTeams.settings.registerOnSaveHandler(function (saveEvent) {
        microsoftTeams.settings.setSettings({
            suggestedDisplayName: "Team Leaderboard",
            contentUrl: window.location.protocol + "//" + window.location.host + "/trivia/leaderboard/team",
            entityId: "test123_Team",
        });
        saveEvent.notifySuccess();
    });

    microsoftTeams.settings.setValidityState(true);
}

function getIndividualLeaderboard() {
    microsoftTeams.settings.registerOnSaveHandler(function (saveEvent) {
        microsoftTeams.settings.setSettings({
            suggestedDisplayName: "Individual Leaderboard",
            contentUrl: window.location.protocol + "//" + window.location.host + "/trivia/leaderboard/individual",
            entityId: "test123_Individual",
        });
        saveEvent.notifySuccess();
    });

    microsoftTeams.settings.setValidityState(true);
}