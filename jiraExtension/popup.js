var statusDisplay = null;
var jiraIssue;

function ajax(type, url, data, callbacks) {
    callbacks = callbacks || {};

    if(type === 'GET' && !Object.keys(callbacks).length){
        // If it is a get request, we won't have post data. Assume the callbacks are the third arg
        callbacks = data;
    }

    var req = new XMLHttpRequest();

    for (var event in callbacks) {
        if (callbacks.hasOwnProperty(event)) {
            req.addEventListener(event, callbacks[event]);
        }
    }

    req.open(type, url);
    req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    req.send(data);
}

// This is the engine of the program
function runner () {
    var jiraIssueInput = document.getElementById('jiraIssue');
    var comment = document.getElementById('comment').value;
    var jiraAttr, jiraGroup, jiraNumber;

    if (jiraIssueInput.value){
        jiraIssue = jiraIssueInput.value;
    }

    jiraAttr = setJiraAttr(jiraIssue);

    // Pass the value of jiraIssue provided by the user into a
    // setJiraAttr to parse the jira group and number for use later
    jiraGroup = jiraAttr.group;
    jiraNumber = jiraAttr.number;

    if (!jiraGroup || !jiraNumber) {
        alertError();
        statusDisplay.innerHTML = 'Please provide a Jira';
    }
    else if (!comment) {
        openJiraPage(jiraGroup,jiraNumber);
    } else {
        addComment(jiraGroup,jiraNumber,comment);
    }
}

function setJiraAttr(jiraIssue) {
    var jiraGroup, jiraNumber, jiraArray;

    if (/^[A-z]+-[0-9]+$/.test(jiraIssue)) {
        // Tests to see if jiraIssue contains the group and jira number
        jiraArray = jiraIssue.split("-",2);
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
    return {
        group: jiraGroup,
        number: jiraNumber
    };
}

function openJiraPage(jiraGroup,jiraNumber) {
    event.preventDefault();

    chrome.tabs.update({
        url: localStorage.getItem('jiraServer') + "/jira/browse/" + jiraGroup + '-' + jiraNumber
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

function addComment(jiraGroup,jiraNumber,comment) {
    event.preventDefault();

    var postData = JSON.stringify({ "body": comment });
    var url = localStorage.getItem('jiraServer') + "/jira/rest/api/latest/issue/" + jiraGroup + '-' + jiraNumber + "/comment";

    ajax('POST', url, postData, {
        load: function() {
            var status = this.status;
            var data = this.responseText;

            if (status === 201) {
                statusDisplay.innerHTML = "Successfully added comment to " + jiraGroup + "-" + jiraNumber;
            } else {
                alertError();
                statusDisplay.innerHTML = "Failed to add comment";
            }
        }
    });
}

// Check to make sure a user is logged in
function checkLoginStatus(callback) {
    ajax('GET', localStorage.getItem('jiraServer') + '/jira/rest/auth/1/session', {
        load: function(){
            var status = this.status;
            var data = JSON.parse(this.responseText);

            if (status === 200) {
                // Set the active user's Jira name and sanitize
                callback(sanitizeUsername(data.name))
            } else {
                statusDisplay.innerHTML = "You are not logged in";
                // Hide the Run button to prevent user from continuing
                document.getElementById('runButton').style.visibility = "hidden";
                alertError();
            }
        }
    });
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
    var postData = JSON.stringify({
        "jql": "assignee = " + jiraUser + " AND status != Resolved AND status != Closed AND status != Verified AND status != Done",
        "startAt": 0,
        "maxResults": 100,
        "fields": [
            "summary",
            "status",
            "assignee"
        ]
    });

    ajax('POST', localStorage.getItem('jiraServer') + '/jira/rest/api/latest/search?', postData, {
        load: function () {
            var status = this.status;
            var data = JSON.parse(this.responseText);
            var jirasAssignedToUser = [];
            // Set select to the dropdown element for appending child choices
            var select = document.getElementById("jiraDropDown");

            if (this.status !== 200) {
                alertError();
                statusDisplay.innerHTML = "Failed to load jiras" + status + data;

                return;
            }

            data.issues.forEach( function(issue) {
                jirasAssignedToUser.push(issue.key);
            });

            // Hacky way to get the order proper without playing around with compare
            // functions
            jirasAssignedToUser.reverse();

            jirasAssignedToUser.forEach( function(jira) {
                var element = document.createElement("option");
                element.textContent = jira;
                element.value = jira;
                // Append jira as child choice of the dropdown
                select.appendChild(element);
            });
        }
    });
}

function alertError() {
    // Change the popup background to red to alert the user of a failure
    var element = document.getElementsByClassName("body")[0];
    element.className += " errorAlert";
}

// Enables handlers on form if the user is authenticated
function enableFormForJiraUser(jiraUser){

    // Populate drowdown with the users currect, active Jiras
    retrieveUsersJiras(jiraUser);
    // Listener for jira selection in the dropdown
    var dropDown = document.getElementById('jiraDropDown');
    dropDown.addEventListener('change', function() {
        jiraIssue = dropDown.value
    });

    // Event listener for 'cmd+enter' if in the comment textbox
    document.getElementById('comment').addEventListener('keydown', function(element) {
        if(element.keyCode == 13 && element.metaKey) {
          runner();
        }
    });

    // Event listener for submitting with 'enter' or clicking the button
    document.getElementById('runner').addEventListener('submit', runner);
}

// Saves settings
function saveSettings(){
    for(var i = document.getElementById("jiraDropDown").options.length-1; i>=1; i--){
        document.getElementById("jiraDropDown").remove(i);
    }

    localStorage.setItem('jiraServer', document.getElementById('jiraServer').value);
    
    checkLoginStatus(function(user){
        enableFormForJiraUser(user);
        document.getElementById('settings').style.display = 'none';
    });
}

window.addEventListener('load', function() {
    statusDisplay = document.getElementById('status-display');

    if(!localStorage.getItem('jiraServer')){
        localStorage.setItem('jiraServer', 'https://contegixapp1.livenation.com')
    }
    document.getElementById('jiraServer').value = localStorage.getItem('jiraServer'); ;

    // add handler to save settings on button click
    document.getElementById('saveSettings').addEventListener('click', function(element){
        saveSettings();
    });

    // add handler to toggle showing/hiding settings
    document.getElementById('settingsIcon').addEventListener('click', function(element){
        var e = document.getElementById('settings');
        e.style.display = (e.style.display === '' || e.style.display === 'none') ? 'block' : 'none';
    });

    // Initial load of JIRA data when window loads
    checkLoginStatus(enableFormForJiraUser);
});
