---
title: 单细胞与空间转录组测序的生物信息分析重点难点
description: 系统梳理 scRNA-seq 与 ST 分析全流程的关键决策点、常见坑与检查清单：从实验设计、上游处理到细胞注释、批次校正、细胞通讯与空间解卷积。
date: 2026-10-23
tags: [生物信息, 单细胞, 空间转录组, 综述]
series: 生信学习笔记
seriesOrder: 1
draft: false
---

## 摘要

单细胞转录组测序（single-cell RNA sequencing, scRNA-seq）与空间转录组测序（spatial transcriptomics, ST）已成为解析组织异质性的主流工具，但分析链条长、方法学更新快、参数敏感，是入门者最容易"跑通了代码却得不到可靠结论"的领域。本文按分析流程梳理各阶段的关键决策点与常见陷阱，覆盖实验设计、上游质控、双细胞与批次效应处理、降维聚类与细胞注释、差异表达与通路分析、细胞通讯推断，以及空间转录组特有的解卷积与邻域分析，并给出可执行的检查清单。面向生信入门者与需要解读分析结果的实验合作者[^1][^2]。

## 1. 引言：为什么单细胞分析"易学难精"

自 2009 年首次实现[^3]、2013 年被《Nature Methods》评为年度技术以来，scRNA-seq 已经从"能看到单个细胞的表达谱"发展为器官图谱、疾病分型、药物响应研究的常规手段[^1]。2019 年前后，以 10x Visium、SLIDE-seq 为代表的空间转录组技术相继问世，让"基因表达"与"组织位置"第一次可以被同时观测，ST 也于 2020 年被评为年度技术[^2]。

然而与实验流程的标准化形成反差的是，**分析环节的每一次选择都可能改变结论**：过滤阈值不同、归一化方法不同、注释参考不同，最终细胞类型的比例和标志基因都可能不一致。综述文献反复强调，单细胞分析没有唯一的"标准流程"，只有"可辩护的流程"（defensible workflow）——每个参数选择都应有依据并做敏感性检验[^4]。

本文的结构即按这条流程展开。

## 2. 实验设计：决定分析上限的一步

分析能挽救的信息不会超过实验捕获的信息。以下决策应在送样之前完成[^5]：

**生物学重复**。单细胞测序的"n"应该是供体数（donor/biological replicate）而非细胞数。多个研究指出，仅凭大细胞量、无生物学重复的设计，群体水平的统计推断不成立[^6]。常见错误是把一个样本拆成多孔当作重复。

**上机与混样策略**。10x Chromium 平台建议每通道加载 500–10,000 个活细胞，起始细胞活性应 >85%[^7]。多样本实验强烈建议使用细胞池化（multiplexing，如 cell hashing 或基因条码）以避免批次与生物学变量完全混杂——这是后续"批次效应校正"能否成立的前提[^8]。

**解离偏倚（dissociation bias）**。酶解会优先丢失脆弱细胞（如某些神经元、凋亡细胞），造成细胞类型组成的系统性偏倚；单核测序（snRNA-seq）以组织冻存代替新鲜解离可部分缓解，但缺少胞质 RNA[^9]。冻存与解离方式一旦确定，全项目内不应中途更换。

**测序深度**。10x 平台常规推荐每个细胞 20,000–50, reads，即 3' 端 kit 每细胞 20k–50k reads；深度不足主要损伤低表达基因与可变剪接的检出，而非细胞分型本身[^7]。

> **检查点 1**：设计阶段确认——生物学重复数、混样设计、解离方案、靶测序深度、预期细胞数与doublet率。

## 3. 上游处理：从 fastq 到表达矩阵

上游指比对/定量与原始矩阵生成，常用 Cell Ranger（10x 官方）、STARsolo、kallisto|bustools、alevin-fry 等[^10]。

