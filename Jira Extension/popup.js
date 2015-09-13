// Global reference to the status display SPAN
var statusDisplay = null;
var jiraGroup = 'DEVGRU';
var comment;
var issue;



function runRunner () {
    comment = document.getElementById('comment').value;
    issue = jiraGroup + '-' + document.getElementById('jiraIssue').value;

    if (!comment) {
        openJiraPage();
    } else {
        addComment();
    }
}

function openJiraPage() {
    event.preventDefault();

    chrome.tabs.update({
        url: "https://contegixapp1.livenation.com/jira/browse/" + issue
    });

    statusDisplay.innerHTML = 'Loading Jira Story...';
}

function addComment() {
    event.preventDefault();

    var postData = JSON.stringify({ "body": comment });
    var url = "https://contegixapp1.livenation.com/jira/rest/api/latest/issue/" + issue + "/comment";
    var method = "POST";
    var async = true;
    var request = new XMLHttpRequest();

    request.open(method, url, async);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    request.onload = function () {
       var status = request.status;
       var data = request.responseText;

        statusDisplay.innerHTML = "Adding comment..."; 
    }

    request.send(postData);

}





// When the popup HTML has loaded
window.addEventListener('load', function(evt) {
    // Cache a reference to the status display SPAN
    statusDisplay = document.getElementById('status-display');
    // Handle the bookmark form submit event with our openJiraPage function
    document.getElementById('runRunner').addEventListener('submit', runRunner);
    document.getElementById('openJiraPage').addEventListener('submit', openJiraPage);
    document.getElementById('addComment').addEventListener('submit', addComment);
});