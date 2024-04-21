document.addEventListener('yt-navigate-start', process);
if (document.body) process();
else document.addEventListener('DOMContentLoaded', process);

function process() {
    console.log('loaded....')
}

let commentIdMap = new Map();
let title = "";

// capture any updates to comments container and update the comment id map
observeDOM(document.getElementById('comments'), function (m) {
    title = document.getElementById('title')?.innerText;
    //description = description = document.getElementsByClassName('desc-info-text')[0]?.innerText;
    var addedNodes = [];
    m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))
    console.log(addedNodes)
    for (let i = 0; i < addedNodes.length; i++) {
        if (!(addedNodes[i] instanceof HTMLDivElement)) {
            continue;
        }

        console.log(addedNodes)
        const className = addedNodes[i].getAttribute('class');
        if (!className || !className.includes('reply-item')) continue;

        commentIdMap = new Map();
        const replyItems = document.getElementById('comments').getElementsByTagName('ytd-comment-thread-renderer');
        for (let i = 0; i < replyItems.length; i++) {
            parseReplyItem(replyItems[i], i);
        }
        break;
    }
});

function parseReplyItem(replyItemDiv, index) {
    const rootReplytDiv = replyItemDiv.getElementsByTagName('ytd-comment-view-model')[0];
    const rootReplyId = parseRootReplyDiv(rootReplytDiv, index);

    // parse sub replies
    const subReplies = replyItemDiv.getElementById('replies').getElementsByTagName('ytd-comment-view-model');
    let parentReplyId = rootReplyId;
    for (let j = 0; j < subReplies.length; j++) {
        parentReplyId = parseSubReplyDiv(subReplies[j], parentReplyId);
    }
}

function parseRootReplyDiv(rootReplyDiv, index) {
    const replyContent = rootReplyDiv.getElementById('content-text').innerText;
    const replyAuthorId = rootReplyDiv.getElementById('author-text').innerText;
    const replyId = hashCode(replyContent + replyAuthorId + index);

    // add event listener
    const replyButton = rootReplyDiv.getElementById('reply-button-end');
    replyButton.addEventListener('click', (event) => onClickReply(replyId, rootReplyDiv));

    const comment = new Comment(replyId, replyContent, replyAuthorId, -1);
    commentIdMap.set(replyId, comment);
    return replyId;
}

function parseSubReplyDiv(subReplyDiv, parentReplyId) {
    const replyContent = subReplyDiv.getElementById('content-text').innerText;
    const replyAuthorId = subReplyDiv.getElementById('author-text').innerText;
    const replyId = hashCode(replyContent + replyAuthorId + parentReplyId);

    // add event listener
    const replyButton = subReplyDiv.getElementById('reply-button-end');
    replyButton.addEventListener('click', (event) => onClickReply(replyId, subReplyDiv));

    const comment = new Comment(replyId, replyContent, replyAuthorId, parentReplyId);
    commentIdMap.set(replyId, comment);
    return replyId;
}

function trimContent(content) {
    if (content.startsWith('回复 ') || content.startsWith('回復 ')) {
        content = content.substring(content.indexOf(':') + 1).trimStart();
    }

    return content;
}

function onClickReply(replyId, replyDiv) {
    var waitForReplyBoxToShow = setInterval(function () {
        if (replyDiv.getElementById('replybox')) {
            clearInterval(waitForReplyBoxToShow);
            sendChatChain(replyId, replyDiv);
        }
    }, 500);
}

function sendChatChain(commentId, replyDiv) {
    // chat starts with post content
    chat = [{ role: 'user', content: title }];
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
    const submitButton = replyDiv.getElementById('submit-button').getElementsByTagName('button')[0];
    const submitButtonTxt = submitButton.getElementsByTagName('span')[0];
    const textBox = replyDiv.getElementById('contenteditable-root');
    callChatApi(
        function () {
            submitButtonTxt.innerText = "Gen ing...";
            textBox.innerText = "";
        },
        function (response) {
            textBox.innerText = response;
            submitButtonTxt.innerText = "Reply";
        },
        function (error) {
            submitButtonTxt.innerText = "Gen failed";
        },
        function () {
            submitButton.removeAttribute('disabled');
            submitButton.classList
                .remove('yt-spec-button-shape-next--disabled')
                .add('yt-spec-button-shape-next--call-to-action')         
        });
}
