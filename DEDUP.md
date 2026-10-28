# 每日書籍去重

此功能保護新書准入，不刪舊書、原音訊或瀏覽器進度。書籍 ID 與作品身分分開：同一作品可有多個保留的版本或補充。既有 20 本、120 章以固定雜湊基準保留；10/28 與 10/22 睡眠書的核心重疊只記為關係，不下架。

總帳是產書工作區的 `storage/github-publishing/dedup/ledger.json`。合併早期 6 本及日更 14 本 JSON 來源，seed 只補證據。18 本尚未完成正文語意分析，範圍與核心問題保留 unknown。SHA 不同不證明內容新穎。

## 正常接書

1. 使用原下載器驗證 ZIP，再執行原 `intake.mjs --workspace <workspace> --job <job>`。首次新候選回傳 `dedup_review` 及 fingerprint，不建立音訊章節任務，也不佔用成功的每日書籍位置。完全相同正文即使改 ID、日期或提示詞，仍辨識為 duplicate。
2. 執行 `node scripts/dedup-cli.mjs compare --workspace <workspace> --fingerprint <fingerprint>`。先看全庫目錄，再真正閱讀最接近的正文；retrievalScore 只用於檢索，不能當成語意相似度或自動放行。
3. 在工作區保存審查 JSON，使用 `review --workspace <workspace> --proof <relative-json>`。格式見 `tests/dedup.test.mjs` 的 proof helper。必填當前 expectedRevision、candidateFingerprint、reviewer、decision、scope、reason、每章 chapterQuestions、全庫 metadataReviewedBookIds，以及最接近作品的 comparisons。每個比較必須有實際章節 ID／SHA／正文 quote、sharedQuestions、newCapabilities、理由與逐章 chapterComparisons；evidenceScope 明列 selected_passages 或 full_chapters，後者必須涵蓋對照書每一章。不允許捏造引用或把片段閱讀冒稱全文。這是由執行代理/人工作出的內容判斷，不是程式已具備完整語意理解。
4. 同一 job 再跑 intake，只有批准且仍有效的正文版本才建立原文／提示詞／逐章任務。批次準備、建立筆記本、記錄設定/提交、record、attach、handoff、直接 publisher 均檢查同一准入。手動繞過 CLI 去點網站不在程式可強制控制範圍；每日代理必須先檢查准入再操作 NotebookLM。
5. 其他作品獲准後，較舊批准可能失效。重新讀總帳、比較新增作品，再提交審查；保留已完成章節，不重新生成。範圍相同但所需能力不同可通過；疑似重複保持待審，不能因領域名稱相同永久封鎖。
6. revision/supplement 必須指定存在的 relatedWorkId 且以 ad-hoc 接收，不冒充每日全新書。既有相同 ID 的版本衝突仍需獨立遷移，不覆寫原正文或音訊。

## 一致性與恢復

總帳使用單一程序鎖、expectedRevision、完整性雜湊、fsync 後原子 rename，以及前一 revision 快照。這是本機多程序保護，不是跨機分散式鎖。過期審查、遺漏書目、壞總帳或不符的正文引用都會阻擋新生成。不同 ZIP 卻同 ID/版本的衝突有持久紀錄。

新版 publisher 在完整發布生命週期持有總帳鎖，其他准入寫入安全停止後重試；成功後記錄發布版本並重新產生唯讀公開目錄。原進度 key 完全不改。工作中斷只恢復原 job，不重傳成功媒體。未完成的隨機 tmp 不會作為總帳載入。總帳損毀時保留原檔並用 history / 備份核對恢復，不能重建一份空目錄自稱全庫完整。

## 上游選題與公開入口

`dedup/catalog.json` 只輸出已發布、已核准公開的書目、章節、正文網址與關係，不輸出本機路徑、候選審核、憑證或進度。`export --workspace <workspace>` 重新產生；正常新書發布成功也會自動更新，隨原 GitHub Actions 部署。

真正上游任務須實際讀取新 revision、完整書目及最接近正文。存在網址或本機 fetch 成功不代表 ChatGPT 排程能讀。兩個 00:00 任務只讀相同歷史仍可能同日撞題；`reserve --proof` 提供本機 revision 保留及完全相同核心問題的碰撞檢查，但沒有冒稱 ChatGPT 可寫本機、也不能偵測所有不同措辭的語意撞題。沒有實際上游協調時，下游關卡仍保留，明確承認無法避免上游重寫成本。

不新增或替換原成書任務，不改排程時間與模型，不增加付費 API、嵌入資料庫或雲端服務。下一次實際排程讀取及寫入可見性驗收，必須獨立記錄；模擬測試不得標為實際排程成功。
