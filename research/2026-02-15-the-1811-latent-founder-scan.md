# THE-1811: Non-Float CPU Neural Net — Latent Founder Scan

**Date:** 2026-02-15
**Analyst:** Claude (Tigerclaw)
**Type:** Latent Founder Signal Scan
**Theme:** THE-1811 — HN: Non-float CPU neural net, novel compute approach

## Executive Summary

Scanned four adjacent primitives — integer/fixed-point NN inference, formally verified ML, uncertainty-aware ML, and CPU-optimized inference — to find latent founders for THE-1811. The HN post author (Konrad Wojnowski, Jagiellonian University) was disqualified as an academic philosopher with no venture intent. Identified **10 WATCH candidates** across academia and research labs, with the strongest latent signals in quantized integer inference (Jintao Zhang, Guangxuan Xiao) and neural network verification (Avraham Raviv, Zhouxing Shi). Several already-funded companies were mapped and disqualified (Fractile £100M, Neurophos $110M, d-Matrix $275M, Harmonic AI $1.45B, LMArena $1.7B). No REACH_OUT-strength signals were found — all candidates remain in academia with medium-strength watch signals.

## Theme Context

THE-1811 originates from HN post #46852043 describing a CPU-based neural network that:
- Uses **integer ratios** instead of IEEE 754 floating-point numbers
- Has **44 Coq proof files** formally verifying the math
- Supports explicit **"I don't know" uncertainty** (epistemic refusal)
- Runs in ~500 lines of Rust, CPU-only
- Source: [probabilistic-minds-consortium/void-mathematics-fully-finite-coq-verified](https://github.com/probabilistic-minds-consortium/void-mathematics-fully-finite-coq-verified)

## HN Author Investigation

**Konrad Wojnowski** (`kwojno` on HN) — Assistant Professor, Jagiellonian University, Kraków, Poland. Research focus is philosophy of mathematics and "void mathematics." The GitHub org (probabilistic-minds-consortium) has 3 repos, 2 stars. His blog (voids6.wordpress.com) frames this as a philosophical project. He has disclosed he is a cancer patient. **Disqualified:** academic-only, no venture intent, no builder signals.

## Search Methodology

Ran 5 parallel search agents across:
1. **Integer/fixed-point NN inference** — researchers building non-float compute for neural networks
2. **Formally verified ML** — Coq/Lean4/Isabelle provers applied to neural network correctness
3. **Uncertainty-aware ML** — conformal prediction, epistemic uncertainty quantification
4. **CPU inference optimization** — non-GPU inference engines and hardware
5. **HN author background** — deep dive on kwojno/Konrad Wojnowski

Additionally ran the `latent-founder-signals` script for AI domain with GitHub signal type. Cross-referenced all signals with LinkedIn, GitHub, and publication records.

## WATCH Candidates (Ranked by Score)

### 1. Jintao Zhang — Score: 6 (Medium)
- **Affiliation:** Tsinghua University
- **Work:** SageAttention — INT4/INT8 quantized attention kernels. Published at ICLR 2025 and ICML 2025.
- **Thesis fit:** Direct — integer arithmetic for inference, exactly the non-float compute primitive
- **Signals:** New repo with active commits (+2), conference talks at top venues (+2), venture-scale problem (+2), multiple converging signals (+2) = 8, but adjusted to 6 based on no departure signal
- **Why watch:** Dual top-venue publications in 2025 on quantized inference. If he graduates or takes industry position, high probability of founding or joining an inference startup.
- **Risk:** Still at Tsinghua, no departure signal yet

### 2. Avraham Raviv — Score: 5 (Medium)
- **Affiliation:** Bar-Ilan University PhD candidate + Samsung R&D (Israel)
- **Work:** Neural network verification algorithms, formal methods for NN correctness
- **Thesis fit:** Direct — formal verification of neural networks
- **Signals:** PhD defense approaching (+3), venture-scale problem (+2) = 5
- **Why watch:** Bridges academia (verification theory) and industry (Samsung R&D). PhD completion could trigger startup formation. Israel has strong deep-tech ecosystem.
- **Risk:** May stay in corporate R&D at Samsung

### 3. Isaac Gibbs — Score: 5 (Medium)
- **Affiliation:** Stanford PhD 2024 → UC Berkeley postdoc
- **Work:** Conformal prediction with conditional guarantees — uncertainty quantification for ML
- **Thesis fit:** Adjacent — uncertainty handling aligns with "I don't know" capability
- **Signals:** Recent PhD defense (+3), venture-scale problem (+2) = 5
- **Why watch:** Fresh PhD from Stanford, now at Berkeley. Conformal prediction is gaining adoption in production ML. Early-career transition point.
- **Risk:** Academic postdoc suggests staying in research near-term

### 4. Guangxuan Xiao — Score: 4 (Medium)
- **Affiliation:** MIT HAN Lab (PhD student)
- **Work:** SmoothQuant (INT8 quantization for LLMs), TinyChat (efficient inference engine)
- **Thesis fit:** Direct — integer quantization for inference
- **Signals:** Active repo (+2), venture-scale problem (+2) = 4
- **Why watch:** SmoothQuant is widely adopted (integrated into NVIDIA TensorRT-LLM, Hugging Face). MIT HAN Lab is a top inference optimization group. PhD completion would be a strong inflection point.
- **Risk:** Still in PhD, no departure signal. High likelihood of acquisition offers vs. founding.

### 5. Zhouxing Shi — Score: 4 (Medium)
- **Affiliation:** UC Riverside (new assistant professor, previously UCLA PhD)
- **Work:** Neural network verification — 4x VNN-COMP winner, auto_LiRPA library
- **Thesis fit:** Direct — formal verification of neural networks
- **Signals:** Active repos (+2), venture-scale problem (+2) = 4
- **Why watch:** Just started as new assistant professor — early career inflection. VNN-COMP dominance shows verification tooling expertise. Could spin out verification tooling.
- **Risk:** Just took academic position, less likely to leave soon

### 6. Jianguo Huang — Score: 4 (Medium)
- **Affiliation:** NTU Singapore (previously ShanghaiTech MS)
- **Work:** TorchCP — conformal prediction library for PyTorch
- **Thesis fit:** Adjacent — uncertainty quantification
- **Signals:** Active open-source repo (+2), OSS traction (+1), venture-scale problem (+2) = 5, adjusted 4
- **Why watch:** TorchCP gaining adoption as the go-to conformal prediction toolkit. Library creators often spin out companies.

### 7. Tianhao Wei — Score: 4 (Medium)
- **Affiliation:** CMU Robotics Institute
- **Work:** ModelVerification.jl — Julia framework for neural network verification
- **Thesis fit:** Direct — formal verification of neural networks
- **Signals:** Active repo (+2), venture-scale problem (+2) = 4
- **Why watch:** CMU pedigree, building verification tooling. Julia ecosystem has strong scientific computing community.

### 8–10. Additional WATCH (Lower Priority)

- **Huan Zhang** — UIUC Assistant Professor, alpha-beta-CROWN (5x VNN-COMP winner). Established academic, unlikely founder but key reference in verification space.
- **Wenting Li** — NN verification researcher, convex reformulation for LLMs. Early signal, needs more data.
- **Mohsen Dehghankar** — UIC PhD, binary/ternary NN matrix multiplication algorithms. Fits integer compute primitive but deep in academia.

## Already-Funded Companies (Disqualified — Market Reference)

| Company | Stage | Raised | Relevance |
|---------|-------|--------|-----------|
| Fractile | Growth | £100M | UK — AI inference chip, non-traditional compute |
| Neurophos | Growth | $110M | Optical metasurface processors for inference |
| d-Matrix | Series C | $275M | Digital in-memory compute for inference |
| Eigen AI | Launched | Unknown | MIT PhD 2024 — efficient AI inference |
| Harmonic AI | Series C | $120M ($1.45B val) | Lean4 formal verification for AI |
| LMArena (Angelopoulos) | Series A | $150M ($1.7B val) | ML evaluation platform |
| AheadComputing | Series B | $51.5M | CPU inference optimization |

## Additional Watched (Lower Signal)

- **Guy Katz** — Hebrew University, Marabou NN verification framework (7,262 citations). Senior academic, reference node.
- **Hillel Kugler** — Bar-Ilan, formal verification & synthesis lab. Reference node.
- **Valeriy Manokhin** — Awesome Conformal Prediction curator (3,300+ stars). Independent researcher.
- **Donlapark Ponnoprat** — Chiang Mai University, CoverForest (2025 release). Niche tool.

## Key Observations

1. **No REACH_OUT signals found.** All candidates are firmly in academia with no departure signals. This is a "watching" domain, not an action domain right now.

2. **The integer inference space is consolidating around quantization.** SmoothQuant (Xiao) and SageAttention (Zhang) represent the mainstream approach — INT8/INT4 quantization of float models. The HN approach (pure integer ratios from scratch) is more radical and has no commercial traction.

3. **NN verification is pre-commercial.** Despite strong academic activity (VNN-COMP, Marabou, alpha-beta-CROWN), no verification-first startups have emerged at seed stage. Harmonic AI ($1.45B) is the closest but focuses on Lean4 proof generation, not NN verification specifically.

4. **Conformal prediction is gaining library traction** (TorchCP, MAPIE, CoverForest) but remains an academic tooling play. No venture-backed conformal prediction company exists yet.

5. **Best re-scan trigger:** Watch for PhD defenses (Jintao Zhang at Tsinghua, Guangxuan Xiao at MIT) and any departure signals from Samsung (Raviv) or academic positions (Shi).

## Risks & Open Questions

- **Jintao Zhang:** Is he graduating soon? Check Tsinghua PhD timeline.
- **Avraham Raviv:** When is his PhD defense? Check Bar-Ilan thesis status.
- **Guangxuan Xiao:** When does he defend? MIT HAN Lab PhD timeline.
- **Zhouxing Shi:** Just took UC Riverside position — monitor for industry interest.
- **Isaac Gibbs:** Postdoc duration? Typical 1-2 years, so watch for 2025-2026 transition.

## Sources

- [HN Post #46852043](https://news.ycombinator.com/item?id=46852043)
- [void-mathematics GitHub repo](https://github.com/probabilistic-minds-consortium/void-mathematics-fully-finite-coq-verified)
- [SageAttention — Jintao Zhang](https://github.com/thu-ml/SageAttention)
- [SmoothQuant — Guangxuan Xiao](https://github.com/mit-han-lab/smoothquant)
- [TorchCP — Jianguo Huang](https://github.com/ml-stat-Sustech/TorchCP)
- [alpha-beta-CROWN — Huan Zhang](https://github.com/Verified-Intelligence/alpha-beta-CROWN)
- [auto_LiRPA — Zhouxing Shi](https://github.com/Verified-Intelligence/auto_LiRPA)
- [ModelVerification.jl — Tianhao Wei](https://github.com/intelligent-control-lab/ModelVerification.jl)
- [Marabou — Guy Katz](https://github.com/NeuralNetworkVerification/Marabou)
- [Fractile funding — The Register](https://www.theregister.com/2025/01/16/fractile_100m_ai_chip/)
- [Harmonic AI Series C](https://www.harmonic.ai)
- [LMArena Series A](https://lmarena.ai)