关键点有二。其一，**比对参考的选择影响定量一致性**：人类/小鼠用官方 prebuilt 参考即可，但需记录版本（GRCh38 vs GRCh38-2024-A 的基因 ID 集不同）；非模式生物需自建 GTF 并注意基因名唯一性。其二，**空载体与低质量细胞的水位线（empty droplets）识别**：Cell Ranger 内置判定，而 UMI 工具链推荐用 SoupX 估计环境 RNA 污染并在下游校正——环境 RNA 若不处理，会掩盖稀疏群体（如免疫细胞）的真实信号[^11]。

对 ST 而言，上游还包括组织 H&E 图像对齐与核分割（10x Visium HD 已进入单细胞分辨率的 bin 选择问题），图像质量直接决定空间注释的可用性[^12]。

## 4. 质控过滤：第一处"参数敏感"

QC 的目标是剔除空滴、死细胞与 doublet，同时**不过度过滤稀有但真实的细胞群**。三个经典指标[^13]：

1. **每个细胞的 UMI/基因数**：过低提示空滴或死细胞，过高提示 doublet；
2. **线粒体基因占比**：高占比提示凋亡/损伤，但组织类型差异极大——脑组织神经元可自然表达较高 mt%，心肌更高；用统一阈值（如 20%）一刀切会误杀真实细胞[^14]；
3. **核糖体/血红蛋白基因**：血液样本需评估去除红系基因与否对分型的影响。

**推荐做法**：使用自适应阈值（如 MAD 法，median ± 3×MAD）并逐样本检查分布，而非跨样本统一硬阈值[^15]。**务必在过滤前后分别画小提琴图并保存"被剔除细胞"的统计**，这是审稿人最常追问的图之一。

Doublet 检测应作为独立步骤：Scrublet、DoubletFinder 按聚类密度模拟人工 doublet；scDblFinder 在速度与准确率上综合表现较好[^16]。经验上 10x 平台的 doublet 率约为每加载 1,000 细胞增加 0.8%[^7]，10k 细胞通道预期约 8%——不检测直接分析，会制造出"中间态细胞"的假象。

> **检查点 2**：QC 阶段确认——阈值方法与数值、逐样本 QC 图、doublet 率与检出方法、剔除比例是否在合理区间（一般 5%–25%，过高需回查实验）。

## 5. 归一化、特征选择与批次校正

### 5.1 归一化

主流方法三档：

- **全局缩放**（library size normalization + log1p）：快速、稳健，是 Seurat/Scanpy 默认流程的基础；
- **方差稳定**（sctransform 的 Pearson 残差法）：对测序深度差异建模更彻底，Seurat v5 起集成；注意其在深度差异与生物学差异纠缠时会"矫枉过正"，需配合回归变量审慎选择[^17]；
- **概率模型**（scVI 系列深度生成模型）：适合大规模、多批次、嵌套实验设计的数据，同时完成归一化与批次校正[^18]。

### 5.2 高变基因（HVG）

一般取 2,000–3,000 个 HVG 进入下游。注意：**先批次校正再选 HVG 或先选 HVG 再校正，结果不同**；Scanpy 推荐在 batch-aware 模式下选 HVG（每个批次内选再取并集），避免某一批次的特异基因垄断特征空间[^19]。

### 5.3 批次效应：最危险的一步

批次效应与生物学差异（如疾病 vs 对照的细胞组成差异）在数学上不可完全区分，因此**任何校正方法都在"去批次"与"去生物学"之间走钢丝**。实践共识[^20]：

1. **优先 prevention**：混样（multiplexing）、随机化上机顺序、平衡设计，胜过任何事后校正；
2. **方法选择**：Harmony（速度快、保留差异表达能力好）、scVI（大复杂数据）、BBKNN/MNN 适合温和批次；Seurat v5 的 integration anchoring 在细胞类型差异过大时可能过度整合；
3. **评估而非假设**：用 kBET、LISI、 silhouette 评分定量评估混合程度；**同时**确认稀有细胞类型未被"融化"——批次校正后某些亚群消失是最常见的过度校正信号；
4. **保留两套数据**：聚类/可视化用校正后的空间；**差异表达分析原则上用未校正（或仅深度归一化）的计数**，并用伪批量（pseudobulk）聚合到样本水平再做检验[^21]。

