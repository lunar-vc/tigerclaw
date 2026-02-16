# THE-2284 — CXL Near-Data Processing for Inference Memory Expansion: Signal Scan

**Date:** 2026-02-16
**Analyst:** Claude (Tigerclaw)
**Type:** Latent Founder Signal Scan
**Theme:** THE-2284 (Adjacent: THE-2171 ∩ THE-2191)

## Executive Summary

Scanned semiconductors and infra domains for latent founder signals in CXL near-data processing for inference memory expansion. The automated parallel scan produced 273 raw signals but none CXL-specific (generic domain queries miss niche topics). Targeted searches across builder, academic, and social channels surfaced **1 REACH_OUT** and **1 WATCH** candidate, plus comprehensive landscape mapping.

**Market timing signal:** AI memory crisis is acute (Bloomberg Feb 2026: DRAM prices surged 75% Dec→Jan). CXL market projected $14M (2025) → $16B (2028). Two major CXL startup acquisitions validate the space: XConn→Marvell ($540M, Jan 2026), Enfabrica→NVIDIA ($900M+, Sept 2025).

## Key Findings

### REACH_OUT: Yufeng Gu (Score: 13/STRONG)

- **Who:** PhD candidate, University of Michigan, advised by Prof. Reetuparna Das
- **What:** Lead author of "PIM Is All You Need: A CXL-Enabled GPU-Free System for LLM Inference" (ASPLOS 2025)
- **Signal:** Published at top venue (ASPLOS), active GitHub repo (CENT), CXL-PIM architecture eliminates GPU dependency for LLM inference
- **Thesis fit:** DIRECT — proposes CXL-enabled processing-in-memory that replaces GPU for inference, exactly at the intersection of near-data processing + inference memory
- **Scoring breakdown:** PhD defense(+3), new GitHub repo(+2), top venue(+2), venture-scale(+2), converging(+2), OSS traction(+1), recent(+1) = 13
- **GitHub:** https://github.com/Yufeng98/CENT
- **Personal:** https://web.eecs.umich.edu/~yufenggu/
- **Paper:** https://arxiv.org/abs/2502.07578
- **Why interesting:** GPU-free LLM inference via CXL-PIM is a contrarian bet that could disrupt the NVIDIA-centric inference stack. If the approach scales, it addresses the memory wall AND the GPU shortage simultaneously. The CENT repo shows builder signal beyond pure academia.
- **Source:** Arxiv, ASPLOS 2025 proceedings, GitHub

### WATCH: Ipoom Jeong (Score: 5/MEDIUM)

- **Who:** PhD student/researcher at UIUC (Nam Sung Kim group), previously at Samsung working on CXL Type-2 accelerator (2020)
- **What:** Deep CXL system-level expertise across Type-2 devices, smart storage, and cooperative computing
- **Signal:** Ex-Samsung CXL team → academic (reverse direction but shows industry-to-research-to-industry potential), multiple top-venue papers (MICRO 2024, ISCA 2025)
- **Thesis fit:** Adjacent — CXL Type-2 heterogeneous computing is the enabling layer for near-data processing
- **Scoring breakdown:** left_faang(+3), top venue(+2), converging(+2), academic_only(-2) = 5
- **Personal:** https://ipoom-jeong.com/
- **Papers:** MICRO 2024 "Demystifying a CXL Type-2 Device", ISCA 2025 "UPP: Universal Predicate Pushdown to Smart Storage"
- **Why interesting:** Samsung CXL experience + top-venue academic publications. If he finishes PhD and returns to industry, likely a founding-team caliber CXL architect. Monitor for departure signals.
- **Source:** DBLP, personal website, MICRO/ISCA proceedings

### PASS (Academic Only, No Builder Signal)

| Name | Affiliation | Paper | Score | Reason |
|------|-------------|-------|-------|--------|
| Xinjun Yang | Unknown | Beluga: CXL KVCache (arxiv 2511.20172) | 0 | Academic only |
| Khyati Kiyawat | UVA (Skadron group) | Sangam: DRAM-PIM + CXL (arxiv 2511.12286) | 0 | Academic only |
| Pingyi Huo | Penn State (Narayanan group) | TPNM: CXL tiered PNM (May 2025) | -2 | Academic only + stale |
| Haoyang Zhang | UIUC (Jian Huang group) | SkyByte: CXL-SSD (HPCA 2025) | 0 | Academic only, adjacent |

