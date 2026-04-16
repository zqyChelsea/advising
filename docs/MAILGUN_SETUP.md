# Mailgun 配置指南

本文档说明如何配置 Mailgun 以实现教师通过邮件回复工单的功能。

## 目录

1. [为什么选择 Mailgun](#为什么选择-mailgun)
2. [注册 Mailgun 账号](#注册-mailgun-账号)
3. [配置发信（SMTP）](#配置发信smtp)
4. [配置收信（Inbound Routing）](#配置收信inbound-routing)
5. [更新后端代码](#更新后端代码)
6. [测试配置](#测试配置)
7. [常见问题](#常见问题)

---

## 为什么选择 Mailgun

- **多邮箱兼容**：支持 Gmail、Outlook、QQ邮箱、企业邮箱等任意邮箱
- **多老师协作**：只需配置一个域名，所有老师的邮箱都可以收到通知
- **实时推送**：邮件到达立即 POST 到后端，无需轮询
- **免费额度**：每月 10,000 封邮件（含入站和出站）

---

## 注册 Mailgun 账号

### 步骤 1：访问 Mailgun 官网

打开 https://www.mailgun.com/ ，点击「Start Free」开始注册。

### 步骤 2：填写注册信息

```
Email: 你的邮箱地址
Password: 设置密码
Name: 你的名字
```

### 步骤 3：验证邮箱

登录邮箱，点击 Mailgun 发送的验证链接。

### 步骤 4：选择套餐

选择 **Free Tier**（免费套餐）：
- 每月 5,000 封出站邮件
- 每月 10,000 封入站路由邮件
- 功能完整，足够开发和测试使用

### 步骤 5：设置域名（关键步骤）

Mailgun 需要一个域名来收发邮件。有两种选择：

#### 选项 A：使用 Mailgun Sandbox（推荐开发测试用）

- Sandbox 是 Mailgun 提供的临时域名，格式如：
  ```
  sandboxXXXXX.mailgun.org
  ```
- **优点**：无需拥有自己的域名，立即可用
- **缺点**：发件人只能是已验证的邮箱地址，需要手动添加授权收件人

#### 选项 B：使用自己的域名（推荐生产环境）

- 需要拥有一个域名（如 `yourdomain.com`）
- 按 Mailgun 提示配置 DNS 记录（MX、SPF、DKIM）
- **优点**：专业、可自定义发件人地址、可转发给任意收件人

---

## 配置发信（SMTP）

### 获取 SMTP 凭证

1. 登录 Mailgun Dashboard
2. 左侧菜单选择 **Sending** → **SMTP & API**
3. 找到 **SMTP Credentials**，记录以下信息：
   ```
   SMTP Host: smtp.mailgun.org
   SMTP Port: 587 (TLS) 或 465 (SSL)
   Username: postmaster@yourdomain.com 或 postmaster@sandboxXXXXX.mailgun.org
   Password: xxxxxxxxxxxxxxxx（API Key）
   ```

### 更新后端 .env 文件

在 `backend/.env` 中添加或更新以下配置：

```bash
# Mailgun SMTP 配置
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=your-api-key-here

# 公共 URL（用于生成回复链接）
PUBLIC_URL=https://your-backend-url.com

# 教师邮箱（可以多个，用逗号分隔）
TEACHER_EMAIL=teacher1@school.edu.hk,teacher2@school.edu.hk
```

> **注意**：`SMTP_PASS` 不是登录密码，而是 Mailgun 的 **API Key**，格式类似 `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`。

### 更新 emailService.js

`emailService.js` 已经配置为读取环境变量，只需确保 `.env` 正确即可。发信功能会自动使用 Mailgun SMTP。

---

## 配置收信（Inbound Routing）

这是实现「老师回复邮件 → 系统自动更新工单」的核心步骤。

### 步骤 1：进入 Inbound 路由配置

在 Mailgun Dashboard 中：
1. 左侧菜单选择 **Receiving** → **Inbound Routes**
2. 点击 **Create Route**

### 步骤 2：设置匹配规则

```
Expression Type: Match recipients
Expression: match_recipient(".*@your-sandbox.mailgun.org")
```

或者如果使用自己的域名：
```
Expression Type: Match recipients  
Expression: match_recipient(".*@yourdomain.com")
```

### 步骤 3：设置动作（Action）

点击 **Add Action**，选择 **Forward**：

```
Forward: https://your-backend-url.com/api/tickets/webhook/email-reply
Method: POST
```

**完整配置示例**：

| 字段 | 值 |
|------|-----|
| Expression Type | Match recipients |
| Expression | `match_recipient(".*@sandbox12345.mailgun.org")` |
| Action 1 | `forward("https://your-ngrok-url.ngrok-free.app/api/tickets/webhook/email-reply")` |

### 步骤 4：保存并激活

- 点击 **Create Route**
- 确保路由状态为 **Active**

> **重要**：Inbound Route 需要后端可公网访问。如果还在开发阶段，需要使用 ngrok 或类似工具把本地端口暴露到公网。

---

## 更新后端代码

### 步骤 1：安装必要依赖

```bash
cd backend
npm install mailgun.js form-data
```

### 步骤 2：配置 Webhook 验证（可选但推荐）

Mailgun 的 Inbound 邮件会在 HTTP 请求头中带有签名，后端可以验证签名确保请求确实来自 Mailgun。

在 `ticketRoutes.js` 的 webhook 接口中添加签名验证：

```javascript
// ticketRoutes.js

// 验证 Mailgun 签名
const verifyMailgunSignature = (req) => {
  const token = req.headers['mailgun-signature'];
  const timestamp = req.headers['mailgun-timestamp'];
  
  if (!token || !timestamp) return false;
  
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', process.env.MAILGUN_API_KEY)
    .update(timestamp + req.body)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(signature)
  );
};

// Webhook 端点
router.post('/webhook/email-reply', async (req, res) => {
  // 可选：验证签名
  // if (!verifyMailgunSignature(req)) {
  //   return res.status(401).json({ message: 'Invalid signature' });
  // }
  
  // 现有逻辑...
});
```

### 步骤 3：处理 Mailgun 的邮件格式

Mailgun 发送的邮件数据格式与 SendGrid/Mailgun 不同，需要调整解析逻辑。

更新 `ticketRoutes.js` 中的 webhook 处理：

```javascript
router.post('/webhook/email-reply', async (req, res) => {
  try {
    // Mailgun 使用不同的字段名
    const { 
      sender,           // 发件人地址
      recipient,        // 收件人地址
      subject,          // 邮件主题
      body-plain,       // 纯文本内容
      body-html,        // HTML 内容
      'stripped-text': strippedText,  // 去掉引用后的内容
      'stripped-html': strippedHtml
    } = req.body;

    // 提取发件人信息
    const fromMatch = sender?.match(/^"?([^"<]+)"?\s*<(.+)>$/);
    const senderName = fromMatch ? fromMatch[1].trim() : sender;
    const senderEmail = fromMatch ? fromMatch[2] : sender;

    // 从主题中提取 Ticket ID
    const ticketIdMatch = subject?.match(/\[Issue Report (TIC-[A-Z0-9-]+)\]/);
    
    // 或者从 recipient 中提取（格式：ticket-{objectId}@domain.com）
    const objectIdMatch = recipient?.match(/ticket-([a-f0-9]+)@/i);

    let ticket = null;

    if (ticketIdMatch) {
      ticket = await Ticket.findOne({ ticketId: ticketIdMatch[1] });
    } else if (objectIdMatch) {
      ticket = await Ticket.findById(objectIdMatch[1]);
    }

    if (!ticket) {
      console.log('No matching ticket found for email:', { sender, subject });
      return res.status(200).json({ message: 'No matching ticket found' });
    }

    // 使用处理后的内容（去掉引用）
    let replyContent = strippedText || body-plain || '';
    replyContent = replyContent
      .split(/\n\s*On .* wrote:/)[0]
      .split(/\n\s*-{3,}/)[0]
      .trim();

    // 添加回复到工单
    ticket.replies.push({
      from: senderName,
      fromEmail: senderEmail,
      content: replyContent,
      isTeacher: true
    });

    if (ticket.status === 'pending') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    // 通知学生
    const user = await User.findById(ticket.user);
    if (user) {
      const latestReply = ticket.replies[ticket.replies.length - 1];
      sendTicketReplyNotification(ticket, latestReply, user).catch(err =>
        console.error('Error sending reply notification:', err)
      );
    }

    res.status(200).json({ message: 'Reply processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ message: 'Internal error' });
  }
});
```

---

## 测试配置

### 测试发信

1. 在前端创建一个新工单
2. 检查教师邮箱是否收到邮件
3. 查看后端日志确认邮件发送成功

```bash
# 后端日志应该显示：
# Email sent successfully: <message-id>
```

### 测试收信

1. 在教师邮箱中点击邮件的「回复」
2. 编写回复内容，发送到工单地址（格式：`ticket-{ticketId}@your-sandbox.mailgun.org`）
3. 刷新学生端工单详情页，检查是否显示老师回复

### 使用 Mailgun 测试工具

Mailgun Dashboard 提供 **Routes** 测试功能：

1. 进入 **Receiving** → **Inbound Routes**
2. 点击路由右侧的 **Test Route** 按钮
3. 填入测试数据：

```json
{
  "sender": "Teacher Name <teacher@school.edu.hk>",
  "recipient": "ticket-abc123@sandbox12345.mailgun.org",
  "subject": "[Issue Report TIC-20250308-001] Test Ticket",
  "body-plain": "This is a test reply from the teacher."
}
```

4. 点击 **Send Test**，查看后端是否正确处理

---

## 常见问题

### Q1: 收不到邮件怎么办？

1. 检查 Mailgun 路由是否 **Active**
2. 检查后端服务是否运行并可公网访问（使用 ngrok 测试）
3. 检查垃圾邮件文件夹
4. 在 Mailgun Dashboard 查看 **Events** 日志

### Q2: 如何添加多个老师？

在 `.env` 中配置多个邮箱：

```bash
TEACHER_EMAIL=teacher1@school.edu.hk,teacher2@school.edu.hk,teacher3@school.edu.hk
```

发信时会依次发送给每个老师。

### Q3: 如何使用自己的域名？

1. 在 Mailgun 添加域名（需要配置 DNS）
2. 按 Mailgun 指示添加 MX、SPF、DKIM 记录
3. 等待 DNS 生效（通常 24-48 小时）
4. 使用自己的域名作为发件人和收件人后缀

### Q4: 后端需要 HTTPS 吗？

是的，Mailgun 的 Inbound Route 需要 HTTPS 端点。开发阶段可以使用 ngrok 提供的 HTTPS 代理。

### Q5: 如何查看 Mailgun 日志？

1. Mailgun Dashboard → **Sending** → **Events**
2. 可以筛选：Delivered, Opened, Clicked, Failed 等
3. 使用搜索功能查找特定邮件

---

## 环境变量汇总

完成后，你的 `.env` 文件应该包含以下配置：

```bash
# 服务器
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/advising

# Mailgun SMTP（发信）
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@yourdomain.com
SMTP_PASS=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Mailgun API（可选，用于签名验证）
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 公共 URL
PUBLIC_URL=https://your-backend-url.com
NGROK_URL=https://your-ngrok-url.ngrok-free.app

# 教师邮箱
TEACHER_EMAIL=teacher@school.edu.hk
```

---

## 总结

配置完成后，系统工作流程如下：

```
1. 学生创建工单
   ↓
2. 后端通过 Mailgun SMTP 发邮件给老师
   ↓
3. 老师在 Gmail/Outlook 点击「回复」
   ↓
4. 邮件发到 Mailgun（ticket-{id}@yourdomain.com）
   ↓
5. Mailgun 检测到新邮件，POST 给后端 /api/tickets/webhook/email-reply
   ↓
6. 后端解析邮件，更新 MongoDB ticket.replies
   ↓
7. 学生端实时看到老师回复 ✅
```

如有疑问或遇到问题，请检查：
1. 后端服务是否运行
2. Inbound Route 是否 Active
3. DNS 是否生效（如果使用自己域名）
4. 后端日志中的错误信息
