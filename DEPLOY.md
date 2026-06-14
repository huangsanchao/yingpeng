# Windows 部署指南

## 一、环境要求

- **操作系统**：Windows 10/11 或 Windows Server
- **Node.js**：18+ 或 20+
- **MongoDB**：6.0+ 或 7.0+
- **可选**：PM2 / NSSM（用于后台运行）

---

## 二、安装环境

### 1. 安装 Node.js

1. 打开 [nodejs.org](https://nodejs.org/)
2. 下载 **LTS 版本**（推荐 20.x）
3. 双击安装包，一路下一步
4. 验证：打开 CMD 或 PowerShell，输入 `node -v`

### 2. 安装 MongoDB

1. 打开 [MongoDB 下载页](https://www.mongodb.com/try/download/community)
2. 选择 **Windows** 平台，下载 `.msi` 安装包
3. 双击安装，选择 **Complete**（完整安装）
4. 安装时勾选 **"Install MongoDB as a Service"**（自动开机启动）
5. 验证：打开 CMD，输入 `mongosh`

---

## 三、部署项目

### 1. 准备代码

把项目文件夹放到服务器上，比如 `D:\ecommerce-analytics`

### 2. 安装依赖 & 构建

以管理员身份打开 PowerShell，进入项目目录：

```powershell
cd D:\ecommerce-analytics

# 安装后端依赖
npm install

# 安装前端依赖并构建
cd client
npm install
npm run build
cd ..
```

### 3. 配置环境变量

编辑项目根目录的 `.env` 文件：

```env
# 服务端口
PORT=3000

# MongoDB 地址
MONGO_URI=mongodb://127.0.0.1:27017/ecommerce_analytics

# 上传目录
UPLOAD_DIR=./server/uploads

# 前端地址（生产环境改为本机IP）
CORS_ORIGIN=http://192.168.1.100
```

> `CORS_ORIGIN` 改为这台电脑的**局域网 IP**，用 `ipconfig` 查看

### 4. 启动服务

```powershell
npm start
```

看到 `Server running on port 3000` 和 `MongoDB connected` 说明启动成功。

---

## 四、让服务后台运行（推荐）

### 方案一：用 NSSM（Windows 服务，最稳定）

1. 下载 [NSSM](https://nssm.cc/download)，解压到 `C:\nssm`
2. 以管理员身份打开 CMD：

```cmd
C:\nssm\win64\nssm install ecommerce-analytics
```

3. 弹出窗口中填写：
   - **Path**：`C:\Program Files\nodejs\node.exe`
   - **Startup directory**：`D:\ecommerce-analytics`
   - **Arguments**：`server\app.js`
4. 点击 **Install service**
5. 启动服务：

```cmd
net start ecommerce-analytics
```

服务会开机自启，后台运行，崩溃自动重启。

### 方案二：用 PM2

```powershell
npm install -g pm2
pm2 start server/app.js --name ecommerce-analytics
pm2 startup （window 可能会出错，看下面）
pm2 save
```

### 常用命令

```powershell
# NSSM
net stop ecommerce-analytics     # 停止
net start ecommerce-analytics    # 启动
sc delete ecommerce-analytics    # 删除服务

# PM2
pm2 restart ecommerce-analytics  # 重启
pm2 logs ecommerce-analytics     # 查看日志
pm2 delete ecommerce-analytics   # 删除
```

---

## 五、开放防火墙端口

### 让局域网其他人能访问

1. 打开 **Windows Defender 防火墙** → **高级设置**
2. **入站规则** → **新建规则**
3. 选择 **端口** → **TCP** → 输入 `3000`
4. 选择 **允许连接** → 全选 → 命名为 `电商分析平台`

或者用命令行（管理员 PowerShell）：

```powershell
New-NetFirewallRule -DisplayName "电商分析平台" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

---

## 六、MongoDB 安全（可选）

内网使用可以不设置。如需加强安全：

```powershell
mongosh
> use ecommerce_analytics
> db.createUser({
    user: "analytics_user",
    pwd: "你的强密码",
    roles: [{ role: "readWrite", db: "ecommerce_analytics" }]
  })
```

然后修改 `.env`：

```env
MONGO_URI=mongodb://analytics_user:你的密码@127.0.0.1:27017/ecommerce_analytics
```

---

## 七、备份数据库

```powershell
# 备份
mongodump --db ecommerce_analytics --out D:\backup\ecommerce_$(Get-Date -Format 'yyyyMMdd')

# 恢复
mongorestore --db ecommerce_analytics D:\backup\ecommerce_20260614\ecommerce_analytics\
```

---

## 八、更新代码

```powershell
# 如果用 git
git pull

# 重新安装依赖 & 构建
npm install
cd client && npm install && npm run build && cd ..

# 重启服务
net stop ecommerce-analytics && net start ecommerce-analytics
# 或 pm2 restart ecommerce-analytics
```

---

## 九、访问方式

- **本机访问**：`http://localhost:3000`
- **局域网其他人**：`http://服务器IP:3000`（用 `ipconfig` 查看 IP）

mongdb 
## C:\Users\admin\AppData\Local\mongodb\compass

### 其他特殊情况：如果你真的需要在 Windows 服务器上部署
尽管绝大多数生产环境使用 Linux，但假如你的目标就是 Windows Server 并且想用 PM2，可以这样实现开机自启：

在 Windows 上安装 PM2（你已经安装过了）

使用 pm2-windows-startup 第三方工具：

bash
npm install -g pm2-windows-startup
pm2-startup install
它会创建一个 Windows 服务来启动 PM2。

正常启动你的应用：

bash
pm2 start app.js --name my-api
pm2 save
重启后 PM2 会自动恢复进程。

但请注意，Windows 与 Linux 的环境差异较大，推荐还是使用 Linux 服务器，教程也是基于 Linux 的。

好的，这是一个 Vue 前端 + Express 后端 的全栈项目。要让同事通过浏览器直接访问，需要同时部署前端和后端。

##### 方案：用 nginx 统一代理（推荐）
后端用 PM2 跑，前端构建后用 nginx 做静态托管 + API 反向代理，这样同事只需要访问一个地址。

第一步：构建前端

cd f:\yp-prod\yingpeng\client
npm run build
构建完成后，静态文件在 client/dist 目录下。

第二步：安装 nginx（Windows）
如果还没有 nginx，下载 nginx for Windows，解压到比如 C:\nginx。

第三步：配置 nginx
编辑 C:\nginx\conf\nginx.conf，找到 server 块，改成：


server {
    listen       30088;
    server_name  localhost;

    # 前端静态文件
    location / {
        root   F:/yp-prod/yingpeng/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:30089;
    }

    # 上传文件代理
    location /uploads/ {
        proxy_pass http://127.0.0.1:30089;
    }
}
第四步：调整后端端口
把后端的端口改成 30089（因为 nginx 占用了 30088）

Edit f:\yp-prod\yingpeng\.env
Modified
然后重启 PM2：


pm2 restart yingpeng_88
第五步：启动 nginx

cd C:\nginx
nginx.exe
最终效果
角色	访问方式
同事浏览器	http://192.168.5.14:30088
你本机	http://localhost:30088
nginx 监听 30088 端口，同事访问这个端口时：

请求 / → 返回前端静态页面
请求 /api/* → 转发到后端 30089 端口
