(() => {
  // ============================================================
  // DeepSeek API 配置
  // ============================================================
  const API_KEY = "sk-91306c3ccbe84301ad4b09966a843969"; // 替换为你的 DeepSeek API Key
  const API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  const MODEL = "deepseek-v4-flash";

  // ============================================================
  // System Prompt — AI 分身
  // ============================================================
  const SYSTEM_PROMPT = `你是杨磊磊的 AI 分身。请以第一人称（"我"）回答问题，就像杨磊磊本人在和对方聊天。

## 关于我
- 姓名：杨磊磊
- 学校：河南财政金融学院，经济学专业，本科，2023.09 - 2027.06
- 求职意向：2027 届，正在寻找 AI 应用开发方向的暑期实习机会

## 技能
Python、Vue.js、FastAPI、Agent、机器学习、Dify、提示词工程、RAG

## 证书
- CAIE 注册人工智能工程师
- CDA 数据分析师
- 英语四级（CET-4）
- 机动车驾驶证

## 个人评价
经济学专业背景，自学 AI 并独立完成多个实战项目，涵盖 Agent 开发、RAG、全栈应用等领域。具备将业务问题转化为技术方案的能力，善于自主学习和快速迭代，能独立从 0 到 1 完成产品。

## 项目经历
1. **新闻头条 App**（Vue3 + Vant + FastAPI）
   全栈移动端新闻聚合与推荐系统，支持智能摘要生成，前后端分离架构。
   GitHub: https://github.com/yang1729346/news-headline-app

2. **AI 学习路径规划器**（Streamlit + DeepSeek）
   根据用户目标生成个性化 AI 学习路线图，帮助快速建立结构化知识体系。
   GitHub: https://github.com/yang1729346/ai-learning-path-planner

3. **AI 厨师助手**（FastAPI + Chat + Memory）
   智能食谱推荐与烹饪引导应用，结合会话记忆提升交互连续性与个性化体验。
   GitHub: https://github.com/yang1729346/ai-chef-assistant

4. **车险数据可视化仪表板**（Python 数据可视化）
   聚焦关键指标分析与图表展示，帮助业务快速识别趋势与风险信号。
   GitHub: https://github.com/yang1729346/Auto-Insurance-Visualization-Dashboard

5. **车险欺诈检测模型**（机器学习）
   基于阿里天池数据集训练的欺诈预测模型，用于识别潜在欺诈样本并支持风控决策。
   GitHub: https://github.com/yang1729346/Insurance-fraud-detection

## 联系方式
- 邮箱：2359555101@qq.com
- GitHub：https://github.com/yang1729346

## 规则
- 回答简洁友好，像本人在聊天
- 只回答简历中已有的信息，不编造内容
- 如果被问到简历中没有的信息，坦诚说明并建议通过邮箱联系
- 可以适当使用 markdown 格式（加粗、列表等）让回答更清晰`;

  // ============================================================
  // 轻量 Markdown 解析（无外部依赖）
  // ============================================================
  function renderMarkdown(text) {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // code blocks (```)
    html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
    // inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    // bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    // unordered list items
    html = html.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
    // ordered list items
    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
    // wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");
    // paragraphs (double newline)
    html = html.replace(/\n\n+/g, "</p><p>");
    // single newline → <br>
    html = html.replace(/\n/g, "<br>");
    // wrap in <p>
    html = "<p>" + html + "</p>";
    // clean empty <p>
    html = html.replace(/<p><\/p>/g, "");

    return html;
  }

  // ============================================================
  // 对话历史
  // ============================================================
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  // ============================================================
  // DOM 元素
  // ============================================================
  const toggle = document.getElementById("chat-toggle");
  const widget = document.getElementById("chat-widget");
  const closeBtn = document.getElementById("chat-close");
  const messagesEl = document.getElementById("chat-messages");
  const textarea = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");

  // ============================================================
  // 开关对话框
  // ============================================================
  toggle.addEventListener("click", () => {
    widget.classList.toggle("open");
    if (widget.classList.contains("open")) {
      textarea.focus();
      hideHint();
    }
  });

  closeBtn.addEventListener("click", () => {
    widget.classList.remove("open");
  });

  // ============================================================
  // 添加消息到界面
  // ============================================================
  function addMessage(role, content) {
    const div = document.createElement("div");
    div.className = "chat-msg " + role;
    div.innerHTML =
      '<div class="chat-bubble">' +
      (role === "assistant" ? renderMarkdown(content) : escapeHtml(content)) +
      "</div>";
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  // ============================================================
  // 发送消息
  // ============================================================
  let isStreaming = false;

  async function sendMessage() {
    const text = textarea.value.trim();
    if (!text || isStreaming) return;

    // 用户消息
    addMessage("user", text);
    messages.push({ role: "user", content: text });
    textarea.value = "";
    textarea.style.height = "auto";

    // AI 消息占位
    isStreaming = true;
    sendBtn.disabled = true;
    const aiDiv = addMessage("assistant", "");
    const bubble = aiDiv.querySelector(".chat-bubble");
    bubble.innerHTML = '<span class="chat-typing">思考中...</span>';

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + API_KEY,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: messages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error?.message || "请求失败 (" + res.status + ")"
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // 保留不完整的行

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              aiText += delta;
              bubble.innerHTML = renderMarkdown(aiText);
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
          } catch (_) {
            // 跳过解析错误的行
          }
        }
      }

      messages.push({ role: "assistant", content: aiText });
    } catch (err) {
      bubble.innerHTML =
        '<span class="chat-error">出错了：' +
        escapeHtml(err.message) +
        "</span>";
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      textarea.focus();
    }
  }

  // ============================================================
  // 事件绑定
  // ============================================================
  sendBtn.addEventListener("click", sendMessage);

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 自动调整输入框高度
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  });

  // ============================================================
  // 提示气泡
  // ============================================================
  const hint = document.getElementById("chat-hint");
  let hintTimer;

  function showHint() {
    hint.classList.add("show");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, 5000);
  }

  function hideHint() {
    hint.classList.remove("show");
    clearTimeout(hintTimer);
  }

  hint.addEventListener("click", () => {
    hideHint();
    widget.classList.add("open");
    textarea.focus();
  });

  // 页面加载 1.5 秒后显示提示
  setTimeout(showHint, 1500);
})();
