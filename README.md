# 日讀｜每日讀書有聲書庫

GitHub Pages 提供自然風格書房、三個獨立書架、分類搜尋、書籍簡介、全文閱讀與常駐播放器；原始 M4A 只保存在 GitHub Releases。JSON / Markdown 保存內容，localStorage 保存本瀏覽器的書架狀態、閱讀章節、閱讀位置、播放章節、播放位置和倍速。沒有帳號、跨裝置同步、伺服器、SQL 或其他託管服務的執行依賴。

## 三個獨立書架

首頁只提供入口與接續閱讀，不重複展示整個書庫。`#library/unread`、`#library/reading`、`#library/completed` 分別是未讀、正在讀及已讀完頁面；書名／簡介／章名搜尋和主題篩選僅作用於目前書架。舊 `#library` 連結仍可開啟未讀頁面。

首次打開原文或實際開始播放，書籍移入正在讀。全部章節聽完會自動進入已讀完；純文字讀者可以在書籍頁的「我的書架」手動調整狀態。手動標記不會刪除音訊位置、倍速或閱讀紀錄。從手動未讀重新開始閱讀／收聽會再次進入正在讀。只載入音訊 metadata 或保存零秒，不會把未讀書籍誤標為正在讀。

沿用 `daily-reading-github:v1`，舊版已保存的章節與位置可直接判斷閱讀狀態，不清除或改用新的儲存 key。手動狀態優先，播放／閱讀位置仍按原本的穩定書籍及章節 ID 分開保存。森林、海岸及山脈插圖是本專案的輕量 SVG，原書籍封面、正文及音訊保持原版本。

