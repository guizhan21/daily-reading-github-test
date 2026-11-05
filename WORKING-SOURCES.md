# 受控工作正文與發布前檢查

正文、原提示及原 ZIP 是不可變的來源。正文修正另存 working version，包含原／新
來源、facts、web review、原提示與完整提交指令的 SHA。原 bookId、chapterId、
出版日、canonical contentHash 和已成功音訊不重寫。

pending 且沒有 provider 工作才可啟用工作版；啟用須持有 intake／version lease、
重讀實際 state，經當前去重准入及正式 working-source 修訂審查。不可直接改
state.sourceSha256、manifest 或 active 指標來換音訊的來源。

facts／web review 在生成前綁定正文版本。完整原章 prompt 原樣保留，再加入逐段
約束；超過 5000 字元拒絕，不截斷。舊不完整 v1 計畫不能拿來新提交。
生成後只核對章節／artifact 身分、SHA、真格式、時長與完整解碼，不重新加入
ASR、回聽或語義拒稿。歷史審查記錄保留。

來源身分與可更新的去重審查回執分開：審查過期先補比較；相同 immutable source
重新准入後，沿原 artifact 恢復，不因總帳 revision 更新而重新生成。

根交接程式必須執行配置發布 checkout 自己的 handoff／publisher，而不是另一份
producer checkout。來源版本 map 缺失、SHA／artifact 不符、查證不完整、權利
未確認、音訊或封面缺失都不能發布。已發布舊版沒有 working version 時保留
原 historical/current admission，不要求重生音訊。

從 producer 工作目錄執行整本本機預檢：

```sh
node scripts/publish-github.mjs --book BOOK_ID --dry-run
node scripts/publish-github.mjs --book BOOK_ID --cover ORIGINAL_COVER --approval RIGHTS_JSON --preflight
```

`--dry-run` 回報逐章來源／計畫與 operation policy；`--preflight` 還核對完整原音、
封面、公開權利及 publisher source binding。兩者均不寫公開正文、權利目錄或
書目，不呼叫 GitHub 發布，也不能和 `--publish` 混用。預檢可能在 producer
儲存區準備相同原音的本機 staging 副本；音訊不進 Git 或 Pages。

publisher CLI 亦支援對已準備 manifest 做 `--preflight`；沒有完整查證、有效
來源／成品身分與雜湊綁定權利，不能憑預檢自行授權發布。實際生成、Release、
push 與部署仍各有當期授權、完整書籍及網站驗收邊界。

本文件不代表任何新書或音訊已生成／部署，也不改排程、模型、來源負責方或
正式發布 checkout 設定。
