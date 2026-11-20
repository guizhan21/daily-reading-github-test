# 給 AI 看範例，它學到哪一條規則？｜研究來源

[A] Sewon Min 等。Rethinking the Role of Demonstrations: What Makes In-Context Learning Work?（2022）。分類和選擇作業中對照正確配對、打亂標籤與無示例，也拆開格式、輸入分布和輸出範圍。 https://aclanthology.org/2022.emnlp-main.759.pdf （2026-11-21 查閱）

[B] Jerry Wei 等。Larger language models do in-context learning differently（2023，預印本）。反轉標籤按原語意評分；中性標籤另按約定評分，模型規模與條件相關，不是中文工作保證。 https://arxiv.org/html/2303.03846 （2026-11-21 查閱）

[C] Chenglei Si 等。Measuring Inductive Biases of In-Context Learning with Underspecified Demonstrations（2023）。在示例中讓兩特徵各自完美預測標籤，再以分歧題測偏向；有的偏向難以用消歧樣本消除。 https://aclanthology.org/2023.acl-long.632.pdf （2026-11-21 查閱）

[D] Yao Lu 等。Fantastically Ordered Prompts and Where to Find Them: Overcoming Few-Shot Prompt Order Sensitivity（2022）。固定四個示例、考察二十四種排列；跨任務與模型可見排序敏感，單一好排列不能當作通則。 https://aclanthology.org/2022.acl-long.556.pdf （2026-11-21 查閱）

[E] Shivanshu Gupta、Matt Gardner、Sameer Singh。Coverage-based Example Selection for In-Context Learning（2023）。獨立挑相似例可能重複相同部分；整組選取在若干組合作業較好。相似度替代指標不保證人訂規則的正確性。 https://aclanthology.org/2023.findings-emnlp.930.pdf （2026-11-21 查閱）

[F] Yonatan Geifman、Ran El-Yaniv。Selective Classification for Deep Neural Networks（2017）。分開計算接受範圍及接受項目的風險。機率保證依方法與取樣假設；不能移植到未校準聊天回答。 https://papers.neurips.cc/paper/2017/file/4a8423d5e91fda00bb7e46540e2b0cf1-Paper.pdf （2026-11-21 查閱）
