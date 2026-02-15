# Founder Scan: Hot-Cold Memory Tiering for Rapid AI Checkpoint Cycles

**Date:** 2026-02-13
**Analyst:** Claude (Tigerclaw)
**Type:** Latent Founder Signal Scan

## Executive Summary

Scanned academic publications (ASPLOS, SOSP, MLSys, NSDI, FAST, ISCA 2025), GitHub repos, social channels, and news for founders/researchers building at the intersection of memory tiering and AI checkpointing. Identified **15 unique individuals** across 3 tiers of signal strength. The strongest cluster is at the **University of Toronto (Pekhimenko Lab)**, where advisor Gennady Pekhimenko founded CentML (acquired by NVIDIA 2025) and 3 PhD students are publishing directly on CXL memory tiering for AI workloads. Market timing is validated by Marvell's $5.5B Celestial AI acquisition (Jan 2026), AWS SageMaker HyperPod launching tiered checkpointing (Dec 2025), and CXL 4.0 spec advancing.

## Tier 1 — REACH OUT (6 candidates)

### 1. Kevin Song — University of Toronto / Pekhimenko Lab
- **Signal strength:** Strong
- **Thesis fit:** Direct
- **Work:** HybridTier — CXL memory tiering system for AI workloads. Published at **ASPLOS 2025** (top-tier architecture conference). System intelligently places data across DRAM and CXL tiers for ML training.
- **Why now:** Advisor Gennady Pekhimenko founded CentML, acquired by NVIDIA in 2025 — proven lab-to-startup pipeline. Paper published July 2025, research is active.
- **Co-authors:** Jiacheng Yang, Zixuan Wang (also in Pekhimenko lab — see Tier 2)
- **Action:** Reach out via Pekhimenko network. This lab has the strongest commercialization precedent.
- **Sources:** ASPLOS 2025 proceedings

