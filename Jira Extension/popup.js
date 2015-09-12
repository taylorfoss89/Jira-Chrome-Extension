// Global reference to the status display SPAN
var statusDisplay = null;

// POST the data to the server using XMLHttpRequest
function openJiraPage() {
    // Cancel the form submit
    event.preventDefault();

    // Prepare the data to be POSTed by URLEncoding each field's contents
    var title = document.getElementById('title').value;
    // var url = encodeURIComponent(document.getElementById('url').value);

    chrome.tabs.update({
        url: "https://contegixapp1.livenation.com/jira/browse/DEVGRU-" + title
    });

    //statusDisplay.innerHTML = 'Loading Jira Story...';
}

function addComment() {
    event.preventDefault();

    var issue = "DEVGRU-" + document.getElementById('title').value;
    var comment = document.getElementById('comment').value;
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
    document.getElementById('openJiraPage').addEventListener('submit', openJiraPage);
    document.getElementById('addComment').addEventListener('submit', addComment);
});