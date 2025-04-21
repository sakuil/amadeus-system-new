# Amadeus System New Alpha

一个全新的实验版本, EL PSY CONGROO~

注意，此版本已经经过重构，和初版已经不同，文档已经更新，请查看文档。

## 🤝 参与贡献

欢迎加入 Amadeus System 的开发！我们期待你的贡献：

- 🌟 提交 Issue 报告 Bug 或提出新功能建议
- 📝 改进文档内容
- 🔧 修复已知问题
- ✨ 开发新功能
- 🎨 改进用户界面

任何形式的贡献都非常欢迎。让我们一起把 Amadeus System 变得更好！

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

## 演示视频

[![BiliBili](https://img.shields.io/badge/BiliBili-视频演示1-ff69b4)](https://www.bilibili.com/video/BV1JnifYcEeM/?spm_id_from=333.1387.homepage.video_card.click)
[![BiliBili](https://img.shields.io/badge/BiliBili-视频演示2-ff69b4)](https://www.bilibili.com/video/BV1ZnrcYkEKz/?spm_id_from=333.1007.top_right_bar_window_history.content.click)

## 文档

详细的说明文档请访问：[Amadeus System 文档中心](https://docs.amadeus-web.top)

## 部署方法

### 下载本地客户端

项目提供了预编译的桌面客户端，支持 Windows系统：

1. 访问 [GitHub Releases](https://github.com/ai-poet/amadeus-system-new-alpha/releases) 页面
2. 安装并运行客户端
3. 直接试用或者配置必要的参数

### 客户端默认安装路径
C:\Users\你的用户名\AppData\Local\Programs\Amadeus

### 客户端内置服务的配置文件路径
C:\Users\你的用户名\AppData\Local\Programs\Amadeus\resources\service\\.env 
可以修改客户端使用的WEBRTC服务器地址

本地客户端提供与Zeabur在线版本相同的功能，但无需服务器部署，适合个人使用。

### 使用 Zeabur 一键部署(推荐)

[![Deploy to Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/LMSUDW?referralCode=aipoet)

#### 部署步骤

1. 点击上方的 "Deploy to Zeabur" 按钮
2. 如果你还没有 Zeabur 账号，需要先[注册](https://zeabur.com?referralCode=aipoet)。需要花费$5开通Developer计划,可使用WildCard虚拟信用卡开通,也可直接使用支付宝充值余额支付。
3. 点击上方按钮一键部署到香港AWS Tokyo区域，等待部署完成，然后如下图，填写环境变量，最后再点击Networking，生成域名，你就可以通过 Zeabur 提供的域名访问你的应用了


#### 环境变量配置说明

| 环境变量 | 说明 |
|---------|------|
| `VITE_APP_DEFAULT_USERNAME` | 用于前端登录系统的用户名，从而让Amadeus识别你的身份 |
| `WEBRTC_API_URL` | WEBRTC的服务器API地址，Zeabur模板里已经内置了公共的WEBRTC服务器，你也可以自行参考文档自行搭建 |

注意事项：
- 确保你的项目符合 Zeabur 的部署要求
- 如果你需要自定义域名，可以在 Zeabur 的控制面板中进行设置
- 建议查看 [Zeabur 的官方文档](https://zeabur.com/docs) 获取更多部署相关信息

### 使用 Docker Compose 部署

如果你想在自己的服务器上部署，可以使用 Docker Compose 进行部署。

#### 准备工作

1. 确保你的服务器已安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)
2. 准备好所有必需的环境变量（参考上方环境变量配置说明）

#### Docker Compose 配置

创建 `docker-compose.yml` 文件，内容如下：

```yaml
version: '3'
services:
  container:
    image: ghcr.io/ai-poet/amadeus-system-new-alpha
    ports:
      - "3002:3002"  # 服务端口
    environment:
      - VITE_APP_DEFAULT_USERNAME=${VITE_APP_DEFAULT_USERNAME}
      - WEBRTC_API_URL=${WEBRTC_API_URL}
    restart: unless-stopped
    networks:
      - amadeus-network
    volumes:
      - ./logs:/app/service/logs  # 日志持久化存储
networks:
  amadeus-network:
    driver: bridge
```

#### 部署步骤

1. 创建 `.env` 文件，填入所需的环境变量
2. 在 `docker-compose.yml` 所在目录运行：
```bash
docker-compose up -d
```
3. 服务将在后台启动，可以通过以下命令查看日志：
```bash
docker-compose logs -f
```
