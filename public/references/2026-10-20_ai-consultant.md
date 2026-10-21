# 全書參考來源

查閱日期：2026-10-20。以下26項均為本次實際開啟的原始研究、作者教材或官方文件；各章使用其對應部分，沒有把搜尋摘要冒稱已讀全文。線上文件的查閱日不是發表日；未能確認更新日的項目明列為線上版本。

正文沒有直接搬用研究中的數據表。所有數學例子、虛構培訓機構與工程設計均另行標示。引用提供可追溯依據，不代表本書已重現實驗或每一條建議都經企業部署驗證。

### [A01] Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks

作者／機構：Patrick Lewis 等  
發表／版本：2020 初稿；所讀 v4：2021-04-12  
來源：https://arxiv.org/html/2005.11401v4  
查閱日期：2026-10-20  
本次閱讀範圍：摘要、引言、第2節：外部檢索與參數化生成結合，以及共同訓練的設計。  
使用限制：只用於機制與研究歷史；未重現實驗，不把論文架構或歷史成績當作目前所有產品的表現。

### [A02] Retrieval-augmented generation (RAG) in Azure AI Search

作者／機構：Microsoft  
發表／版本：線上官方文件；本次查閱版本  
來源：https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview  
查閱日期：2026-10-20  
本次閱讀範圍：The challenges of RAG：查詢理解、多來源取得、輸入限制、回應速度及治理；不引用產品模型清單。  
使用限制：代表廠商對自身架構的說明，不是獨立效能測試；不據此推薦採購或聲稱自動消除錯誤。

### [A03] Chunk large documents for RAG and vector search in Azure AI Search

作者／機構：Microsoft  
發表／版本：頁面更新：2026-07-02  
來源：https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents  
查閱日期：2026-10-20  
本次閱讀範圍：Common chunking techniques、Content overlap considerations、Factors for chunking data。  
使用限制：只採切分方法與取捨；不把預設尺寸、英文字符比例或示例重疊量當成中文通用標準。

### [A04] Introducing Contextual Retrieval

作者／機構：Anthropic  
發表／版本：2024-09-19  
來源：https://www.anthropic.com/engineering/contextual-retrieval  
查閱日期：2026-10-20  
本次閱讀範圍：長上下文替代思路、Contextual Retrieval 的片段背景補充、原文與背景區分；方法與限制段落。  
使用限制：不引用廠商百分比改善或舊價格；沒有獨立重現，不能把其結果推廣到使用者知識庫。

### [A05] Search over Markdown blobs in Azure AI Search

作者／機構：Microsoft  
發表／版本：線上官方文件；本次查閱版本  
來源：https://learn.microsoft.com/en-us/azure/search/search-how-to-index-azure-blob-markdown  
查閱日期：2026-10-20  
本次閱讀範圍：Markdown parsing modes：oneToMany 與 oneToOne，以及依標題／內容區塊形成搜尋文件。  
使用限制：用作結構化處理的產品例子，不聲稱 Markdown 一定更準，也不要求使用特定服務。

### [A06] Document layout analysis

作者／機構：Microsoft  
發表／版本：線上官方文件；檢視 doc-intel-4.0.0  
來源：https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/layout?view=doc-intel-4.0.0  
查閱日期：2026-10-20  
本次閱讀範圍：Tables：行列、row/column span、標頭、位置及關聯文字的輸出；版面與文字關係。  
使用限制：只說明可表達的資料結構；未上傳或處理任何使用者文件，沒有實測辨識準確率。

### [A07] Okapi BM25: a non-binary model

作者／機構：Christopher D. Manning、Prabhakar Raghavan、Hinrich Schütze  
發表／版本：《Introduction to Information Retrieval》2008；網頁標示2009-04-07  
來源：https://nlp.stanford.edu/IR-book/html/htmledition/okapi-bm25-a-non-binary-model-1.html  
查閱日期：2026-10-20  
本次閱讀範圍：BM25 對詞頻、文件長度與集合詞頻的處理，以及參數應在開發集調整。  
使用限制：不抄錄公式圖或教材例子；中文班別例子與工作建議為本書原創。

### [A08] Dense Passage Retrieval for Open-Domain Question Answering

作者／機構：Vladimir Karpukhin 等  
發表／版本：2020；所讀v3：2020-09-30  
來源：https://arxiv.org/html/2004.04906v3  
查閱日期：2026-10-20  
本次閱讀範圍：第3.1節：問題及段落編碼、內積、預先編碼文件、索引和推論；引言的稀疏／稠密互補。  
使用限制：不引用歷史提升百分比，不宣稱今日向量方法勝過所有文字方法。