### 2. Jinshu Liu — Virginia Tech / MoatLab
- **Signal strength:** Strong
- **Thesis fit:** Direct
- **Work:** Systematic CXL memory characterization at scale. Published at **ASPLOS 2025**. Built practical benchmarking infrastructure — open-source on GitHub ([MoatLab/Melody](https://github.com/MoatLab/Melody)).
- **Why now:** Active GitHub repo signals builder mentality (not pure academic). Collaboration with **Microsoft Research (Daniel Berger)** — industry validation. Advisor Huaicheng Li is Google Research Scholar 2025.
- **Action:** Direct outreach or via advisor Huaicheng Li.
- **Sources:** [GitHub - MoatLab/Melody](https://github.com/MoatLab/Melody), ASPLOS 2025 proceedings

### 3. Xuanlin Jiang — Harvard
- **Signal strength:** Strong
- **Thesis fit:** Direct
- **Work:** NEO — CPU offloading system for LLM inference that manages memory hierarchy between GPU HBM and CPU DRAM. Published at **MLSys 2025**.
- **Why now:** Co-authored with **Ion Stoica** (Databricks founder) and Minlan Yu. Solves the acute GPU memory crisis for inference — highly productizable. Connected to top founder network.
- **Action:** Leverage Ion Stoica connection for intro. High potential for spinout.
- **Sources:** MLSys 2025 proceedings

### 4. Xingda Wei — Shanghai Jiao Tong University / IPADS Lab
- **Signal strength:** Strong
- **Thesis fit:** Direct
- **Work:** PhoenixOS — concurrent OS-level GPU checkpoint and restore with validated speculation. Published at **SOSP 2025** (top systems conference). First OS service enabling concurrent GPU process checkpoint/restore for fault tolerance, migration, and fast startup.
- **Why now:** Production-ready code on GitHub ([SJTU-IPADS/PhoenixOS](https://github.com/SJTU-IPADS/PhoenixOS)). SOSP publication is highest-tier signal. Corresponding author.
- **Action:** Monitor for commercialization intent. Potential geographic challenge (Shanghai) but SOSP-quality work attracts global attention.
- **Sources:** [arXiv:2405.12079](https://arxiv.org/abs/2405.12079), [GitHub](https://github.com/SJTU-IPADS/PhoenixOS), [ACM DL](https://dl.acm.org/doi/10.1145/3731569.3764813)

### 5. Radostin Stoyanov — University of Oxford
- **Signal strength:** Strong
- **Thesis fit:** Direct
- **Work:** CRIUgpu — transparent checkpointing of GPU-accelerated workloads without API interception. Supports CUDA and ROCm. Published **arXiv Feb 2025**. Evaluated on BERT, GPT-2, LLaMA 3 training.
- **Why now:** Collaboration with engineers from **NVIDIA, Google, and Red Hat** — strong industry pull. Builds on CRIU (widely-used checkpoint/restore infrastructure). PhD at Oxford with production-oriented research.
- **Website:** [radostin.io](https://radostin.io/)
- **Action:** Reach out directly. Industry partnerships suggest commercialization awareness.
- **Sources:** [arXiv:2502.16631](https://arxiv.org/abs/2502.16631), [GitHub - criu-coordinator](https://github.com/checkpoint-restore/criu-coordinator)

### 6. Mikaila J. Gossman — Argonne National Lab collaboration
- **Signal strength:** Strong
- **Thesis fit:** Direct
- **Work:** Comprehensive study of LLM checkpoint/restore I/O strategies across memory tiers (GPU HBM, host DRAM, local disk, remote storage). Published **arXiv Dec 2025**. Maps the entire checkpoint pressure landscape across the memory hierarchy.
- **Why now:** Definitive reference paper on the exact problem space. Co-authored with Bogdan Nicolae (established checkpoint/fault-tolerance researcher at Argonne).
- **Action:** Reach out. Deep domain expertise mapping the full checkpoint I/O stack.
- **Sources:** [arXiv:2512.24511](https://arxiv.org/abs/2512.24511)

## Tier 2 — WATCH (9 candidates)

### 7. Borui Wan — HKU / ByteDance
- **Thesis fit:** Direct | **Strength:** Medium
- **Work:** ByteCheckpoint — production distributed checkpoint system. Published at **NSDI 2025**. Deployed at scale inside ByteDance for training fault tolerance.
- **Note:** Production deployment at ByteDance = battle-tested system. Risk: may stay internal to ByteDance.
- **Sources:** NSDI 2025 proceedings

### 8. Weijian Chen — Zhejiang University
- **Thesis fit:** Direct | **Strength:** Medium
- **Work:** IMPRESS — LLM KV cache tiering system. Published at **FAST 2025**. Intelligently manages hot/cold KV cache data across memory tiers during inference.
- **Sources:** FAST 2025 proceedings

### 9. Xinyue Yi — City University of Hong Kong
- **Thesis fit:** Direct | **Strength:** Medium
- **Work:** ArtMem — RL-based adaptive memory tiering. Published at **ISCA 2025**. Uses reinforcement learning to dynamically decide data placement across memory tiers.
- **Sources:** ISCA 2025 proceedings

### 10. Zhuobin Huang — National University of Singapore (ex-SJTU)
- **Thesis fit:** Direct | **Strength:** Medium
- **Work:** PhoenixOS co-first author with Xingda Wei (see #4). Recently moved from SJTU to NUS — geographic move may indicate inflection.
- **Sources:** [arXiv:2405.12079](https://arxiv.org/abs/2405.12079)

### 11. Rui Xie — (affiliation unclear, collab with Tong Zhang)
- **Thesis fit:** Adjacent | **Strength:** Medium
- **Work:** CXL memory lossless compression for KV cache offloading. Tackles bandwidth bottleneck when shifting inference traffic to CXL tier.
- **Sources:** [arXiv:2509.03377](https://arxiv.org/html/2509.03377)

### 12-13. Jiacheng Yang & Zixuan Wang — University of Toronto / Pekhimenko Lab
- **Thesis fit:** Direct | **Strength:** Medium
- **Work:** HybridTier co-authors with Kevin Song (#1). Part of the Pekhimenko lab cluster.
- **Action:** Track alongside Kevin Song. Multiple co-founders from same lab is a common pattern.

### 14. Hao Zhang — UC San Diego
- **Thesis fit:** Adjacent | **Strength:** Medium
- **Work:** Assistant Professor, founder of Hao AI Lab. Created vLLM (widely-adopted LLM serving framework). Leading research on disaggregated inference and memory management. Active NVIDIA DGX B200 collaboration.
- **Note:** Already entrepreneurial with open-source projects. Disaggregated inference requires sophisticated memory tiering for KV cache. Potential spinout or advisory role.
- **Sources:** [haozhang](https://cseweb.ucsd.edu/~haozhang/), [Hao AI Lab](https://hao-ai-lab.github.io/), [Twitter](https://x.com/haoailab)

### 15. Huaicheng Li — Virginia Tech (Faculty)
- **Thesis fit:** Direct | **Strength:** Medium
- **Work:** Faculty leading MoatLab. Google Research Scholar 2025. Advisor to Jinshu Liu (#2). Lab focuses on CXL memory systems and storage.
- **Note:** Lab tracker — likely to produce more founder candidates.
- **Sources:** Virginia Tech CSE faculty page

## Market Context & Timing Signals

| Signal | Date | Implication |
|--------|------|-------------|
| **Marvell acquires Celestial AI for $5.5B** | 2026-01-22 | "End of the memory wall" becoming commercial thesis at scale |
| **AWS SageMaker HyperPod tiered checkpointing** | 2025-12 | Hyperscaler validating the problem; also creates ecosystem lock-in risk for startups |
| **Penguin Solutions CXL NV-CMM 2T module** | 2026-01-14 | CXL hardware ecosystem maturing — startups can build on real silicon |
| **CXL 4.0 spec advancing** | 2025-12 | Next-gen interconnect enables new memory pooling architectures |
| **MoonshotAI checkpoint-engine** (open source) | 2025 | Chinese AI labs investing in checkpoint infrastructure; open-source baseline rising |
| **Kubernetes pod checkpoint/restore** | 2025 | Infrastructure-layer adoption of checkpoint primitives in orchestration |
| **The Register: "agentic AI strains memory hierarchies"** | 2026-01-28 | Problem reaching mainstream tech press awareness |

## Key Cluster: University of Toronto — Pekhimenko Lab

This is the single most interesting cluster:
- **Gennady Pekhimenko** founded CentML (acquired by NVIDIA 2025) — proven lab-to-startup path
- **3 PhD students** (Kevin Song, Jiacheng Yang, Zixuan Wang) publishing on exact thesis topic at ASPLOS 2025
- CentML was a GPU compiler optimization company; memory tiering is the natural next primitive
- Lab has demonstrated ability to translate systems research into venture-scale companies

## Risks & Open Questions

1. **AWS moat risk:** SageMaker HyperPod tiered checkpointing launched Dec 2025. Is this already "good enough" for most customers?
2. **CXL maturity:** CXL 3.0/4.0 silicon is still early. Startups building on CXL may face hardware availability constraints.
3. **Geographic concentration:** Many top researchers are in Asia (SJTU, HKU, Zhejiang, ByteDance). Venture formation patterns differ.
4. **Open-source baseline:** PyTorch DCP (Distributed Checkpoint), MoonshotAI checkpoint-engine, and CRIU are strong open-source baselines. Startup must offer 10x improvement.
5. **NVIDIA lock-in:** NVIDIA's NCCL and NVLink ecosystem may make third-party memory tiering difficult to wedge into GPU clusters.

## Recommended Next Steps

1. **Deep-dive Kevin Song** (UofT) — highest-priority founder candidate. Check LinkedIn for post-graduation plans, any new repos, startup incorporation signals.
2. **Deep-dive Jinshu Liu** (Virginia Tech) — GitHub builder pattern, MSFT connection. Check if MoatLab/Melody has commercial traction.
3. **Intro via Ion Stoica** to Xuanlin Jiang (Harvard) — leverages existing network.
4. **Monitor Xingda Wei** (SJTU) PhoenixOS for enterprise adoption signals.
5. **Contact Radostin Stoyanov** (Oxford) — industry collaborations with NVIDIA/Google/Red Hat suggest commercial pull.
6. **Track Pekhimenko lab** broadly — 3 students on exact topic, proven spin-out history.

## Sources

- ASPLOS 2025 proceedings (Song et al. HybridTier, Liu et al. CXL characterization)
- MLSys 2025 proceedings (Jiang et al. NEO)
- SOSP 2025 proceedings (Wei et al. PhoenixOS)
- NSDI 2025 proceedings (Wan et al. ByteCheckpoint)
- FAST 2025 proceedings (Chen et al. IMPRESS)
- ISCA 2025 proceedings (Yi et al. ArtMem)
- [arXiv:2502.16631](https://arxiv.org/abs/2502.16631) — Stoyanov, CRIUgpu
- [arXiv:2512.24511](https://arxiv.org/abs/2512.24511) — Gossman et al., LLM Checkpoint I/O
- [arXiv:2405.12079](https://arxiv.org/abs/2405.12079) — Wei et al., PhoenixOS
- [arXiv:2509.03377](https://arxiv.org/html/2509.03377) — Xie et al., CXL KV cache
- [GitHub - MoatLab/Melody](https://github.com/MoatLab/Melody)
- [GitHub - SJTU-IPADS/PhoenixOS](https://github.com/SJTU-IPADS/PhoenixOS)
- [GitHub - MoonshotAI/checkpoint-engine](https://github.com/MoonshotAI/checkpoint-engine)
- [GitHub - checkpoint-restore/criu-coordinator](https://github.com/checkpoint-restore/criu-coordinator)
- [radostin.io](https://radostin.io/)
- [AWS Blog - SageMaker HyperPod Tiered Checkpointing](https://aws.amazon.com/blogs/machine-learning/accelerate-your-model-training-with-managed-tiered-checkpointing-on-amazon-sagemaker-hyperpod/)
- [Marvell/Celestial AI acquisition](https://financialcontent.com) (2026-01-22)
- [The Register - agentic AI memory hierarchies](https://www.theregister.com/) (2026-01-28)