### PASS (Already Funded)

| Company | Funding | Focus | Status |
|---------|---------|-------|--------|
| XConn Technologies | Acquired by Marvell ($540M, Jan 2026) | CXL switch IC | Exited |
| Enfabrica | Acquired by NVIDIA ($900M+, Sept 2025) | Server fabric | Exited |
| UnifabriX (Israel) | $11M seed | CXL Smart Memory Fabric | Active — $20B TAM by 2030 |
| MemVerge | Undisclosed | Big Memory software, CXL pooling | Active |
| Liqid | Undisclosed | CXL memory expansion systems | Active |
| Panmnesia (Korea) | Undisclosed | CXL switch, Yongjin (PhD, ex-Samsung/AWS/Moloco) | Active |
| Astera Labs | Public (ALAB) | Leo CXL Smart Memory Controllers | Public |

## Landscape: CXL Near-Data Processing for LLM Inference

### Research Activity (High)

The CXL+inference intersection is extremely active in top architecture venues:

| Paper | Venue | Key Idea |
|-------|-------|----------|
| PIM Is All You Need (Yufeng Gu et al.) | ASPLOS 2025 | GPU-free LLM inference via CXL-enabled PIM |
| CXL-NDP (arxiv 2509.03377) | Preprint | Transparent near-data processing amplifying CXL bandwidth |
| Scalable PNM for 1M-Token (arxiv 2511.00321) | Preprint | Processing-near-memory for long-context KV-cache beyond GPU limits |
| Beluga (Xinjun Yang et al., arxiv 2511.20172) | Preprint | CXL memory architecture for LLM KVCache management |
| TraCT (arxiv 2512.18194) | Preprint | Rack-scale disaggregated LLM serving with CXL shared memory |
| Sangam (Khyati Kiyawat et al., arxiv 2511.12286) | Preprint | Chiplet DRAM-PIM accelerator with CXL for LLM inference |
| TPNM (Pingyi Huo et al.) | ResearchGate May 2025 | General-purpose tiered process-near-memory via CXL |
| SkyByte (Haoyang Zhang et al.) | HPCA 2025 | Memory-semantic CXL-based SSD architecture |

### Key Research Labs

1. **University of Michigan** — Reetuparna Das group (Yufeng Gu, Alireza Khadem). ASPLOS 2025.
2. **UIUC — Nam Sung Kim group** — Ipoom Jeong, Hyungyo Kim, Michael Jaemin Kim. MICRO 2024, ISCA 2025, HPCA 2025.
3. **UIUC — Jian Huang group** — Haoyang Zhang, Yuqi Xue. HPCA 2025.
4. **Penn State — Vijaykrishnan Narayanan group** — Pingyi Huo, Hasan Al Maruf. CXL PNM.
5. **University of Virginia — Kevin Skadron group** — Khyati Kiyawat. Chiplet DRAM-PIM.
6. **Samsung Electronics** — Jinin So (Sr. Director). World's first CXL PNM Platform (CMM-DC).
7. **ETH Zurich SAFARI Group** — Onur Mutlu. Collaboration with Yufeng Gu.

### Market Validation

