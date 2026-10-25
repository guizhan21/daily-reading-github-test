# 播放生命週期與系統中斷

網站維持一個原生 audio 元件；書架、全文、播放器及皮膚不替換它。來源仍是每書 GitHub Release 的原始 M4A，進度仍用既有 localStorage schema 及逐章位置。

使用者明確操作（頁面播放、選章、重聽、OS 媒體 Play／前後章）與自動操作（接章、定時檢查、恢復網路）分開。Audio Session 回報 interrupted 時，自動操作讓出音訊焦點；使用者明確播放則呼叫原生 play，由瀏覽器／OS 決定是否接受。網站不切換虛假狀態、不反覆改音訊類型、不無限重試。

Media Session 依實際 metadata 核對，不能只以章節 ID 當作已發布的證明。平台清空同章資訊後，原生播放事件會補回。metadata、playbackState、positionState 各自容錯，單一 API 失敗不阻斷其餘回報。pageshow 只在音訊實際仍播放時刷新系統資料，不重啟已暫停的音訊。

「設定 → 匯出播放問題紀錄」提供本機最近 100 個播放／中斷／頁面事件。紀錄只留在目前瀏覽器；不包含完整 URL、簽章、cookie、書籍內文或登入憑證，不自動上傳。此紀錄沒有 iOS 原生父 App 識別碼，無法證明靈動島將打開哪個 App。

測試：`npm test`、`npm run test:browser` 及 `npm run test:background`。session-recovery 測試刻意注入 Audio Session 狀態／OS 指令；使用原始音訊、真實解碼與播放時鐘，但不是 iPhone 控制中心、鎖屏或 force-quit 測試。原生來源 HTTP／Range／SHA、續播及真正 Chrome hidden 接章測試繼續保留。

2026-10-25 的三項軟體回歸：明確播放被 interrupted 提前攔截、同章 metadata 清空後不回補、metadata setter 失敗連帶阻斷狀態／位置回報，均先在舊程式測得失敗。這不代表已證明其為 iPhone 返回幽界的根因。