[網站](https://guizhan21.github.io/daily-reading-github-test/) · [原始音檔](https://github.com/guizhan21/daily-reading-github-test/releases) · [Actions](https://github.com/guizhan21/daily-reading-github-test/actions)

## 遷移與部署保護

基準為 `31265a0177129090553f39513d7669933fdd4c68`。完整遷移在獨立 migration 分支開發；該分支只建置、測試及保存 Actions artifact，不能覆蓋目前 Pages。只有 main 的完整權利清單、資料、HTTP 與三種瀏覽器測試通過，才能部署。部署後再次由外部 Actions 測試真實 Pages / Release。

原應用程式和資料保留。只有完整驗證後才合併 main；實機 Safari、背景及鎖屏播放另行驗收，桌面 WebKit 不等於 iPhone。

## 原有功能對照

| 原功能 | 靜態網站 |
| --- | --- |
| 今日書房、書架入口 | 森林／天空／山脈／海岸插圖，首頁不堆疊全書庫 |
| 閱讀狀態、分類、搜尋 | 未讀／正在讀／已讀完分頁，各頁搜尋書名、簡介、章名；所有歷年書籍持續保留 |
| 封面、簡介、章節排序、參考來源 | 保留原圖像／原 CSS 版型及穩定 ID |
| 全文閱讀、Markdown 下載 | 原文 SHA-256 核對，建置時安全渲染 |
| 播放、暫停、倍速、拖曳、前後章、十五秒跳轉 | 原生 audio 直接播放 Release 原音檔 |
| 續播、閱讀位置 | 本機 localStorage，保留舊測試版進度格式 |
| 管理與每日入庫 | 本機發布 CLI；公開網站不提供匿名上傳管理 API |
| 個人進度匯出 | 瀏覽器下載 JSON，清除網站資料前可保留 |
| 跨裝置同步／站內登入 | 依使用者新架構移除，不宣稱具備 |

文字是原創 AI 解說，來源引註保留；圖像封面由 Image 生成，音訊是既有 NotebookLM 原成果。兩本最早的書原本使用 CSS 封面版型，沿用原版型。數字與英文術語尚待人工核對，檔案和播放驗收不代表完整事實查核或服務商背書。逐版本公開權利及章節雜湊記於 `data/publication-rights.json`；不確定的內容不能自動核准。

## 建置與測試

播放進度按穩定 bookId / chapterId 分開保存。再次按同章播放會直接續聽，不重新載入音源；切章、暫停、拖曳、隱藏頁面和離開前保存進度。還原跳轉完成前不寫回零秒，慢速載入或連續重新整理也保留原位置。已聽完的章節標記「已聽完」，再按會從頭重聽；播放器另有「從頭播放」按鈕，只重設目前一章。倍速和刻意倒退的位置一併保留。舊測試版 v1 本機紀錄沿用，沒有換 key 清空進度；不同網站來源與不同裝置的紀錄不會自動互通。

瀏覽器測試使用真實 Release 原音檔，額外涵蓋同章連點不重載、兩章位置隔離、書籍重開、慢速載入中再次重整、真正播到結束、自動下一章、完成章節重聽及主動倒退後還原。

Node 24，執行 `npm ci --ignore-scripts`、`npm run validate`、`npm test`、`npm run build`。
`npm run acceptance` 檢查全部核准書籍都已進入目錄、無音檔進入部署包且無禁止的執行依賴。
`BROWSER=chrome|firefox|webkit npm run test:local` 在隔離本機伺服器測試；`SITE_URL=<Pages URL> npm run test:browser` 測試實際外網。
Windows 的 TEMP / TMP / TMPDIR / npm cache / Playwright profiles 必須設定在核准的專案內。
Git hooks 與 CI 掃描真正暫存的 bytes、Git 歷史、私密檔案、音檔、SQL、備份及私人絕對路徑。檔案只進 Releases，不使用 Git LFS。

## 每日產書的本機交接

上游兩個既有成書任務保持不變；使用者已於 2026-10-23 永久取消 Pro 專屬模型限制，不再以模型標籤阻擋接書或發布。GitHub Actions 無法讀取個人電腦上的檔案；發布必須由本機執行，然後 push main 觸發部署。

1. 既有下載器確認真實 ZIP 完成，驗證 CRC 與 SHA-256。尚未到達是 `waiting_book`。
2. 從保留的產書專案執行 `node --import tsx <site>/scripts/intake.mjs --workspace <project> --job <download-id>`。這只重用既有純 ZIP 驗證與下載模組，建立獨立 JSON 來源、逐章原文／提示詞及持久檢查點，不載入舊網站的資料儲存模組。臨時書籍加 `--ad-hoc`，不佔每日固定位置。

   跨午夜的來源保留原 bookId、章節 ID 與出版日期，用 `--received-date YYYY-MM-DD` 分別記錄接收日。極少數原包只有輔助 `quality_report.json` 未列入其 checksum 時，可使用逐檔核對且已明確授權的 `--reviewed-source <local-review.json>`；原 ZIP 不修改，正文與 prompt 的雜湊必須完全一致，原嚴格轉換器仍再次驗證所有已列檔案。其他缺失或不同版本不會自動放行。
3. 逐章在既有已登入 NotebookLM 正常介面完成來源隔離、設定與生成；`intake.mjs --record <chapterId> --proof <project-contained-json>` 保存實際 provider IDs 和階段，不因等待逾時重生。登入、驗證碼、配額須遵守平台限制。此處沒有冒稱官方生成 API。
4. 既有下載器保存原 M4A，實際核對主題及語言；`intake.mjs --attach <chapterId> --file <original> --proof <review-json>` 驗證原檔雜湊、有效 AAC、時長、完整解碼及來源／內容核對證據。數字及術語未確認必須保留標記。附入的原音檔永不轉碼。
5. 每本新書沿用 Image 原封面與核對紀錄；只傳入專案內已驗證的原封面。建立與正文、音訊和封面雜湊綁定的公開權利核對紀錄。
6. `npm run handoff -- --workspace <project> --catalog <JSON-catalog> --state-root <chapter-states> --book <stable-id> --cover <original-cover> --approval <rights-json> --publish`。也可直接讀取保留產書專案既有 `content/catalog.json` / `storage/notebooklm` 完成紀錄。先逐章核對原件與完整解碼，才組成發布批次。
7. 發布器使用一個全域本機 lease，建立整本 draft Release、核對全部 GitHub digest，再發布並重新取得公開完整 bytes 核對 SHA。全部通過才原子更新書籍 JSON。中斷使用持久 journal 恢復；同名同 hash 重用、不同 hash 拒絕覆寫，不重傳舊音檔。首次兩章實驗允許在明確核對下追加缺少章節，原兩個 asset 不變。
8. 執行 validate / test / build / acceptance，再提交經檢查的文字、封面與程式，push main。所有舊書和已發布 Release 保留，沒有自動過期或刪除。

`release:audio -- <publish.json> --stage-only` 只準備草稿，不發布 Release 或更新書籍目錄。來源、封面、公開權利、完整音訊、公開 bytes 任一項未就緒，都不能宣稱上架。新的版本衝突安全停止，禁止盲目覆寫。

NotebookLM 仍依賴本機、Codex 和已登入瀏覽器；00:30 是開始接書時間，並非保證音訊上架時間。未聲稱 Windows 關機後仍會生成。2026-10-22 已實測真實 ZIP → 獨立 NotebookLM → 原 M4A 核對 → Release 與候選書庫；正式 Pages 仍受完整遷移門檻保護，沒有把候選或 Release 完成當成已部署。整合測試的既有成品／重建封裝不當成新生成成果，細節見 MIGRATION.md。

日更只檢查新增書音源時，可設定 `BOOK_IDS`（逗號分隔的現有 bookId）執行 `node scripts/probe.mjs`，以 `HTTP_REPORT` 指定 test-results 中的 JSON 檔名。未指定時仍驗證全部候選音源；未知 ID 或不安全檔名會拒絕，避免空集合假通過。成功重試的目前章節狀態會清除舊失敗原因，歷史初稿及核對紀錄仍保留。

## 匯出、回滾與服務限制

`npm run export` 產生包含 bookId、chapterId、版本、原文／封面／參考來源 SHA、Commit、原音訊容量與 canonical Release URL 的索引。音檔的完整離線備份須另外下載並逐一比對 SHA。個人進度不提交 Git。

回滾：從保留基準建立 revert Commit 後 push main，或依核對備份回復程式和目錄；不刪除 Release 音源。遷移未完成期間不合併 main、不停用原正式部署。完整本機備份、provider 工作紀錄和憑證位於公開倉庫之外，憑證另管。

每次播放使用 `github.com/.../releases/download/<tag>/<asset>`，不保存短效 CDN 簽章。原生 audio 可使用 Range；不依賴跨來源 fetch / Web Audio API。瀏覽器的實際播放、拖曳與回應標頭由測試紀錄判斷。

官方文件（2026-10-21）：
- [Release 限制](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)：每個 asset 小於 2 GiB、每 Release 最多 1000 assets。
- [Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)：站點容量與流量仍有限制。
- [合理使用政策 §9](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies#9-excessive-bandwidth-use)：過量使用可被限流或暫停；「保留所有舊書」是本專案政策，不能當成 GitHub 無條件永久無限儲存／串流保證。
