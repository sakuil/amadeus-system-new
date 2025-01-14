# 使用 Node.js 18 作为基础镜像
FROM node:18-alpine

# 安装必要的工具
RUN apk add --no-cache python3 make g++ git

# 全局安装 pnpm 和 pm2
RUN npm install -g pnpm pm2

# 设置工作目录
WORKDIR /app

COPY package.json ./
COPY service/package.json ./service/

# 安装依赖
RUN npm install --registry=https://registry.npmmirror.com
RUN cd service && pnpm install --registry=https://registry.npmmirror.com

# 复制源代码
COPY . .

# 构建后端
RUN cd service && pnpm build && \
    rm -rf src

# 暴露端口
EXPOSE 3002

# 创建启动脚本，使用环境变量
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# 生成前端环境变量文件' >> /app/start.sh && \
    echo 'echo "VITE_AUTH_API_TOKEN=$VITE_AUTH_API_TOKEN" >> /app/.env' >> /app/start.sh && \
    echo 'echo "VITE_APP_DEFAULT_USERNAME=$VITE_APP_DEFAULT_USERNAME" >> /app/.env' >> /app/start.sh && \
    echo 'echo "VITE_APP_LOGIN_PASSWORD=$VITE_APP_LOGIN_PASSWORD" >> /app/.env' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# 生成后端环境变量文件' >> /app/start.sh && \
    echo 'echo "PORT=3002" > /app/service/.env' >> /app/start.sh && \
    echo 'echo "AUTH_API_TOKEN=$VITE_AUTH_API_TOKEN" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "OPENAI_API_BASE_URL=$OPENAI_API_BASE_URL" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "OPENAI_API_MODEL=$OPENAI_API_MODEL" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "AI_PROMPT=$AI_PROMPT" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "TIMEOUT_MS=$TIMEOUT_MS" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "WebSearchKey=$WebSearchKey" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "FISH_AUDIO_TOKEN=$FISH_AUDIO_TOKEN" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "WHISPER_API_ENDPOINT=$WHISPER_API_ENDPOINT" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "WHISPER_API_TOKEN=$WHISPER_API_TOKEN" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "VOICE_ID=$VOICE_ID" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "MEM_KEY=$MEM_KEY" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "VOICE_OUTPUT_LANGUAGE=$VOICE_OUTPUT_LANGUAGE" >> /app/service/.env' >> /app/start.sh && \
    echo 'echo "TEXT_OUTPUT_LANGUAGE=$TEXT_OUTPUT_LANGUAGE" >> /app/service/.env' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# 重新构建前端' >> /app/start.sh && \
    echo 'cd /app && pnpm build' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo '# 启动服务' >> /app/start.sh && \
    echo 'cd /app/service && pnpm prod &' >> /app/start.sh && \
    echo 'cd /app && pnpm preview --host 0.0.0.0' >> /app/start.sh && \
    chmod +x /app/start.sh

# 启动服务
CMD ["/bin/sh", "/app/start.sh"]