> **检查点 3**：整合阶段确认——批次变量定义、校正方法与参数、整合前后 UMAP 对比、稀有群是否保留。

## 6. 降维、聚类与细胞注释

### 6.1 降维与聚类

PCA（常用前 30–50 主成分，用肘部/方差解释率确定）→ t-SNE 或 UMAP 可视化 → Leiden 聚类（分辨率 0.4–1.2 起步）。两个反复被误解的点：

- **UMAP 的簇间距离与相对位置没有生物学含义**，只有簇的局部结构相对可靠，不要基于"两个簇挨得近"下演化或分化结论[^22]；
- **聚类分辨率是展示参数而非生物学参数**。合理的做法是以多个分辨率检查聚类稳定性，结合标志基因决定报告粒度。

### 6.2 细胞注释：自动与手动之争

注释决定整篇文章的生物学叙事，也是最容易"错得理直气壮"的环节。

- **自动注释**（SingleR、scArches+参考映射、Azimuth）：速度快、可复现，但**参考集质量决定上限**——跨组织、跨物种映射结果需人工审核；
- **手动注释**：以标志基因（canonical marker）+ 差异表达基因为证据，逐簇确认。必须警惕同一基因在不同组织中的多重身份（如 PTPRC 阳性即免疫细胞，但 HBB 高不能直接定红细胞——可能是环境 RNA 污染[^11]）；
- **分层注释**是大矩阵数据的最佳实践：先定大类（免疫/上皮/基质），再逐大类细分亚群，避免一次细分百簇导致命名混乱。

**命名规范**：亚型命名建议给出缩写+标志基因证据（如 "Tfh cells (CXCR5+ PD-1+)"），避免自造缩写在领域内无法检索。

> **检查点 4**：注释阶段确认——大类→亚群的层级、每个标签的标志基因证据、自动与手动结果的一致性表。

## 7. 下游分析 I：差异表达与通路

### 7.1 伪批量优先

单细胞水平的差异表达（DE）把细胞当独立样本，会严重夸大显著性（pseudoreplication）[^21]。**组间比较的标准做法是 pseudobulk**：把同一供体、同一细胞类型的所有细胞聚合成一个"伪批量样本"，用 edgeR/DESeq2/limma 做差异检验，以供体为重复单元[^23]。

### 7.2 通路与基因集

Massive 基因集（MSigDB Hallmark、KEGG、Reactome）配合 over-representation（GSEA/fgsea）是常规配置。注意两点：一是**背景基因集**应与分析时实际表达的基因一致，否则富集倍数失真；二是单细胞数据的"细胞类型特异通路"应在 pseudobulk 层面确认，避免把簇大小差异误读为通路激活差异。

## 8. 下游分析 II：细胞通讯与轨迹

**细胞通讯推断**（CellPhoneDB、NicheNet、CellChat）通过配体-受体表达推断细胞间信号[^24]。共同的局限：只测 mRNA，不含蛋白丰度与翻译后修饰；"受体表达"不等于"信号接收"。因此结果应视为**假设生成器**，必须配合实验验证（共染色、功能实验）报告。跨样本、跨条件比较通讯强度时，注意把细胞比例变化与信号强度变化分开陈述。

**轨迹与拟时序**（Monocle、Slingshot、RNA velocity）适合连续分化过程，不适用于离散细胞类型比较。RNA velocity 对剪接定量质量极敏感，结果解读应保守[^25]。

## 9. 空间转录组特有问题

ST 把分析对象从"细胞"变为"spot/bin"，流程新增四个环节[^12][^26]：

### 9.1 低分辨率数据的解卷积

10x Visium（55 μm spot，含 1–10 个细胞）的每个 spot 是混合表达谱，需要解卷积（deconvolution）估计 spot 内细胞类型组成：RCTD、cell2location、Tangram 是主流工具[^27]。解卷积质量依赖单细胞参考与 ST 数据的**平台匹配度**——用 10x scRNA-seq 参考解卷积 Visium 数据是文献标准做法，跨平台参考需先做 label transfer 验证。

