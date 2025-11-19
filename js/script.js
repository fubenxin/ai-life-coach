// 等待DOM加载完成
 document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // 聊天历史记录
    let chatHistory = [];

    // 发送消息函数
    async function sendMessage() {
        const message = userInput.value.trim();
        
        if (message === '') return;

        // 清空输入框并重置高度
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // 禁用发送按钮
        sendButton.disabled = true;
        
        // 添加用户消息到界面
        addUserMessage(message);
        
        // 添加用户消息到历史记录
        chatHistory.push({ role: 'user', content: message });
        
        // 显示加载指示器
        loadingIndicator.style.display = 'block';
        
        // 添加AI助手消息占位符
        const aiMessageElement = addAiMessage('');
        
        try {
            // 调用API获取回复
            await getAIResponse(chatHistory, aiMessageElement);
            
            // 保存聊天历史到本地存储（可选功能）
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
            
        } catch (error) {
            console.error('发送消息错误:', error);
            // 更新错误消息
            updateAiMessage(aiMessageElement, '抱歉，我暂时无法为您提供回答。可能是网络问题或服务器暂时不可用，请稍后重试。');
        } finally {
            // 隐藏加载指示器
            loadingIndicator.style.display = 'none';
            // 启用发送按钮
            sendButton.disabled = false;
            // 确保输入框保持聚焦
            userInput.focus();
        }
    }

    // 添加用户消息到界面
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message user-message';
        
        messageElement.innerHTML = `
            <div class="avatar user-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>
            <div class="content">
                <p>${escapeHTML(message)}</p>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        scrollToBottom();
        
        return messageElement;
    }

    // 添加AI助手消息到界面
    function addAiMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-message';
        
        messageElement.innerHTML = `
            <div class="avatar system-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
            </div>
            <div class="content">
                <p>${escapeHTML(message)}</p>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        scrollToBottom();
        
        return messageElement;
    }

    // 更新AI消息内容（用于流式输出）
    function updateAiMessage(messageElement, content) {
        const contentElement = messageElement.querySelector('.content p');
        contentElement.textContent = content;
        scrollToBottom();
    }

    // 滚动到底部
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 获取AI回复
    async function getAIResponse(messages, messageElement) {
        const url = 'http://localhost:3001/api/chat';
        let fullResponse = '';
        
        try {
            // 使用Fetch API发送请求
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
            });
            
            if (!response.ok) {
                throw new Error(`服务器错误: ${response.status}`);
            }
            
            // 获取响应体的可读流
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // 处理流式响应
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                // 解码收到的数据
                const chunk = decoder.decode(value, { stream: true });
                
                // 处理SSE格式的数据
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6); // 去掉 'data: ' 前缀
                        
                        if (data === '[DONE]') {
                            continue;
                        }
                        
                        try {
                            // 解析JSON数据
                            const jsonData = JSON.parse(data);
                            
                            // 提取并显示内容
                            if (jsonData.content) {
                                fullResponse += jsonData.content;
                                updateAiMessage(messageElement, fullResponse);
                            }
                        } catch (error) {
                            console.error('解析JSON数据失败:', error);
                        }
                    }
                }
            }
            
            // 添加AI回复到历史记录
            chatHistory.push({ role: 'assistant', content: fullResponse });
            
            return fullResponse;
            
        } catch (error) {
            console.error('获取AI回复失败:', error);
            throw error;
        }
    }

    // 转义HTML特殊字符
    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }

    // 事件监听器
    sendButton.addEventListener('click', sendMessage);
    
    // 按Enter键发送消息（Shift+Enter换行）
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 输入时自动调整文本框高度
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight > 120 ? 120 : this.scrollHeight) + 'px';
    });

    // 初始化时聚焦输入框
    userInput.focus();

    // 添加一些额外的UI增强
    // 1. 点击发送按钮的动画效果
    sendButton.addEventListener('mousedown', function() {
        this.style.transform = 'translateY(0)';
    });
    
    sendButton.addEventListener('mouseup', function() {
        this.style.transform = 'translateY(-2px)';
    });
});