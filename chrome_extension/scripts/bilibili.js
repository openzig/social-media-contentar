let commentIdMap = new Map();
let title = "";
let description = "";

// capture any updates to comments container and update the comment id map
observeDOM(document.getElementById('comment'), function (m) {
    title = document.getElementsByClassName('video-info-title-inner')[0]?.innerText;
    description = description = document.getElementsByClassName('desc-info-text')[0]?.innerText;
    var addedNodes = [];
    m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))
    for (let i = 0; i < addedNodes.length; i++) {
        if (!(addedNodes[i] instanceof HTMLDivElement)) {
            continue;
        }

        const className = addedNodes[i].getAttribute('class');
        if (!className || !className.includes('reply-item')) continue;

        commentIdMap = new Map();
        const replyItems = document.getElementsByClassName('reply-item');
        for (let i = 0; i < replyItems.length; i++) {
            parseReplyItem(replyItems[i], i);
        }
        break;
    }
});

function parseReplyItem(replyItemDiv, index) {
    const rootReplytDiv = replyItemDiv.getElementsByClassName('root-reply-container')[0];
    const rootReplyId = parseRootReplyDiv(rootReplytDiv, index);

    // parse sub replies
    const subReplies = replyItemDiv.getElementsByClassName('sub-reply-item');
    let parentReplyId = rootReplyId;
    for (let j = 0; j < subReplies.length; j++) {
        parentReplyId = parseSubReplyDiv(subReplies[j], parentReplyId);
    }
}

function parseRootReplyDiv(rootReplyDiv, index) {
    const replyContent = rootReplyDiv.getElementsByClassName('reply-content')[0].innerText;
    const replyAuthorId = rootReplyDiv.getElementsByClassName('user-name')[0]?.getAttribute('data-user-id');
    const replyId = hashCode(replyContent + replyAuthorId + index);

    // add event listener
    const replyButton = rootReplyDiv.getElementsByClassName('reply-btn')[0];
    replyButton.addEventListener('click', (event) => onClickReply(replyId));

    const comment = new Comment(replyId, replyContent, replyAuthorId, -1);
    commentIdMap.set(replyId, comment);
    return replyId;
}

function parseSubReplyDiv(subReplyDiv, parentReplyId) {
    const replyContent = trimContent(subReplyDiv.getElementsByClassName('reply-content')[0].innerText);
    const replyAuthorId = subReplyDiv.getElementsByClassName('sub-user-name')[0].getAttribute('data-user-id');
    const replyId = hashCode(replyContent + replyAuthorId);

    // add event listener
    const replyButton = subReplyDiv.getElementsByClassName('sub-reply-btn')[0];
    replyButton.addEventListener('click', (event) => onClickReply(replyId));

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

function onClickReply(replyId) {
    var waitForReplyBoxToShow = setInterval(function () {
        if (document.getElementsByClassName('reply-box-container').length) {
            clearInterval(waitForReplyBoxToShow);
            sendChatChain(replyId);
        }
    }, 500);
}

function sendChatChain(commentId) {
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
    const submitButton = document.getElementsByClassName('send-text')[1];
    const textBox = document.getElementsByClassName('reply-box-textarea')[1];
    callChatApi(
        function () {
            submitButton.innerText = "生成中...";
            textBox.value = "";
        },
        function (response) {
            textBox.value = response;
            var evt = new Event('input', { bubbles: true })
            textBox.dispatchEvent(evt);
            submitButton.innerText = "发布";
        },
        function (error) {
            submitButton.innerText = "生成失败(╥﹏╥)";
        },
        function () {
            submitButton.parentElement.classList.add('send-active');
        });
}