### [A09] Semantic Search

作者／機構：Sentence Transformers 專案  
發表／版本：線上官方文件；本次查閱版本  
來源：https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html  
查閱日期：2026-10-20  
本次閱讀範圍：Background、Symmetric vs. Asymmetric Semantic Search，以及查詢和文件編碼的適用差別。  
使用限制：不指定當前最佳模型或任何固定向量維度；二維數學例子為本書假設。

### [A10] Hybrid search using vectors and full-text search in Azure AI Search

作者／機構：Microsoft  
發表／版本：線上官方文件；本次查閱版本  
來源：https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview  
查閱日期：2026-10-20  
本次閱讀範圍：Why use hybrid search、How does hybrid search work：文字、向量、精確標識及排名融合。  
使用限制：只確認方法組合；不把廠商效能敘述當成使用者專案的測試結果。

### [A11] Relevance scoring in hybrid search using Reciprocal Rank Fusion (RRF)

作者／機構：Microsoft  
發表／版本：線上官方文件；本次查閱版本  
來源：https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking  
查閱日期：2026-10-20  
本次閱讀範圍：How RRF ranking works：各清單按名次給分再加總；平滑常數與近鄰候選數不同。  
使用限制：文中排名甲乙為自訂算例；六十只用於演算，不主張所有系統都應採同一常數。

### [A12] Retrieve & Re-Rank

作者／機構：Sentence Transformers 專案  
發表／版本：線上官方文件；本次查閱版本  
來源：https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html  
查閱日期：2026-10-20  
本次閱讀範圍：Retrieve & Re-Rank Pipeline、Bi-Encoder 與 Cross-Encoder 的分工及計算取捨。  
使用限制：文中候選一百、最後八段是本書示例；不作固定推薦，不將重排分數當正確機率。

### [A13] BEIR: A Heterogenous Benchmark for Zero-shot Evaluation of Information Retrieval Models

作者／機構：Nandan Thakur、Nils Reimers、Andreas Rücklé、Abhishek Srivastava、Iryna Gurevych  
發表／版本：2021；所讀v2：2021-04-28  
來源：https://arxiv.org/html/2104.08663v2  
查閱日期：2026-10-20  
本次閱讀範圍：摘要、引言：跨領域檢索泛化與傳統基準的重要性。  
使用限制：只引用該版本的定性結論，未使用後續版本資料集數量；不是2026年模型排行榜。

### [A14] Lost in the Middle: How Language Models Use Long Contexts

作者／機構：Nelson F. Liu 等  
發表／版本：2023；所讀v3：2023-11-20  
來源：https://arxiv.org/html/2307.03172v3  
查閱日期：2026-10-20  
本次閱讀範圍：摘要、引言及實驗設計描述：多文件問答、鍵值查找、相關資料位置與長上下文使用。  
使用限制：不引用模型具體成績，不把2023年的觀察說成所有目前模型都具有相同弱點。

### [A15] Enabling Large Language Models to Generate Text with Citations

作者／機構：Tianyu Gao、Howard Yen、Jiatong Yu、Danqi Chen  
發表／版本：EMNLP 2023-12  
來源：https://aclanthology.org/2023.emnlp-main.398/  
查閱日期：2026-10-20  
本次閱讀範圍：作者摘要與出版中繼資料：ALCE 評估流暢性、正確性與引用品質。  
使用限制：本次讀取出版頁摘要，未冒稱閱讀PDF全文；未採用摘要中的50%數字或未讀的公式。

### [A16] RAGAs: Automated Evaluation of Retrieval Augmented Generation

作者／機構：Shahul Es、Jithin James、Luis Espinosa Anke、Steven Schockaert  
發表／版本：EACL 2024-03  
來源：https://aclanthology.org/2024.eacl-demo.16/  
查閱日期：2026-10-20  
本次閱讀範圍：作者摘要與出版資料：檢索、忠實使用上下文及生成品質的不同維度，reference-free 評估框架。  
使用限制：本次讀取摘要，未閱讀PDF全文或試跑套件；不將當前套件全部指標都稱為無需參考答案。

### [A17] ARES: An Automated Evaluation Framework for Retrieval-Augmented Generation Systems

作者／機構：Jon Saad-Falcon、Omar Khattab、Christopher Potts、Matei Zaharia  
發表／版本：NAACL 2024-06  
來源：https://aclanthology.org/2024.naacl-long.20/  
查閱日期：2026-10-20  
本次閱讀範圍：作者摘要：context relevance、answer faithfulness、answer relevance；模型評審及人工標註校準。  
使用限制：本次讀取摘要，未冒稱閱讀PDF全文或驗證工具成效，不使用其實驗數字作部署門檻。