### 9.2 组织域（domain）识别

Spatial domain 方法（BayesSpace、SpaGCN、STAGATE）在空间维度上聚类，得到组织学结构区带。**必须与 H&E 形态学对照**：纯粹由表达数据算出的"domain"若在形态学上没有对应结构，大概率是伪结构。

### 9.3 邻域与配体-受体的空间化

邻域分析（neighborhood analysis）检验特定细胞类型对是否在空间上共定位，比全局通讯推断更接近真实生物学——配体扩散距离有限，"空间上不相邻的通讯"说服力弱。MISTy、NicheNet 的空间扩展可综合配体表达与邻域关系。

### 9.4 ST 的独特 QC

组织覆盖检测、spot-图像对齐误差、边缘 spot 的低 RNA 含量，都是 ST 特有 QC 项。Visium HD 等单细胞分辨率平台还需要处理 bin 合并策略与超大规模计算的内存问题（建议 SQANTO、bento 等专用工具链）。

> **检查点 5**：ST 阶段确认——解卷积参考与工具、domain 与 H&E 一致性、空间通讯证据链。

## 10. 常见坑速查表

| # | 坑 | 后果 | 规避 |
|---|-----|------|------|
| 1 | 把细胞数当生物学重复 | 群体推断失效 | 以供体为重复单元，pseudobulk |
| 2 | 全样本统一 mt% 阈值 | 误杀高代谢细胞 | 逐样本自适应阈值 |
| 3 | 不做 doublet 检测 | 出现假"中间态细胞" | Scrublet/scDblFinder 常规化 |
| 4 | 批次校正后做 DE | 生物学信号被抹掉 | DE 用未校正计数 + pseudobulk |
| 5 | 基于 UMAP 距离下结论 | 解读过强 | 只解读局部簇结构 |
| 6 | 自动注释不复核 | 错误标签扩散到全文 | 标志基因证据表 + 人工审核 |
| 7 | 环境 RNA 不处理 | 稀有群被污染信号掩盖 | SoupX/decontX 校正 |
| 8 | 把通讯推断当结论 | 无蛋白层面证据 | 定位为假设 + 实验验证 |
| 9 | 空间 domain 不对照形态学 | 伪结构进入正文 | 与 H&E 并排图 |
| 10 | 脚本无版本、参数无记录 | 结果不可复现 | Snakemake/Nextflow + 环境快照 |

## 11. 结论

单细胞与空间转录组分析的本质，是**在统计可辩护性与生物学解释力之间反复权衡**。本文按流程给出的检查点与速查表，可作为分析前后的自查基线；更长期来看，三点趋势值得跟进：其一，深度生成模型（scVI 系）正在整合 QC、归一化、批次校正为端到端流程；其二，参考图谱（Human Cell Atlas、Azimuth）使"映射而非重建"成为注释主流；其三，多组学（CITE-seq、multiome）与高分辨率 ST 正把"表达"还原回蛋白、染色质与空间语境——分析工具会变，但"重复单元、校正边界、证据链"这三条原则不会变。

## 参考文献

[^1]: Potrony E, et al. Single-cell transcriptomics: methods and applications in biomedical research. *Cell Genomics*. 2024.

[^2]: Asp M, Bergenstråhle J, Lundeberg J. Spatially resolved transcriptomes—next generation tools for tissue research. *Annu Rev Genomics Hum Genet*. 2020;21:375-397.

[^3]: Tang F, Barbacioru C, Wang Y, et al. mRNA-Seq whole-transcriptome analysis of a single cell. *Nat Methods*. 2009;6(5):377-382.

[^4]: Luecken MD, Theis FJ. Current best practices in single-cell RNA-seq analysis: a tutorial. *Mol Syst Biol*. 2019;15(6):e8746.

