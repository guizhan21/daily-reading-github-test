# 全書參考來源｜2026-10-21

以下各來源均在本次成書前以網頁查閱。若頁面未提供可核實之固定發表日，明記未標示；不得以本次爬取日冒充發表日。每個 [Pxx] 標記在正文對應實際來源，網址可在離線 Markdown 檢索。來源內容含規格、實作說明與提供者工程觀點，應依類型理解證據力。

### [P01] Anthropic Engineering｜Building effective agents

- 發表／版本日期：2024-12-19
- 直接 URL：https://www.anthropic.com/engineering/building-effective-agents
- 查閱日期：2026-10-21
- 在本書中的用途：實務工程觀點：工作流程與自主代理區別、簡化架構、典型編排模式

### [P02] OpenAI｜Function calling | OpenAI API

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://developers.openai.com/api/docs/guides/function-calling
- 查閱日期：2026-10-21
- 在本書中的用途：工具呼叫 schema、strict 模式與輸入格式限制；非業務語意正確性保證

### [P03] Anthropic｜How tool use works | Claude Platform Docs

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- 查閱日期：2026-10-21
- 在本書中的用途：用戶端執行工具與服務端執行工具、模型提出結構化請求之工作方式

### [P04] Model Context Protocol｜Tools | MCP Specification, 2025-11-25

- 發表／版本日期：2025-11-25（規格版本）
- 直接 URL：https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- 查閱日期：2026-10-21
- 在本書中的用途：MCP tools/list、tools/call、inputSchema、工具註記及其信任限制

### [P05] Model Context Protocol｜Architecture overview | MCP Documentation

- 發表／版本日期：2026-07-28（文件版次）
- 直接 URL：https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture
- 查閱日期：2026-10-21
- 在本書中的用途：MCP host、client、server 的角色與互動關係

### [P06] OpenAI｜Running agents | OpenAI Agents SDK

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://openai.github.io/openai-agents-python/running_agents/
- 查閱日期：2026-10-21
- 在本書中的用途：Runner 執行迴圈、max_turns、執行及恢復狀態

### [P07] Amazon Web Services｜REL04-BP04 Make mutating operations idempotent | Reliability Pillar

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_prevent_interaction_failure_idempotent.html
- 查閱日期：2026-10-21
- 在本書中的用途：分散式操作的冪等鍵、重試與副作用、狀態追蹤

### [P08] Temporal｜Activity Definition | Temporal Documentation

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.temporal.io/activity-definition
- 查閱日期：2026-10-21
- 在本書中的用途：Activity 重試、可恢復執行、重複操作邊界及冪等要求

### [P09] Google Cloud｜Retry strategy | Cloud Storage Documentation

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.cloud.google.com/storage/docs/retry-strategy
- 查閱日期：2026-10-21
- 在本書中的用途：特定雲端服務的可重試錯誤、指數退避及冪等條件

### [P10] OWASP Cheat Sheet Series｜LLM Prompt Injection Prevention Cheat Sheet

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
- 查閱日期：2026-10-21
- 在本書中的用途：直接與間接提示注入、分層防護、最小權限與安全測試

### [P11] OWASP Cheat Sheet Series｜MCP Security Cheat Sheet

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html
- 查閱日期：2026-10-21
- 在本書中的用途：MCP 工具輸出信任風險、工具回傳的不可信資料與伺服器端授權

### [P12] Amazon Web Services｜AGENTREL02 Predictable task execution | Agentic AI Lens

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentrel02.html
- 查閱日期：2026-10-21
- 在本書中的用途：狹窄可測試的代理能力、權限隔離、執行可預測性

### [P13] Amazon Web Services｜AGENTSEC04-BP02 Human-in-the-loop for critical decisions | Agentic AI Lens

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentsec04-bp02.html
- 查閱日期：2026-10-21
- 在本書中的用途：風險分級人工審批、避免形式化的全量核准

### [P14] OpenAI｜Tracing | OpenAI Agents SDK

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://openai.github.io/openai-agents-python/tracing/
- 查閱日期：2026-10-21
- 在本書中的用途：模型與工具執行追蹤、敏感資訊可能被記錄及控制方法

### [P15] OpenAI｜Tool guardrails | OpenAI Agents SDK

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://openai.github.io/openai-agents-python/ref/tool_guardrails/
- 查閱日期：2026-10-21
- 在本書中的用途：函式工具執行前後可設置的檢查機制；不能推定全面涵蓋所有工具

### [P16] NIST｜NIST AI RMF Playbook

- 發表／版本日期：2023-03-30（文件頁提及首份完整版本；非頁面即時更新日）
- 直接 URL：https://www.nist.gov/itl/ai-risk-management-framework/nist-ai-rmf-playbook
- 查閱日期：2026-10-21
- 在本書中的用途：自願性 AI 風險治理、Govern／Map／Measure／Manage 四功能

### [P17] OpenAI｜Working with evals | OpenAI API

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://developers.openai.com/api/docs/guides/evals
- 查閱日期：2026-10-21
- 在本書中的用途：評測資料、目標準則與迭代評估；此文件載明舊 Evals 平台退出時程，不能視為永久推薦的介面

### [P18] Amazon Web Services｜AGENTOPS06-BP02 Evaluate and track ongoing agent performance | Agentic AI Lens

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp02.html
- 查閱日期：2026-10-21
- 在本書中的用途：代理上線前後評估、效能漂移監測

### [P19] OpenAI｜Human-in-the-loop | OpenAI Agents SDK

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://openai.github.io/openai-agents-python/zh/human_in_the_loop/
- 查閱日期：2026-10-21
- 在本書中的用途：暫停代理執行、工具批准或拒絕與恢復

### [P20] Model Context Protocol｜Authorization | MCP Specification, 2025-11-25

- 發表／版本日期：2025-11-25（規格版本）
- 直接 URL：https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- 查閱日期：2026-10-21
- 在本書中的用途：受保護 HTTP MCP 連線的身份授權框架、適用情境與限制

### [P21] Amazon Web Services｜Design principles | Agentic AI Lens Reliability

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/reliability-design-principles.html
- 查閱日期：2026-10-21
- 在本書中的用途：持久訊息、檢查點、冪等執行與故障恢復

### [P22] Amazon Web Services｜AGENTPERF01-BP01 Define performance-aligned success criteria | Agentic AI Lens

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentperf01-bp01.html
- 查閱日期：2026-10-21
- 在本書中的用途：延遲、吞吐、品質、效率與任務成功等績效維度

### [P23] Temporal｜Saga Pattern | Temporal Documentation

- 發表／版本日期：未標示可可靠核實的固定發表日期
- 直接 URL：https://docs.temporal.io/design-patterns/saga-pattern
- 查閱日期：2026-10-21
- 在本書中的用途：跨服務任務失敗時的補償操作與恢復設計