- **CXL market size:** $14M (2025) → $16B (2028) — 1000x growth projected ([Source](https://www.chosun.com/english/industry-en/2025/05/12/5JEF3PSPYBCGVAKOJOR7RCECXU/))
- **CXL 4.0 spec** released Nov 2025: 128 GT/s, port bundling ([Source](https://www.businesswire.com/news/home/20251118275848/en/))
- **XConn → Marvell ($540M, Jan 2026)**: CXL switch IC startup acquired ([Source](https://www.servethehome.com/marvell-announces-xconn-technologies-acquisition-in-cxl-and-pcie-push/))
- **Enfabrica → NVIDIA ($900M+, Sept 2025)**: Server fabric startup acquired ([Source](https://blocksandfiles.com/2025/09/19/nvidia-buys-enfabrica/))
- **DRAM crisis:** Prices surged 75% Dec→Jan 2026, global memory shortage ([Source](https://fortune.com/2026/02/15/ai-demand-memory-chip-shortage-crisis-dram-hbm-micron-skhynix-samsung))
- **SK Hynix Niagara 2.0:** Distributed LLM inference via CXL pooled memory ([Source](https://news.skhynix.com/sk-hynix-redefines-its-vision-at-sk-ai-summit-2025-from-ai-memory-provider-to-creator/))
- **Astera Labs ALAB:** Strong Q4 2025 earnings on CXL demand ([Source](https://futurumgroup.com/insights/astera-labs-q4-2025-earnings-diversified-ai-connectivity-momentum/))

### Open-Source / GitHub Activity

| Repository | Author | Description |
|-----------|--------|-------------|
| [CENT](https://github.com/Yufeng98/CENT) | Yufeng Gu (UMich) | CXL-PIM system for GPU-free LLM inference |
| [CXL-DMSim](https://github.com/ferry-hhh/CXL-DMSim) | Research group | Full-system CXL disaggregated memory simulator |
| [CXLPapers](https://github.com/Compute-Express-Link/CXLPapers) | Community | CXL research paper collection |
| [awesome-disaggregated-memory](https://github.com/dmemsys/awesome-disaggregated-memory) | dmemsys | Resource list for memory disaggregation |

## Risks & Open Questions

- **Yufeng Gu:** Is he a PhD candidate or postdoc? What's his defense timeline? Does he have venture intent or is he heading to industry (Samsung/Intel/Astera)? Need LinkedIn check.
- **Ipoom Jeong:** Samsung → UIUC is unusual direction. Is he doing a PhD or visiting researcher? When does he return to industry?
- **Market timing risk:** CXL adoption is still early. Type-3 memory expansion is shipping (Astera Labs in Azure), but Type-2 NDP devices are 1-2 years away from commercial deployment.
- **Incumbent risk:** Samsung's CMM-DC (CXL PNM Platform) and SK Hynix's Niagara 2.0 may capture the NDP market before startups can scale.
- **GPU ecosystem lock-in:** NVIDIA's CUDA moat makes GPU-free inference a hard sell even if technically superior.

## Sources

- [PIM Is All You Need (ASPLOS 2025)](https://arxiv.org/abs/2502.07578)
- [Yufeng Gu personal page](https://web.eecs.umich.edu/~yufenggu/)
- [CENT GitHub](https://github.com/Yufeng98/CENT)
- [Ipoom Jeong personal page](https://ipoom-jeong.com/)
- [CXL-NDP paper](https://arxiv.org/abs/2509.03377)
- [Scalable PNM paper](https://arxiv.org/abs/2511.00321)
- [Beluga paper](https://arxiv.org/abs/2511.20172)
- [TraCT paper](https://arxiv.org/abs/2512.18194)
- [Sangam paper](https://arxiv.org/abs/2511.12286)
- [TPNM paper](https://www.researchgate.net/publication/394327481)
- [Marvell acquires XConn](https://www.servethehome.com/marvell-announces-xconn-technologies-acquisition-in-cxl-and-pcie-push/)
- [DRAM shortage Bloomberg](https://fortune.com/2026/02/15/ai-demand-memory-chip-shortage-crisis-dram-hbm-micron-skhynix-samsung)
- [CXL market size](https://www.chosun.com/english/industry-en/2025/05/12/5JEF3PSPYBCGVAKOJOR7RCECXU/)
- [UnifabriX](https://blocksandfiles.com/2025/01/15/unifabrix-taking-cxl-external-memory-mainstream/)
- [CXL DevCon 2025](https://computeexpresslink.org/cxl-devcon-2025/)
- [SK Hynix AI Summit 2025](https://news.skhynix.com/sk-hynix-redefines-its-vision-at-sk-ai-summit-2025-from-ai-memory-provider-to-creator/)
