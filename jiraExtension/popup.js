var statusDisplay = null;
var jiraGroup;
var jiraIssue;
var jiraNumber;
var comment;
var issue;


function runner () {
    comment = document.getElementById('comment').value;
    jiraIssue = document.getElementById('jiraIssue').value;

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

        // chrome.storage.local.set({'jiraGroup': jiraGroup});
        
    } else if (/^[0-9]+$/.test(jira)) {
        //Use last set jiraGroup
        jiraGroup = localStorage.getItem('jiraGroup');
        jiraNumber = jira;

        // chrome.storage.local.get('jiraGroup', function(result) {
        //     jiraGroup = result.jiraGroup;
        // });

    } else {
        // Add something here
    }
}

function openJiraPage() {
    event.preventDefault();

    chrome.tabs.update({
        url: "https://contegixapp1.livenation.com/jira/browse/" + jiraGroup + '-' + jiraNumber
    });

    statusDisplay.innerHTML = 'Loading Jira Story...' + jiraGroup;
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

        statusDisplay.innerHTML = "Adding comment..." + jiraGroup;
    }

    request.send(postData);

}


window.addEventListener('load', function(evt) {
    statusDisplay = document.getElementById('status-display');
    document.getElementById('runner').addEventListener('submit', runner);
});