var statusDisplay = null;
var jiraIssue;

// This is the engine of the program
function runner () {

    var comment = document.getElementById('comment').value;
    if (document.getElementById('jiraIssue').value){
        jiraIssue = document.getElementById('jiraIssue').value
    };

    // Pass the value of jiraIssue provided by the user into a
    // setJiraAttr to parse the jira group and number for use later
    var jiraGroup = setJiraAttr(jiraIssue)[0];
    var jiraNumber = setJiraAttr(jiraIssue)[1];

    if (!jiraGroup || !jiraNumber) {
        alertError();
        statusDisplay.innerHTML = 'Please provide a Jira';
    }
    else if (!comment) {
        openJiraPage(jiraGroup,jiraNumber);
    } else {
        addComment(comment);
    }
}

function setJiraAttr(jiraIssue) {
    var jiraGroup, jiraNumber;

    if (/^[A-z]+-[0-9]+$/.test(jiraIssue)) {
        // Tests to see if jiraIssue contains the group and jira number
        var jiraArray = jiraIssue.split("-",2);
        jiraGroup = jiraArray[0];
        jiraNumber = jiraArray[1];
        // Save jiraGroup for next use
        localStorage.setItem('jiraGroup', jiraGroup);
    } else if (/^[0-9]+$/.test(jiraIssue)) {
        // Tests to see if jiraIssue contains a jira number
        // In this case, no jiraGroup is provided and the last set
        // jiraGroup stored in the browser localStorage is used
        jiraGroup = localStorage.getItem('jiraGroup');
        jiraNumber = jiraIssue;
    } else {
        // Add something here
    }
    return [jiraGroup, jiraNumber];
}

function openJiraPage(jiraGroup,jiraNumber) {
    event.preventDefault();

    chrome.tabs.update({
        url: "https://contegixapp1.livenation.com/jira/browse/" + jiraGroup + '-' + jiraNumber
    });

    // request.onload = function () {
    //     var status = request.status;
    //     var data = request.responseText;
    //
    //     alertError();
    //
    //     if (request.status === 201) {
    //         statusDisplay.innerHTML = 'Loading jira ' + jiraGroup + "-" + jiraNumber;
    //     } else {
    //         alertError();
    //         statusDisplay.innerHTML = "Failed to load page";
    //     }
    // }
}

function addComment(comment) {
    event.preventDefault();

    var postData = JSON.stringify({ "body": comment });
    var url = "https://contegixapp1.livenation.com/jira/rest/api/latest/issue/" + jiraGroup + '-' + jiraNumber + "/comment";
    var method = "POST";
    var async = false;
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


function checkLoginStatus() {
    var jiraUser;
    var url = "https://contegixapp1.livenation.com/jira/rest/auth/1/session";
    var method = "GET";
    var async = false;
    var request = new XMLHttpRequest();

    request.open(method, url, async);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    request.onload = function () {
        var status = request.status;
        var data = JSON.parse(request.responseText);

        if (request.status === 200) {
            // Set the active user's Jira name and sanitize
            jiraUser = sanitizeUsername(data.name);
        } else {
            statusDisplay.innerHTML = "You are not logged in";
            // Hide the Run button to prevent user from continuing
            document.getElementById('runButton').style.visibility = "hidden";
            alertError();
        }
    }
    request.send();
    return jiraUser;
}

function sanitizeUsername(username) {
    // Most usernames are in the form of "firstname.lastname", but some names have a space instead of a period
    // "firstname lastname" requires the space to be prepended with two backslashes for Jira to parse it correctly
    return username.replace(/\s/g, '\\ ');
}

function retrieveUsersJiras(jiraUser) {
    event.preventDefault();

    // Post data, sets values to filter on -- user and jiras that are
    // not "closed", "resolved", "verified", nor "done"
    var postData = JSON.stringify(
        {
            "jql": "assignee = " + jiraUser + " AND status != Resolved AND status != Closed AND status != Verified AND status != Done",
            "startAt": 0,
            "maxResults": 100,
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

        data.issues.forEach( function(issue) {
            jirasAssignedToUser.push(issue.key);
        });

        // Hacky way to get the order proper without playing around with compare
        // functions
        jirasAssignedToUser.reverse();

        // Set select to the dropdown element for appending child choices
        var select = document.getElementById("jiraDropDown");

        jirasAssignedToUser.forEach( function(jira) {
            var element = document.createElement("option");
            element.textContent = jira;
            element.value = jira;
            // Append jira as child choice of the dropdown
            select.appendChild(element);
        });

        if (request.status != 200) {
            alertError();
            statusDisplay.innerHTML = "Failed to load jiras" + status + data;
        }
    }
    request.send(postData);
}

function alertError() {
    // Change the popup background to red to alert the user of a failure
    var element = document.getElementsByClassName("body")[0];
    element.className += " errorAlert";
}


window.addEventListener('load', function() {
    statusDisplay = document.getElementById('status-display');
    // Check to make sure a user is logged in
    var jiraUser = checkLoginStatus();
    // Populate drowdown with the users currect, active Jiras
    retrieveUsersJiras(jiraUser);
    // Listener for jira selection in the dropdown
    var dropDown = document.getElementById('jiraDropDown');
    dropDown.addEventListener('change', function() {
        jiraIssue = dropDown.value
    });
    // Event listener for 'cmd+enter' if in the comment textbox
    document.getElementById('comment').addEventListener('keydown',
        function(element) {
            if(element.keyCode == 13 && element.metaKey) {
                runner();
        }
    });
    // Event listener for submitting with 'enter' or clicking the button
    document.getElementById('runner').addEventListener('submit', runner);
});
