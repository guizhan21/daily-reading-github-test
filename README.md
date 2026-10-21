# 每日讀書：GitHub Pages + Releases 公開測試

這是獨立、非商業的兩章串流實驗。原私人書庫及其資料、設定、排程不作任何修改。

- Pages：https://guizhan21.github.io/daily-reading-github-test/
- 音訊僅放在 Releases，Git 和 Pages artifact 不含音檔。
- JSON/Markdown 為靜態內容；localStorage 只保存本裝置的章節、位置、速度與閱讀位置。
- 無伺服器、SQL、會員、跨設備同步、Vercel 或外部媒體代理。

## 內容與公開範圍

測試僅含《讓 AI 真正把事做完》前兩章：ChatGPT 為本專案撰寫的原創解說、Image 生成的原封面，以及由這兩章單獨來源製作的既有 NotebookLM 音訊。使用者於本次任務明確授權公開測試；不包含外部文章全文、私人進度、登入資料、其他書籍或備份。參考來源保持連結及引註。AI 生成內容可能出錯，數字及英文術語尚待人工確認；未宣稱服務商背書或完全事實查核。

## 建置與驗證

Node 24：`npm ci --ignore-scripts`、`npm run validate`、`npm test`、`npm run build`。
瀏覽器：`BROWSER=chrome|firefox|webkit SITE_URL=<public Pages URL> npm run test:browser`。
Windows 的 TEMP、TMP、npm cache、PLAYWRIGHT_BROWSERS_PATH 均須指向 D:\每日讀書 之內。

Workflow 在 push main 或手動觸發後驗證、建置並部署 Pages，再對真實外網 Pages/Release 跑瀏覽器測試。測試失敗會留下真實失敗紀錄，不冒稱可遷移。

## 未來完成音訊的交接入口

本機 NotebookLM 流程完成來源隔離、下載、內容及格式核對後，在本專案內建立 staging 目錄，放入已完成原音檔及 `publish.json`。檔案不進 Git。參考本次 `data/books.json` 的 book/chapters 結構，manifest 包含 `schemaVersion:1, repository, tag, rightsReviewed:true, rightsBasis, book, files:[{chapterId,file,sha256,bytes}]`。

1. 將已核准公開的 Markdown/封面放入 `public/`。
2. `npm run release:audio -- <project-contained-staging>/publish.json`。
3. 上傳器先核對每個本機 hash，建立 draft Release，完成全部資產及 GitHub SHA-256 核對後才發布；再下載公開位元組核對。全部通過才原子更新目錄。
4. 同名資產且 hash 相同則重用，hash 不同拒絕覆寫；相同書籍不重複新增。失敗不提前發布無效目錄。修訂內容須新版本/Release，不破壞舊音源。
5. 執行 validate/test/build 後提交經審核內容，push main 觸發 Actions。GitHub Actions 不能讀取 Windows D:，上傳由這個本機交接程式完成；目前未宣稱 NotebookLM 生成已由 Actions 自動完成。

## 匯出、保存與限制

`npm run export` 產生含 bookId、chapterId、原文、封面路徑、永久格式 Release URL、位元組大小及 SHA-256 的 `.tmp/library-export.json`。可由此逐一下載完整音檔並再次核對 SHA；Git clone 保存程式/正文/封面。匯出本機進度按鈕另下載個人進度 JSON。

只保存 `github.com/.../releases/download/<tag>/<asset>`，每次播放由 GitHub 產生新的短效轉址；不保存簽章 CDN URL。舊 Release 不刪除、不替換資產。新增 Release 不需重新上傳舊音訊，Pages 大小只隨文字、封面及程式增加。

官方文件（核對日期 2026-10-21）：
- [Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)：每個 asset <2 GiB、單 Release 最多1000 assets，目前文件未設定整個 Release 的總量/傳輸配額。
- [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)：站點≤1 GB，每月100 GB軟流量限制，可限流，不適合商業交易/SaaS。
- [Acceptable use §9](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies#9-excessive-bandwidth-use)：大量流量仍可被限制、暫停；這不是永久無限串流或保存保證。
- [Google 內容條款](https://policies.google.com/terms#toc-your-content)及 [OpenAI 條款](https://openai.com/policies/row-terms-of-use/)：服務商不因生成流程取得這些原創成果的所有權；第三方權利仍需尊重。

未經完整測試及使用者後續指示，不遷移完整正式書庫、不刪除任何正式媒體。
