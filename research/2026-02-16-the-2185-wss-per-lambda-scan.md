# THE-2185 — Wavelength-Selective Switches for Per-Lambda Reconfigurable AI Training Topologies

**Date:** 2026-02-16
**Analyst:** Claude (Tigerclaw)
**Type:** Latent Founder Signal Scan
**Theme:** THE-2185 — Core DC, Optical Networking
**Shape Question:** Per-wavelength vs per-fiber granularity?

## Executive Summary

Scanned academic, builder, social, and media channels for latent founder signals in WSS / per-lambda switching for AI training fabrics. The space is extremely active — the OCS market is projected to exceed $2.5B by 2029 (Source: [Cignal AI](https://cignal.ai/2025/12/optical-circuit-switching-market-to-exceed-2-5b-in-2029/)). However, most latent founders have **already converted**: the pre-seed window for optical circuit switching startups has largely closed. Found 2 strong signals (both already funded), 5 WATCH-level researchers, and 12 disqualified/PASS signals.

**Key finding:** No unfunded "day -1" founders found for WSS specifically. The WSS sub-niche is dominated by InLC Technology (est. 2009, LCoS-based) and Lumentum (incumbent MEMS). Startups are building OCS broadly (MEMS, silicon photonics, piezo), not WSS-specific products. The market opportunity described in THE-2185 may be better approached as "which OCS architecture wins for per-lambda granularity" rather than "who is starting a WSS company."

## Found Signals (Already Funded)

### 1. Zhizhen Zhong — Netpreme (STRONG but funded)
- **Score:** 1 (weak — already funded penalty)
- **Background:** MIT CSAIL postdoc, ex-Meta (reconfigurable fiber-optics), PhD Tsinghua
- **Company:** Netpreme — "world's fastest memory-compute fabric using light for AI supercomputers"
- **Funding:** $11.7M (Jun 2025), Activate portfolio company
- **Key papers:** Lightning (reconfigurable photonic SmartNIC), TopoOpt, IOI
- **Links:** [LinkedIn](https://www.linkedin.com/in/zhizhenzhong/), [GitHub](https://github.com/zhizhenzhong), [Website](https://zhizhenzhong.com), [Activate](https://activate.org/netpreme)
- **Why relevant:** Directly building photonic-electronic infrastructure for AI memory-compute. Adjacent to per-lambda switching — if Netpreme adds wavelength-level reconfigurability to their fabric, they'd be the first to combine photonic compute + WSS switching in one product.
- **Action:** WATCH — track product roadmap, check if architecture supports per-lambda routing

### 2. James Raring — Lucidean (STRONG but funded)
- **Score:** 3 (weak — already funded penalty)
- **Background:** 20+ year photonics veteran, co-founded Kyocera SLD Laser, 300+ patents
- **Company:** Lucidean — CohZero™ coherent optical interconnect for AI DCs
- **Funding:** $18M seed (Dec 2025), led by Entrada Ventures + Koch Disruptive Technologies
- **Co-founders:** Dr. Hector Andrade, Dr. Aaron Maharry (Co-CTOs), Dr. Clint Schow, Dr. Larry Coldren (academic)
- **Source:** [The AI Insider](https://theaiinsider.tech/2025/12/26/lucidean-raises-seed-funding-for-next-gen-coherent-optical-links-for-data-centers/)
- **Why relevant:** Coherent optics intrinsically support per-wavelength multiplexing. CohZero architecture could enable per-lambda switching without traditional WSS hardware.
- **Action:** WATCH — very fresh (Dec 2025 seed). Track technical architecture details.

## WATCH Signals (Unfunded Researchers)

### 3. Vamsi Addanki — Purdue University (MEDIUM, score 4)
- **Background:** PhD TU Berlin, now Assistant Professor at Purdue (started Aug 2025)
- **Lab:** STyGIANet (Systems, Topology, Graphs, Internet, AI, Networks)
- **Key work:** Vermilion (traffic-aware reconfigurable optical interconnect with formal throughput guarantees), Mars (near-optimal throughput with shallow buffers), HotNets 2025 paper on adaptive photonic scale-up domains
- **Teaching:** CS59200: AI/DC Networking at Purdue (Fall 2025)
- **Links:** [Website](https://vamsiaddanki.net), [LinkedIn](https://www.linkedin.com/in/vamsi-addanki-9b342711a/), [Purdue](https://stygianet.cs.purdue.edu/)
- **Talk:** "Adaptive Protocols and Reconfigurable Optical Interconnects for Datacenter Networks" at IIT Hyderabad (Feb 2025)
- **Why relevant:** Deepest academic researcher on the exact problem — reconfigurable optical topologies for AI training. Vermilion eliminates multi-hop routing entirely. 4+ papers in 2025 on this topic.
- **Risk:** Just started faculty position — unlikely to found startup in near term. Academic publication pattern without builder signals (no GitHub repos, no startups).
- **Action:** WATCH — monitor for industry collaborations, PhD students who might spin out, or change in trajectory

### 4. Rachee Singh — Cornell University (MEDIUM)
- **Key work:** "Photonic Rails" concept — replacing electrical packet switches in rail topology with reconfigurable OCS for ML datacenters (Jul 2025)
- **Links:** [LinkedIn](https://www.linkedin.com/in/rachee-singh-66879996/), [Arxiv](https://arxiv.org/abs/2507.08119)
- **Why relevant:** Novel rail-optimized photonic fabric specifically designed for model parallelism in ML training. Faculty position but could inspire spinouts.
- **Action:** WATCH — monitor for Cornell spinout activity

### 5. Alex Forencich — UC San Diego (MEDIUM)
- **Background:** Postdoctoral researcher, co-author on Mordia (2013), RotorNet (2017), Realizing RotorNet (2024)
- **Group:** George Porter's group at UCSD
- **Why relevant:** Decade of OCS datacenter research. Postdoc status = potential inflection point (industry transition or startup).
- **Action:** WATCH — monitor for departure from academia

### 6. Xilin Feng — University of Pennsylvania (MEDIUM)
- **Key work:** Non-Hermitian silicon photonic switching achieving picosecond reconfiguration (Nature Photonics, Jan 2025)
- **Lab:** Liang Feng lab (track record of spinouts)
- **Source:** [ScienceDaily](https://www.sciencedaily.com/releases/2025/01/250107114302.htm)
- **Why relevant:** Breakthrough switching speed. Liang Feng lab has commercialization history. PhD student — monitor for graduation.
- **Action:** WATCH — monitor for PhD defense and potential spinout

### 7. Che-Yu Liu — UC Davis (WEAK-MEDIUM)
- **Key work:** Deep RL for optical DC networks, FPGA-based implementation, Ben Yoo lab
- **Why relevant:** Algorithmic/systems layer for OCS orchestration. FPGA implementation = builder signal.
- **Action:** WATCH — monitor for graduation

## Competitive Landscape (Already Funded / Established)

| Company | Tech | Funding | Status |
|---------|------|---------|--------|
| **Lumentum** | MEMS OCS (R300, R64) | Public (LITE) | Sampling with hyperscalers, GA H2 2025 |
| **iPronics** | Silicon photonics OCS (ONE-32) | €24.7M | First SiPh OCS shipped Mar 2025 |
| **Oriole Networks** | Full-photonic PRISM network | £22M Series A | UCL spinout, product launch 2025 |
| **nEye Systems** | Wafer-scale photonic switch | $72.5M | UC Berkeley, chip samples 2026 |
| **Netpreme** | Photonic-electronic AI fabric | $11.7M | MIT CSAIL spinout, founded 2024 |
| **Lucidean** | Coherent optical (CohZero) | $18M seed | UCSB team, Dec 2025 |
| **Lightmatter** | 3D photonic interconnects | $2.3B+ | Series D, Passage M1000 |
| **Celestial AI** | Photonic Fabric chip-to-chip | Acquired $3.25B | By Marvell, Dec 2025 |
| **InLC Technology** | LCoS WSS for ROADM/OCS | Private | Est. 2009, S. Korea |
| **Finchetto** | All-optical passive Ethernet | Early | UK, Surrey Research Park |
| **Enlightra** | Multiwavelength comb lasers | $15M | Switzerland, YC-backed |

## Market Context

- **OCS market:** $2.5B+ by 2029 (Source: [Cignal AI 4Q25](https://cignal.ai/2025/12/the-optical-circuit-switching-market-4q25/))
- **WSS+OCS market:** $1.96B by 2032, 12% CAGR (Source: [VMR](https://www.verifiedmarketresearch.com/product/wavelength-selective-switch-wss-optical-circuit-switching-ocs-market/))
- **Key trend:** Google's Apollo OCS deployment + hyperscaler adoption driving OCP OCS sub-project (founding: Google, Microsoft, NVIDIA, Lumentum, Coherent)
- **Edgecore OWS:** 25.6T Optical Wavelength Switch showcased at MWC 2026 — 150W, minimal latency (Source: [Edgecore](https://www.edge-core.com/event/join-edgecore-mwc-2026/))
- **InfiniteHBD:** SIGCOMM 2025 paper shows OCS transceivers for LLM training achieve 3.37x MFU improvement vs NVIDIA DGX (Source: [Arxiv](https://arxiv.org/abs/2502.03885))

## Shape Work Answer

**Per-wavelength vs per-fiber granularity?**

The market is bifurcating:
- **Per-fiber (OCS):** Dominant approach. MEMS-based (Lumentum, Telescent) and silicon photonics (iPronics, nEye). Simpler, proven, scaling to 300+ ports. Google Apollo uses this at scale.
- **Per-wavelength (WSS):** Niche but growing. InLC Technology (LCoS WSS), Lumentum (TrueFlex WSS for C+L band). Primarily telecom ROADM today but being repurposed for DC. Edgecore OWS is a new entrant.
- **Hybrid:** Cignal AI notes "the intersection of DWDM and OCS" where WSS enables wavelength-level routing within OCS-switched links. This is exactly THE-2185's thesis.

The opportunity may be in the **control plane** — software that orchestrates per-lambda reconfiguration across OCS fabrics for specific collective communication patterns in AI training. Vamsi Addanki's Vermilion work and Rachee Singh's Photonic Rails concept both point to this as the value layer.

## Risks & Open Questions

- Most latent founders have already converted — the pre-seed window for general OCS is closing
- WSS-specific startups are scarce; the market is solving this with OCS + DWDM combinations
- China-based researchers dominate recent publications but US VC access is limited
- Per-lambda granularity may be a feature of existing OCS products rather than a standalone company
- Control plane / orchestration layer may be the real startup opportunity (software, not hardware)

## Sources

- [Cignal AI Startup Tracker](https://cignal.ai/2025/11/optical-component-startup-tracker/)
- [Cignal AI OCS Market 4Q25](https://cignal.ai/2025/12/the-optical-circuit-switching-market-4q25/)
- [Vermilion Paper](https://arxiv.org/abs/2504.09892)
- [InfiniteHBD Paper](https://arxiv.org/abs/2502.03885)
- [Photonic Rails Paper](https://arxiv.org/abs/2507.08119)
- [Netpreme/Activate](https://activate.org/netpreme)
- [Lucidean Seed](https://theaiinsider.tech/2025/12/26/lucidean-raises-seed-funding-for-next-gen-coherent-optical-links-for-data-centers/)
- [InLC Technology WSS](https://www.inlct.com/wss/)
- [iPronics ONE-32 Launch](https://ipronics.com/ipronics-unveils-worlds-first-silicon-photonics-optical-circuit-switch-for-ai-driven-data-centers-optical-network-transformation/)
- [Oriole Networks PRISM](https://oriolenetworks.com)
- [nEye Systems $72.5M](https://www.businesswire.com/news/home/20250410752076/en/nEye-Systems-Secures-72-5-Million)
- [Edgecore OWS at MWC 2026](https://www.edge-core.com/event/join-edgecore-mwc-2026/)
- [Vamsi Addanki/Purdue](https://stygianet.cs.purdue.edu/)
