// 导入必要的模块
const express = require('express');
const cors = require('cors');
// 使用动态导入来处理ES模块版本的node-fetch
let fetch;
try {
  fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
} catch (error) {
  console.error('导入fetch模块失败:', error);
}
const fs = require('fs');
const path = require('path');

// 创建Express应用实例
const app = express();
const PORT = process.env.PORT || 3001;

// 配置中间件
app.use(cors()); // 启用CORS
app.use(express.json()); // 解析JSON请求体

// 提供静态文件服务（如果需要）
app.use(express.static(path.join(__dirname, '../')));

// API密钥配置
const API_KEY = 'sk-94da00efe70e48a183a3a6927538806b';
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

// 千问模型API调用端点已在下方定义，优化版本支持更好的流式响应处理

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务器运行正常' });
});

// 根路径重定向到index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 优化聊天API端点，确保流式响应正确处理
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        // 添加系统消息，设置AI作为生活教练的角色
        const messagesWithSystem = [
            {
                "role": "system",
                "content": "你是一位专业的生活教练和成长导师。你擅长倾听用户的困惑，提供积极、建设性的建议，帮助用户解决生活中的问题并促进个人成长。你的回答应该温暖、支持性强，并带有启发性。请使用友好自然的语言，避免过于技术性的表达。"
            },
            ...messages
        ];

        // 配置API请求选项
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: messagesWithSystem,
                stream: true, // 启用流式输出
                temperature: 0.6, // 设置温度参数
                timeout: 60000 // 超时设置为60秒
            })
        };

        // 发送请求到千问模型API
        const response = await fetch(API_URL, options);
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        // 设置响应头，启用流式传输
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 使用Node.js的流处理方式
        const decoder = new TextDecoder();
        let buffer = '';
        
        // 监听data事件
        response.body.on('data', (chunk) => {
            try {
                // 解码数据
                const text = decoder.decode(chunk, { stream: true });
                buffer += text;
                
                // 按行处理数据
                let position;
                while ((position = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.substring(0, position);
                    buffer = buffer.substring(position + 1);
                    
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6); // 去掉 'data: ' 前缀
                        
                        if (data === '[DONE]') {
                            continue;
                        }
                        
                        try {
                            // 解析JSON数据
                            const jsonData = JSON.parse(data);
                            
                            // 提取并发送内容
                            if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                                const contentData = JSON.stringify({
                                    content: jsonData.choices[0].delta.content
                                });
                                res.write(`data: ${contentData}\n\n`);
                                // 确保数据被刷新到客户端
                                res.flushHeaders();
                            }
                        } catch (error) {
                            console.error('解析JSON数据失败:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('处理数据块时出错:', error);
            }
        });
        
        // 监听end事件
        response.body.on('end', () => {
            // 发送完成信号
            res.write('data: [DONE]\n\n');
            res.end();
        });
        
        // 监听error事件
        response.body.on('error', (error) => {
            console.error('响应流错误:', error);
            res.end();
        });
        
    } catch (error) {
        console.error('API调用错误:', error);
        res.status(500).json({ error: '服务器错误，请稍后重试', details: error.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/api/health`);
    console.log(`聊天API: http://localhost:${PORT}/api/chat`);
});