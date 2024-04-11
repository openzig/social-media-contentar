class Comment {
    constructor(id, content, author, parentId) {
        this.id = id;
        this.content = content;
        this.author = author;
        this.parentId = parentId;
    }
}

// https://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
var observeDOM = (function () {
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    return function (obj, callback) {
        if (!obj || obj.nodeType !== 1) return;

        if (MutationObserver) {
            // define a new observer
            var mutationObserver = new MutationObserver(callback)

            // have the observer observe for changes in children
            mutationObserver.observe(obj, { childList: true, subtree: true })
            return mutationObserver
        }

        // browser support fallback
        else if (window.addEventListener) {
            obj.addEventListener('DOMNodeInserted', callback, false)
            obj.addEventListener('DOMNodeRemoved', callback, false)
        }
    }
})()

function callChatApi(onPreSubmit, onSuccess, onFailure, onPostSubmit) {
    onPreSubmit();
    fetch("https://social-media-contentar.uc.r.appspot.com/api/v1/smart_reply/chat", {
        method: "POST",
        body: JSON.stringify({ messages: chat }),
        headers: {
            "Content-type": "application/json",
        }
    })
        .then((response) => response.json())
        .then((result) => onSuccess(result.content))
        .catch((error) => onFailure(error))
        .finally(() => onPostSubmit());
}

function getParentDiv(element, targetClassName) {
    while (element) {
        const className = element.getAttribute('class');
        if (className && className.includes(targetClassName)) {
            return element;
        }

        element = element.parentElement;
    }
}

function getPrevId(commentAuthorMap, replyTo, defaultParentId) {
    // this is a parent comment
    if (commentAuthorMap.size == 0) {
        return defaultParentId;
    }

    // this is the first sub comment
    if (commentAuthorMap.size == 1) {
        return commentAuthorMap.values().next().value.id;
    }

    if (commentAuthorMap.has(replyTo)) {
        return commentAuthorMap.get(replyTo).id;
    }

    return defaultParentId;
}

function parseAllComments(rootReplyClassName, parseParentCommentDiv) {
    const parentComments = document.getElementsByClassName(rootReplyClassName);
    for (let i = 0; i < parentComments.length; i++) {
        parseParentCommentDiv(parentComments[i]);
    }
}
