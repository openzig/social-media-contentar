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

const title = document.getElementById('detail-title')?.innerText;
const description = document.getElementById('detail-desc')?.innerText;

class Comment {
    constructor(id, content, author, parentId) {
        this.id = id;
        this.content = content;
        this.author = author;
        this.parentId = parentId;
    }
}

let commentIdMap = new Map();

var checkCommentLoadFinishTimer = setInterval(checkCommentLoadFinish, 500);

function checkCommentLoadFinish() {
    if (document.getElementsByClassName("parent-comment").length > 0) {
        clearInterval(checkCommentLoadFinishTimer);
        parseAllComments();

        // capture any updates to comments container and update the comment id map
        observeDOM(document.getElementsByClassName('comments-container')[0], function (m) {
            var addedNodes = [];
            m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))

            for (let i = 0; i < addedNodes.length; i++) {
                if (!(addedNodes[i] instanceof HTMLDivElement)) {
                    continue;
                }

                const className = addedNodes[i].getAttribute('class');
                if (className && className.includes('comment-item-sub')) {
                    const parentCommentDiv = getParentDiv(addedNodes[i], 'parent-comment');
                    parseParentCommentDiv(parentCommentDiv);
                    break;
                }
            }
        });
    }
}

function parseAllComments() {
    const parentComments = document.getElementsByClassName('parent-comment');
    for (let i = 0; i < parentComments.length; i++) {
        parseParentCommentDiv(parentComments[i]);
    }
}

function parseParentCommentDiv(parentComment) {
    const parentCommentDiv = parentComment.getElementsByClassName('comment-item')[0];
    let commentAuthorMap = new Map();
    const parentCommentObj = addCommentToMap(parentCommentDiv, commentAuthorMap, -1);

    // parse sub comments
    const subComments = parentComment.getElementsByClassName('comment-item-sub');
    for (let j = 0; j < subComments.length; j++) {
        addCommentToMap(subComments[j], commentAuthorMap, parentCommentObj.id);
    }
}

function addCommentToMap(commentItemDiv, commentAuthorMap, defaultParentId) {
    const commentId = commentItemDiv.id;
    const commentContent = trimContent(commentItemDiv.getElementsByClassName('content')[0].innerText);
    const commentAuthor = commentItemDiv.getElementsByClassName('author')[0].innerText;

    // add event listener
    const replyButton = commentItemDiv.getElementsByClassName('reply')[0];
    replyButton.addEventListener('click', onClickReply);

    const replyTo = commentItemDiv.getElementsByClassName('nickname')[0]?.innerText;
    const comment = new Comment(commentId, commentContent, commentAuthor, getPrevId(commentAuthorMap, replyTo, defaultParentId));
    commentIdMap.set(commentId, comment);
    commentAuthorMap.set(commentAuthor, comment);
    return comment;
}

function trimContent(content) {
    if (content.startsWith('回复 ')) {
        content = content.substring(content.indexOf(':') + 1).trimStart();
    }

    return content;
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

async function onClickReply(event) {
    let commentId = getParentDiv(event.target, 'comment-item').id;
    if (!commentIdMap.has(commentId)) {
        const parentCommentDiv = getParentDiv(event.target, 'parent-comment');
        parseParentCommentDiv(parentCommentDiv);
    }

    // chat starts with post content
    chat = [{ role: 'user', content: title + ',' + description }];
    commentChain = [];

    // get reply chain
    let index = 0;
    while (commentId != -1) {
        commentChain.push({ role: index % 2 ? 'assistant' : 'user', content: commentIdMap.get(commentId).content })
        commentId = commentIdMap.get(commentId).parentId;
        index++;
    }

    chat = chat.concat(commentChain.reverse())
    // call chatGPT api
    fetch("https://social-media-contentar.uc.r.appspot.com/api/v1/smart_reply/chat", {
        method: "POST",
        body: JSON.stringify({messages: chat}),
        headers: {
            "Content-type": "application/json",
        }
    })
    .then((response) => response.json())
        .then((result) => document.getElementById('content-textarea').innerText = result.content)
        .catch((error) => console.error(error));

    const submitButton = document.getElementsByClassName('submit')[0];
    submitButton.disabled = false;
    submitButton.classList.remove("gray");
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

