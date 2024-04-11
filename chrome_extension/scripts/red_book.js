let commentIdMap = new Map();
let title = "";
let description = "";

// capture any updates to comments container and update the comment id map
observeDOM(document.getElementById('app'), function (m) {
    title = document.getElementById('detail-title')?.innerText;
    description = description = document.getElementById('detail-desc')?.innerText;
    var addedNodes = [];
    m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))
    for (let i = 0; i < addedNodes.length; i++) {
        if (!(addedNodes[i] instanceof HTMLDivElement)) {
            continue;
        }

        const className = addedNodes[i].getAttribute('class');
        if (!className ||
            (!className.includes('comment') && !className.includes('note-container'))) continue;

        commentIdMap = new Map();
        parseAllComments(
            'parent-comment', (parentCommentDiv) => parseParentCommentDiv(parentCommentDiv));
        break;
    }
});

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
    const submitButton = document.getElementsByClassName('submit')[0];
    callChatApi(
        function () {
            submitButton.innerText = "生成中...";
        },
        function (response) {
            document.getElementById('content-textarea').innerText = response;
            submitButton.innerText = "发送";
            document.getElementsByClassName('recent-emoji')[0]?.remove();
        },
        function (error) {
            submitButton.innerText = "生成失败(╥﹏╥)";
        },
        function () {
            submitButton.disabled = false;
            submitButton.classList.remove("gray");
        });
}