### [A18] Evaluation of unranked retrieval sets

作者／機構：Christopher D. Manning、Prabhakar Raghavan、Hinrich Schütze  
發表／版本：《Introduction to Information Retrieval》2008  
來源：https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-unranked-retrieval-sets-1.html  
查閱日期：2026-10-20  
本次閱讀範圍：Precision、Recall 的分子分母與不同失敗類型。  
使用限制：文中相關片段集合、排名和比例均為本書自訂並核算，不使用教材圖表。

### [A19] Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena

作者／機構：Lianmin Zheng 等  
發表／版本：2023；所讀v4：2023-12-24  
來源：https://arxiv.org/html/2306.05685v4  
查閱日期：2026-10-20  
本次閱讀範圍：摘要及位置偏誤相關段落：評審的順序、冗長、自我偏好與能力限制。  
使用限制：沒有引用表格數字，沒有宣稱當前所有模型的偏誤程度相同；本文校準方案是工程建議。

### [A20] Document-level access control in Azure AI Search

作者／機構：Microsoft  
發表／版本：線上官方文件；本次查閱版本  
來源：https://learn.microsoft.com/en-us/azure/search/search-document-level-access-overview  
查閱日期：2026-10-20  
本次閱讀範圍：文件層級存取、呼叫者身分、Security filters 的查詢時篩選模式。  
使用限制：只確認可檢查的權限模式，不聲稱預覽能力已全面正式推出或使用者已部署；快取設計為本書推論。

### [A21] LLM01:2025 Prompt Injection

作者／機構：OWASP Gen AI Security Project  
發表／版本：2025風險項目；本次查閱線上版本  
來源：https://genai.owasp.org/llmrisk/llm01-prompt-injection/  
查閱日期：2026-10-20  
本次閱讀範圍：直接／間接注入定義，以及限制權限、分隔內容、驗證輸出與高風險動作審核。  
使用限制：只作防禦教育，不提供攻擊細節；與A22對照不是兩次獨立攻擊實驗，不能宣稱風險已消除。

### [A22] Not what you’ve signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection

作者／機構：Kai Greshake 等  
發表／版本：2023；所讀v2：2023-05-05  
來源：https://arxiv.org/html/2302.12173v2  
查閱日期：2026-10-20  
本次閱讀範圍：摘要、引言：外部資料中的指示可影響LLM整合應用、資料與指令邊界。  
使用限制：不採用攻擊附錄與操作細節，不把2023年的產品弱點直接當作目前產品狀態。

### [A23] NIST AI RMF Playbook

作者／機構：美國國家標準暨技術研究院（NIST）  
發表／版本：AI RMF 1.0 配套線上資源；頁面標示框架正在更新  
來源：https://airc.nist.gov/airmf-resources/playbook/  
查閱日期：2026-10-20  
本次閱讀範圍：Govern、Map、Measure、Manage；自願使用、非全套必做清單的定位。  
使用限制：只作風險工作框架，不當法律認證、合規判定或已完成治理的證明。

### [A24] Update or rebuild an index in Azure AI Search

作者／機構：Microsoft  
發表／版本：線上官方文件；本次查閱版本  
來源：https://learn.microsoft.com/en-us/azure/search/search-howto-reindex  
查閱日期：2026-10-20  
本次閱讀範圍：新增、merge、mergeOrUpload、delete、個別文件結果，以及更新／重建的區分。  
使用限制：不將供應商特定API行為推廣到所有資料庫；快取與撤回流程為本書原創設計。

### [A25] Add a filter to a vector query in Azure AI Search

作者／機構：Microsoft  
發表／版本：線上官方文件；本次查閱版本  
來源：https://learn.microsoft.com/en-us/azure/search/vector-search-filters  
查閱日期：2026-10-20  
本次閱讀範圍：前置／後置過濾，過濾位置與漏回、延遲、吞吐量的取捨；preview標記。  
使用限制：不把同名參數在不同產品中的行為視為相同，不宣稱前置過濾消除所有近似搜尋誤差。

### [A26] Evaluation — InformationRetrievalEvaluator

作者／機構：Sentence Transformers 專案  
發表／版本：線上官方文件；本次查閱版本  
來源：https://sbert.net/docs/package_reference/sentence_transformer/evaluation.html  
查閱日期：2026-10-20  
本次閱讀範圍：InformationRetrievalEvaluator：queries、corpus、relevant_docs，以及MRR、Recall@k等獨立指標。  
使用限制：未執行套件；本書只演算定義，四題排名為假設，不引用文件展示的模型成績。
