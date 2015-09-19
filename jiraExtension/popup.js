var statusDisplay = null;
var jiraGroup;
var jiraIssue;
var jiraNumber;
var jiraUser;
var comment;
var issue;



function runner () {
    comment = document.getElementById('comment').value;
    if (!jiraIssue) { jiraIssue = document.getElementById('jiraIssue').value; };

    setJiraAttr(jiraIssue);

    if (!comment) {
        openJiraPage();
    } else {
        addComment();
    }
}

function setJiraAttr(jira) {
    if (/^[A-z]+-[0-9]+$/.test(jira)) {
        var jiraArray = jira.split("-",2);
        jiraGroup = jiraArray[0];
        jiraNumber = jiraArray[1];
        //Save jiraGroup for next use
        localStorage.setItem('jiraGroup', jiraGroup);
        
    } else if (/^[0-9]+$/.test(jira)) {
        //Use last set jiraGroup
        jiraGroup = localStorage.getItem('jiraGroup');
        jiraNumber = jira;

    } else {
        // Add something here
    }
}

function openJiraPage() {
    event.preventDefault();

    chrome.tabs.update({
        url: "https://contegixapp1.livenation.com/jira/browse/" + jiraGroup + '-' + jiraNumber
    });

    request.onload = function () {
        var status = request.status;
        var data = request.responseText;

        alertError();

        if (request.status === 201) {
            statusDisplay.innerHTML = 'Loading jira ' + jiraGroup + "-" + jiraNumber;
        } else {
            alertError();
            statusDisplay.innerHTML = "Failed to load page";
        }
    }
}

function addComment() {
    event.preventDefault();

    var postData = JSON.stringify({ "body": comment });
    var url = "https://contegixapp1.livenation.com/jira/rest/api/latest/issue/" + jiraGroup + '-' + jiraNumber + "/comment";
    var method = "POST";
    var async = true;
    var request = new XMLHttpRequest();

    request.open(method, url, async);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    request.onload = function () {
        var status = request.status;
        var data = request.responseText;

        if (request.status === 201) {
            statusDisplay.innerHTML = "Successfully added comment to " + jiraGroup + "-" + jiraNumber;
        } else {
            alertError();
            statusDisplay.innerHTML = "Failed to add comment";
        }
        
    }

    request.send(postData);
}

function retrieveUsersJiras() {
    event.preventDefault();

    //Post data, sets values to filter on -- user and jiras that are not "closed", "resolved", "verified", nor "done"
    var postData = JSON.stringify(
        {
            "jql": "assignee = " + jiraUser + " AND status != Resolved AND status != Closed AND status != Verified AND status != Done",
            "startAt": 0,
            "maxResults": 15,
            "fields": [
                "summary",
                "status",
                "assignee"
            ]
        }
    );

    var url = "https://contegixapp1.livenation.com/jira/rest/api/latest/search?";
    var method = "POST";
    var async = true;
    var request = new XMLHttpRequest();

    request.open(method, url, async);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    request.onload = function () {
        var status = request.status;
        var data = JSON.parse(request.responseText);
        var jirasAssignedToUser = [];

        for (var i = data.issues.length - 1; i >= 0; i--) {
            jirasAssignedToUser.push(data.issues[i].key);
        };

        var select = document.getElementById("jiraDropDown");
        for(var i = 0; i < jirasAssignedToUser.length; i++) {
            var jiraDropValue = jirasAssignedToUser[i];
            var el = document.createElement("option");
            el.textContent = jiraDropValue;
            el.value = jiraDropValue;
            select.appendChild(el);
        }

        if (request.status != 200) {
            alertError();
            statusDisplay.innerHTML = "Failed to load jiras" + status + data;
        }
        
    }

    request.send(postData);
}

function checkLoginStatus() {
    //add something here for checking the status of login
    event.preventDefault();

    // var postData = JSON.stringify({ "body": comment });
    var url = "https://contegixapp1.livenation.com/jira/rest/auth/1/session";
    var method = "GET";
    var async = false;
    var request = new XMLHttpRequest();

    request.open(method, url, async);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    request.onload = function () {
        var status = request.status;
        var data = JSON.parse(request.responseText);

        //Set the active user's Jira name
        jiraUser = data.name;

        if (request.status != 200) {
            statusDisplay.innerHTML = "You are not logged in";
            //Hide the Run button to prevent user from continuing
            document.getElementById('runButton').style.visibility = "hidden";
            alertError();
        }
    }

    request.send();
}

function alertError() {
    var element = document.getElementsByClassName("body")[0];
    element.className += " errorAlert";
}


window.addEventListener('load', function(evt) {
    //Check to make sure a user is logged in
    checkLoginStatus();
    //Populate drowdown with the users currect, active Jiras
    retrieveUsersJiras();
    //Listener for jira selection in the dropdown
    var dropDown = document.getElementById('jiraDropDown');
    dropDown.addEventListener('change', function() {
        jiraIssue = dropDown.value
    } );

    statusDisplay = document.getElementById('status-display');
    document.getElementById('runner').addEventListener('submit', runner);
});