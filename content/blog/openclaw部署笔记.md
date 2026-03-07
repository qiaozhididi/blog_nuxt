# OpenClaw 部署技术手册（Mac Mini M4）

https://openclaws.io/zh/

> 适用硬件：Mac Mini M4（Apple Silicon）  
> 适用系统：macOS 15.6  
> OpenClaw 版本：2026.3.2  


---

## 1. 环境准备

### 1.1 安装基础依赖

#### 安装 Homebrew（如未安装）
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
#### 安装 Node.js 22+
```
brew install node@22`
```
#### 验证 Node.js 版本
```
node --version  # 应显示 v22.x.x 或更高

```
#### 安装 Ollama 用于本地模型推理（可选）
```
brew install ollama
```

#### 安装 OpenClaw 

##### 方式一：一键脚本（推荐）
```
curl -fsSL https://openclaw.ai/install.sh | bash
```

##### 方式二：npm 全局安装
```
npm install -g openclaw@latest
npm install -g openclaw
```

#### 运行配置向导
```
openclaw onboard --install-daemon
```
