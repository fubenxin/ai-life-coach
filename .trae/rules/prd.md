我想做一个网站，通过千问大模型 API实现和AI的对话，它会成为我的life coach，通过和我的对话，给我建议，帮助我成长。

千问模型 API相关信息如下：

1. API key：sk-94da00efe70e48a183a3a6927538806b

2. 参考的调用指南

curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \

-H "Authorization: Bearer $DASHSCOPE_API_KEY" \

-H "Content-Type: application/json" \

-d '{

"model": "qwen-plus",

"messages": [

{

"role": "system",

"content": "You are a helpful assistant."

},

{

"role": "user",

"content": "你是谁？"

}

]

}'

注意：API请求超时设置为60秒

打开流式输出，温度设置为0.6

整个项目请遵循

注意，可以创建一个简单的Node.js后端服务器文件，用于处理API请求并解决CORS问题。



不要使用硬编码的方式在代码中保存任何密匙，使用能适配Vercel环境变量的方式保存这些ID和密匙

全面检查代码中是否还存在硬编码的ID和密匙，输出Vercel中应该填写的环境变量和名称，一步一步的指导我完成设置。