# 看懂一支影片：從影格、壓縮到聲音與串流｜參考來源總表

本表將全書實際閱讀或可取得的官方原始材料去重。查閱區間 2026-10-25 至 2026-10-26；文件若無可確認的單一發布日，明示為動態維護。對部分官方頁面讀取逾時，只引用可核對的相關內容，並以來源碼庫原始文件補讀。

- [S01] **MDN Web Docs**，*Digital video concepts*，動態維護網頁；原頁無可核實單一發表日期。URL：https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_concepts。讀取範圍：全文頁面檢視。查閱：2026-10-25 至 2026-10-26。
- [S02] **MDN Web Docs**，*Web video codec guide*，動態維護網頁；原頁無可核實單一發表日期。URL：https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs。讀取範圍：全文頁面檢視。查閱：2026-10-25 至 2026-10-26。
- [S03] **MDN Web Docs**，*Media container formats (file types)*，動態維護網頁；原頁無可核實單一發表日期。URL：https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers。讀取範圍：全文頁面檢視。查閱：2026-10-25 至 2026-10-26。
- [S04] **MDN Web Docs**，*Codecs in common media types*，動態維護網頁；原頁無可核實單一發表日期。URL：https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/codecs_parameter。讀取範圍：全文頁面檢視。查閱：2026-10-25 至 2026-10-26。
- [S05] **W3C**，*WebCodecs*，Working Draft，2026-10-19。URL：https://www.w3.org/TR/webcodecs/。讀取範圍：公開規範全文頁面查閱特定段落。查閱：2026-10-25 至 2026-10-26。
- [S06] **FFmpeg Project**，*FFmpeg Formats Documentation*，動態維護技術文件。URL：https://ffmpeg.org/ffmpeg-formats.html。讀取範圍：官網部分章節片段可讀，部分頁面載入逾時；只支援有限主張。查閱：2026-10-25 至 2026-10-26。
- [S07] **FFmpeg Project**，*ffmpeg Documentation / official source ffmpeg.texi*，動態維護技術文件。URL：https://github.com/FFmpeg/FFmpeg/blob/master/doc/ffmpeg.texi。讀取範圍：官方 GitHub 原始說明檔已打開閱讀 streamcopy 段落。查閱：2026-10-25 至 2026-10-26。
- [S08] **FFmpeg Project**，*ffprobe Documentation / official source ffprobe.texi*，動態維護技術文件。URL：https://github.com/FFmpeg/FFmpeg/blob/master/doc/ffprobe.texi。讀取範圍：官方 GitHub 原始說明檔已打開閱讀輸出欄位段落。查閱：2026-10-25 至 2026-10-26。
- [S09] **MDN Web Docs**，*Web audio codec guide*，動態維護網頁；原頁無可核實單一發表日期。URL：https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs。讀取範圍：全文頁面檢視。查閱：2026-10-25 至 2026-10-26。
- [S10] **R. Pantos、W. May**，*RFC 8216: HTTP Live Streaming*，2017-08；Informational，Independent Submission。URL：https://datatracker.ietf.org/doc/html/rfc8216。讀取範圍：原始 RFC 全文頁面已檢視 HLS 分段與變體細節。查閱：2026-10-25 至 2026-10-26。
- [S10A] **MDN Web Docs**，*Digital audio concepts*，動態維護網頁；原頁無可核實單一發表日期。URL：https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_concepts。讀取範圍：全文頁面檢視。查閱：2026-10-25 至 2026-10-26。
- [S11] **Apple Developer**，*HTTP Live Streaming (HLS) authoring specification for Apple devices*，持續修訂；頁面修訂紀錄含 2025 年條目。URL：https://developer.apple.com/streaming/hls-authoring-specification-for-apple-devices.html。讀取範圍：Apple 原始規範已閱讀。查閱：2026-10-25 至 2026-10-26。
- [S12] **W3C**，*Media Source Extensions™*，Working Draft，2026-08-07。URL：https://www.w3.org/TR/media-source-2/。讀取範圍：公開規範全文頁面查閱特定段落。查閱：2026-10-25 至 2026-10-26。
- [S13] **MDN Web Docs**，*MediaCapabilities: decodingInfo()*，動態維護網頁；原頁無可核實單一發表日期。URL：https://developer.mozilla.org/en-US/docs/Web/API/MediaCapabilities/decodingInfo。讀取範圍：全文頁面檢視。查閱：2026-10-25 至 2026-10-26。
- [S14] **W3C**，*WebVTT: The Web Video Text Tracks Format*，Candidate Recommendation Draft，2026-05-20。URL：https://www.w3.org/TR/webvtt1/。讀取範圍：公開規範全文頁面閱讀 cue 段落。查閱：2026-10-25 至 2026-10-26。
- [S16] **FFmpeg Project**，*FFmpeg Codecs Documentation*，動態維護技術文件。URL：https://ffmpeg.org/ffmpeg-codecs.html。讀取範圍：官方文件相關片段查閱，並以本地 CLI 選項核對。查閱：2026-10-25 至 2026-10-26。
- [S17] **Apple Developer**，*HTTP Live Streaming*，動態維護網頁。URL：https://developer.apple.com/streaming/。讀取範圍：公開說明頁面已閱讀。查閱：2026-10-25 至 2026-10-26。

## 獨立來源與交叉核對註記

HLS 的播放清單、分段與變體選擇以 RFC 8216 的原始協定描述 [S10]、Apple 自身的 HLS 編製規範 [S11] 相互對照。影片解碼能力則以 W3C WebCodecs [S05]、MDN MediaCapabilities [S13] 分別支持不同層次的概念。FFmpeg 的 streamcopy 與 ffprobe 功能均以專案官方原始碼庫內附文件 [S07][S08] 查證，不把第三方轉載視作獨立研究。

這是一部原理解說讀物，不提供大量實測平台的相容性矩陣。技術標準、Web API 的支援程度會隨軟體與設備版本變化，應於具體部署時另外測試。