[^5]: Lafzi A, Moutinho C, Picelli S, Heyn H. Tutorial: guidelines for the experimental design of single-cell RNA sequencing studies. *Nat Protoc*. 2018;13(12):2742-2757.

[^6]: Squair JW, Gautier M, Kathe C, et al. Confronting false discoveries in single-cell differential expression. *Nat Commun*. 2021;12(1):5562.

[^7]: 10x Genomics. Chromium Single Cell 3' Reagents Kits User Guide (CG00052). 2024.

[^8]: Stoeckius M, Zheng S, Houck-Loomis B, et al. Cell Hashing with barcoded antibodies enables multiplexing and doublet detection for single cell genomics. *Genome Biol*. 2018;19(1):224.

[^9]: Slyper M, Porter CBM, Ashenberg O, et al. A single-cell and single-nucleus RNA-Seq toolbox for fresh and frozen human tumors. *Nat Med*. 2020;26(5):792-802.

[^10]: You Y, Pumper E, Tian L. Comparison of read-based single-cell quantification tools. *Genome Biol*. 2023;24:110.

[^11]: Young MD, Behjati S. SoupX removes ambient RNA contamination from droplet-based single-cell RNA sequencing data. *Gigascience*. 2020;9(12):giaa151.

[^12]: Rao A, Barkley D, França GS, Yanai I. Exploring tissue architecture using spatial transcriptomics. *Nature*. 2021;596(7871):211-220.

[^13]: Ilicic T, Kim JK, Kolodziejczyk AA, et al. Classification of low quality cells from single-cell RNA-seq data. *Genome Biol*. 2016;17:29.

[^14]: Osorio D, Cai JJ. Systematic determination of the mitochondrial amount in single cells reveals the effect of tissue type on the mitochondrial-to-nuclear ratio. *Bioinformatics*. 2021.

[^15]: Amezquita RA, Lun ATL, Becht E, et al. Orchestrating single-cell analysis with Bioconductor. *Nat Methods*. 2020;17(2):137-145.

[^16]: Xi NM, Li JJ. scDblFinder: doublet detection for single-cell RNA sequencing data. *Cancer Res*. 2021;81(24):6287-6295.

[^17]: Hafemeister C, Satija R. Normalization and variance stabilization of single-cell RNA-seq data using regularized negative binomial regression. *Genome Biol*. 2019;20(1):296.

[^18]: Lopez R, Regier J, Cole MB, Jordan MI, Yosef N. Deep generative modeling for single-cell transcriptomics. *Nat Methods*. 2018;15(12):1053-1058.

[^19]: Wolf FA, Angerer P, Theis FJ. SCANPY: large-scale single-cell gene expression data analysis. *Genome Biol*. 2018;19:15.

[^20]: Hie B, Bryson B, Berger B. Efficient integration of heterogeneous single-cell transcriptomes using Scanorama. *Nat Biotechnol*. 2019;37(6):685-691.

[^21]: Squair JW, et al. Confronting false discoveries in single-cell differential expression. *Nat Commun*. 2021;12:5562.（与 [^6] 同篇，此处强调 pseudobulk 结论）

[^22]: Chari T, Banerjee J, Pachter L. The specious art of single-cell genomics. *PLoS Comput Biol*. 2023;19(8):e1011288.

[^23]: Tung PY, et al. Batch effects and the effective design of single-cell sequencing experiments. *Sci Rep*. 2017;7:39921.

[^24]: Jin S, Guerrero-Juarez CF, Zhang L, et al. Inference and analysis of cell-cell communication using CellChat. *Nat Commun*. 2021;12(1):1088.

[^25]: La Manno G, Soldatov R, Zeisel A, et al. RNA velocity of single cells. *Nature*. 2018;560(7719):494-498.

[^26]: Moses L, Pachter L. Museum of spatial transcriptomics. *Nat Methods*. 2022;19(5):534-546.

[^27]: Cable DM, Murray E, Zou LS, et al. Robust decomposition of cell type mixtures in spatial transcriptomics. *Nat Biotechnol*. 2022;40(4):599-606.
