// Send a message containing the page details back to the event page
chrome.runtime.sendMessage({
    'title': document.title,//window.getSelection().toString();
    // 'url': window.location.href,
    // 'summary': window.getSelection().toString()
});