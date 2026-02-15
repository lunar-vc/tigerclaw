# Latent Founder Scan: SONiC-Based AI Fabric Automation for Neocloud Operators

**Date:** 2026-02-06
**Analyst:** Claude (Tigerclaw)
**Type:** Signal Scan + Market Map
**Thesis Domain:** Networks / AI Infra
**Primitive:** SONiC-native autonomous fabric control for GPU cloud operators

## Executive Summary

The neocloud segment (CoreWeave, Lambda, Crusoe, Nebius, Vultr, etc.) is growing explosively, yet every operator faces the same networking bottleneck: deploying and operating high-performance Ethernet fabrics at GPU-cluster scale. SONiC has emerged as the de facto open NOS for AI datacenters, but the **automation, orchestration, and AI-driven optimization layer** on top of SONiC remains fragmented across early-stage startups, legacy vendors pivoting, and incomplete open-source tooling.

This scan identified **11 companies and founders** operating in this space, ranging from pre-seed to growth stage, plus **key latent founder profiles** — individuals at inflection points who could start the breakout company in this category.

NVIDIA's quiet acquisition of Augtera Networks (SONiC AIOps) validates the thesis that the intelligent fabric layer is strategically critical.

## Market Context

- **SONiC adoption:** Now default NOS at Microsoft Azure, adopted by Alibaba, LinkedIn, Tencent. Nokia, Cisco, Dell, Arista all shipping SONiC support. SONiC Foundation moved to Linux Foundation. ([Source](https://ubuntu.com/blog/sonic-the-open-source-network-operating-system-for-modern-data-centers))
- **AI fabric TAM:** $30B in AI scale-out switches projected by 2029, ~100% CAGR. ([Source](https://packetpushers.net/blog/startup-radar-aria-networks-sings-of-telemetry-to-sell-ethernet-switches-to-neoclouds/))
- **Neocloud growth:** CoreWeave ~1% global cloud share and growing; Lambda, Nebius, Crusoe "growing extremely rapidly" per Synergy Research. ([Source](https://www.fierce-network.com/cloud/neocloud-lambdas-vision-future-one-gpu-one-person))
- **The gap:** Neoclouds need turnkey SONiC fabric automation (Day 0 → Day N) but current options are either vendor-locked (Arista, Juniper), enterprise-oriented (Dell SONiC + BE Networks), or early/incomplete. No dominant SONiC-native fabric controller exists for the neocloud persona specifically.

## Signal Map

### Tier 1 — Strong Signals (Early-Stage, Directly on Thesis)

#### 1. Aria Networks — Mansour Karam (CEO) + Subhachandra Chandra (CTO)

| Field | Detail |
|-------|--------|
| **Signal** | Serial founder (Apstra → acquired by Juniper 2020) launching directly into SONiC AI fabric for neoclouds |
| **Founded** | October 2024 |
| **Funding** | Backed by Sutter Hill Ventures (amount undisclosed) |
| **Product** | Ethernet switches (Broadcom Tomahawk 5) + modified SONiC + microsecond telemetry + AI-driven path optimization. UEC 1.0 compliant. Currently shipping. |
| **Approach** | "Networks that Think" — probabilistic AI at millisecond resolution vs. traditional deterministic automation. 100-10,000x improvement in telemetry granularity. |
| **Target** | Neoclouds of all scales, from dozens of GPUs to 100,000+ |
| **Team** | Karam: Arista (2006, early stage), Big Switch Networks (SDN wave), Apstra (founder). Chandra: ex-Director of Software Engineering at Arista. |
| **Thesis fit** | **Direct** — SONiC-based, AI-driven, neocloud-focused |
| **Signal strength** | **Strong** — serial founder with exits, top-tier VC, shipping product |
| **Action** | **REACH_OUT** — this is the category leader candidate |

Sources: [Packet Pushers](https://packetpushers.net/blog/startup-radar-aria-networks-sings-of-telemetry-to-sell-ethernet-switches-to-neoclouds/), [Network World](https://www.networkworld.com/article/4095220/apstra-founder-launches-aria-to-tackle-ai-networking-performance.html), [Aria Blog](https://www.arianetworks.com/blog/networks-that-think)

---

#### 2. Hedgehog — Marc Austin (CEO/Founder)

| Field | Detail |
|-------|--------|
| **Signal** | SONiC simplification for AI cloud builders, open-source approach |
| **Founded** | ~2023 |
| **Funding** | $4-7M pre-seed/seed (sources vary: Tracxn $3.78M, Startup Seeker $7M+) |
| **Product** | Open-source software to deploy cloud-native AI workloads on edge/distributed infrastructure with SONiC networking. "Hedgehog AI Network" — install, boot, configure secure cloud network in minutes. |
| **Target** | AI cloud builders, neocloud operators, on-prem AI. Customer: Zipline (cut AI infra costs). |
| **Team** | Austin: Wharton MBA, ex-Dell (likely networking). Presented at NFD35, ONUG, eMerge Americas, simplyblock podcast. |
| **Thesis fit** | **Direct** — SONiC-native, AI fabric, cloud-native networking |
| **Signal strength** | **Strong** — shipping product, real customers, neocloud-adjacent |
| **Action** | **REACH_OUT** — early enough to be a compelling seed/A opportunity |

Sources: [Hedgehog](https://hedgehog.cloud/), [ONUG](https://onug.net/members/marc-austin/), [Tracxn](https://tracxn.com/d/companies/hedgehog/__-3IOvBw4n-eyOQhSplOwHQAc0xQEKi4ddW_r3iipnO0), [simplyblock](https://www.simplyblock.io/blog/network-infrastructure-for-ai-marc-austin/)

---

#### 3. BE Networks — Amir Elbaz (CEO/Founder)

| Field | Detail |
|-------|--------|
| **Signal** | Intent-based SONiC orchestration, "hyperautomation" for AI fabric |
| **Product** | Verity IBN platform — Day 0 to Day N automation for SONiC. Design, deploy, operate multi-vendor SONiC fabrics. GenAI design guides. |
| **Partners** | Dell (AI Fabrics integration), Edgecore, STORDIS, Micas. Recently released Verity 6.3 with AI/HPC workload support. |
| **Target** | Enterprises, neoclouds, AI/HPC operators running SONiC |
| **Thesis fit** | **Direct** — SONiC fabric orchestration with AI fabric support |
| **Signal strength** | **Medium** — established product, strong partnerships, but unclear on funding/stage |
| **Action** | **WATCH** — monitor for funding round or neocloud traction signals |

Sources: [PR Newswire](https://www.prnewswire.com/news-releases/be-networks-releases-verity-6-3--the-industry-leading-data-center-hyperautomation-platform-for-sonic-enabled-ethernet-switches-302264077.html), [Dell InfoHub](https://infohub.delltechnologies.com/fr-fr/l/dell-technologies-ai-fabrics-overview-1/ai-infrastructure-orchestration-and-monitoring-1/3/), [Edgecore](https://www.edge-core.com/sonic/be-networks/)

---

### Tier 2 — Adjacent Signals (Later Stage or Tangential)

#### 4. Aviz Networks — Vishal Shukla (Co-Founder/CEO)

| Field | Detail |
|-------|--------|
| **Signal** | SONiC pioneer, enterprise SONiC distribution, GenAI networking, $17M Series A |
| **Funding** | $17M led by Alter, with Qualcomm Ventures and Celestica |
| **Product** | Enterprise-grade community SONiC distribution + Network Copilot (GenAI) + Fabric Test Automation + OCP Experience Center (ONE Center) |
| **Partners** | Marvell, UfiSpace, Edgecore |
| **Thesis fit** | **Adjacent** — SONiC leader but more enterprise than neocloud-focused |
| **Signal strength** | **Medium** — funded and growing, but not neocloud-specific |
| **Action** | **WATCH** — track if they pivot explicitly toward neocloud operators |

Sources: [Network World](https://www.networkworld.com/article/3610296/sonic-pioneer-aviz-networks-raises-17m-for-ai-network-management-push.html), [SDxCentral](https://www.sdxcentral.com/news/aviz-networks-open-sources-networking-with-sonic-push/)

---

#### 5. DriveNets — Ido Susan (CEO/Founder)

| Field | Detail |
|-------|--------|
| **Signal** | Network Cloud-AI fabric deployed at neoclouds (WhiteFiber), multi-site GPU cluster support |
| **Funding** | Growth stage (Israel-based, well-funded from telco routing business) |
| **Product** | Ethernet-based AI fabric (Network Cloud-AI) for hyperscalers, neoclouds, enterprises. Multi-tenancy and multi-site cluster connectivity. |
| **Thesis fit** | **Adjacent** — Ethernet AI fabric for neoclouds but proprietary NOS (not SONiC-native) |
| **Signal strength** | **Medium** — real neocloud deployments but different architecture |
| **Action** | **WATCH** — competitive intelligence; validates neocloud fabric demand |

Sources: [Network World](https://www.networkworld.com/article/3992283/drivenets-extends-ai-networking-fabric-with-multi-site-capabilities-for-distributed-gpu-clusters.html), [PR Newswire](https://www.prnewswire.com/news-releases/whitefiber-deploys-drivenets-ethernet-based-ai-fabric-in-its-new-gpuaas-data-center-302460840.html)

---

#### 6. Arrcus — Shekar Ayyar (CEO), founded by Devesh Garg, Keyur Patel, Derek Yeung

| Field | Detail |
|-------|--------|
| **Signal** | ACE-AI networking fabric, disaggregated approach, partnerships with UfiSpace + Quanta |
| **Product** | Connected Edge-AI (ACE-AI) platform — integrates xPUs across DC, cloud, mobile. Uses merchant silicon (Broadcom TH5, Trident 4, Jericho 3-AI). |
| **Expansion** | India operations, partnerships with QCT for AI-optimized rack solutions |
| **Thesis fit** | **Adjacent** — AI fabric but SONiC-adjacent, own ArcOS |
| **Signal strength** | **Medium** |
| **Action** | **WATCH** — competitive intelligence |

Sources: [BusinessWire](https://www.businesswire.com/news/home/20250520289954/en/Arrcus-and-UfiSpace-Expand-Strategic-Partnership-to-Advance-Open-Infrastructure-for-AI-and-Cloud), [ET Telecom](https://telecom.economictimes.indiatimes.com/news/enterprise-services/arrcus-launches-in-india-targeting-ai-and-data-center-market-growth/125014567)

---

#### 7. Dorado Software — Stefan Bokaie (CTO)

| Field | Detail |
|-------|--------|
| **Signal** | Ex-Dell VP Networking who **spearheaded introduction of SONiC at Dell** in partnership with Microsoft and Broadcom. Now CTO of Dorado building SONiC fabric orchestration. |
| **Product** | Cruz Fabric Controller — design, deploy, operate multi-tier SONiC network fabrics. Enterprise + cloud + telco. |
| **Conference activity** | Presenting "Agentic AI on SONiC: Building the Open AI Fabric" at ONUG. SONiC Workshop at OCP EMEA. |
| **Thesis fit** | **Adjacent** — SONiC fabric orchestration, but Bokaie is a **latent founder signal** if he leaves Dorado |
| **Signal strength** | **Medium** — deep SONiC pedigree, pivoting Dorado toward AI fabric |
| **Action** | **WATCH** — Stefan Bokaie personally. If he leaves Dorado to start something new, it would be a strong signal. |

Sources: [ONUG](https://onug.net/events/agentic-ai-on-sonic-building-the-open-ai-fabric/), [LinkedIn](https://www.linkedin.com/company/dorado-software), [Dorado](https://www.doradosoftware.com/)

---

### Tier 3 — Latent Founder Signals (Pre-Company / Inflection Points)

#### 8. Rahul Aggarwal — ex-Augtera Founder, now NVIDIA Sr. Director

| Field | Detail |
|-------|--------|
| **Signal** | Founded Augtera Networks (SONiC AIOps), **acquired by NVIDIA** (Dec 2024/early 2025). Now Sr. Director of System Software for AI at NVIDIA. |
| **Background** | Built the leading AI/ML-powered network operations platform specifically integrated with SONiC. Deep expertise in ECN/PFC observability for RoCEv2 (RDMA over Converged Ethernet). |
| **Why latent** | Acqui-hire founders at NVIDIA typically have 1-2 year lockups. If Aggarwal leaves NVIDIA circa 2026-2027, he has the exact expertise to build a next-gen SONiC AI fabric company. |
| **Thesis fit** | **Direct** — deepest SONiC AIOps expertise in the market |
| **Signal strength** | **Medium** — currently locked up at NVIDIA, but watch for departure |
| **Action** | **WATCH** — monitor LinkedIn for role change, set alert for 2026-2027 window |

Sources: [DCD](https://www.datacenterdynamics.com/en/news/nvidia-quietly-acquires-aiops-firm-augtera-networks/), [BusinessWire](https://www.businesswire.com/news/home/20210629005324/en/Augtera-Emerges-From-Stealth-With-13M-Series-A-Led-by-Intel-Capital)

---

#### 9. Stefan Bokaie — CTO Dorado, ex-Dell VP Networking

| Field | Detail |
|-------|--------|
| **Signal** | The person who brought SONiC to Dell, now building "Agentic AI on SONiC" at Dorado. Presenting at ONUG and OCP on AI fabric topics. |
| **Why latent** | Dorado is an established (older) company pivoting to AI fabric. If Bokaie decides the opportunity demands a fresh start, he would be the ideal founder for a SONiC-native AI fabric automation startup. |
| **Thesis fit** | **Direct** |
| **Signal strength** | **Weak-Medium** — no departure signal yet, but watch conference activity and LinkedIn |
| **Action** | **WATCH** — monitor for departure from Dorado |

Sources: [ONUG](https://onug.net/events/agentic-ai-on-sonic-building-the-open-ai-fabric/), [LinkedIn](https://www.linkedin.com/company/dorado-software)

---

#### 10. SONiC Foundation / Microsoft Azure Networking Alumni

| Field | Detail |
|-------|--------|
| **Signal** | Microsoft originally built SONiC for Azure. Engineers who built and scaled SONiC at Microsoft have the deepest expertise in the NOS itself. As SONiC moves to Linux Foundation and the ecosystem matures, some of these engineers may see the opportunity to commercialize their expertise for neoclouds. |
| **Key orgs** | Microsoft Azure Networking, Broadcom SONiC team, NVIDIA Networking (post-Mellanox) |
| **Why latent** | This is the talent pool from which the next SONiC-native startup founder will most likely emerge. No specific individual identified yet, but the inflection is clear: SONiC is now "the Linux of networking" and the automation layer is wide open. |
| **Action** | **WATCH** — monitor SONiC Foundation contributor lists, OCP/ONUG speaker rosters, LinkedIn departures from Azure Networking |

---

#### 11. Marvell SONiC Adaptive Routing Team

| Field | Detail |
|-------|--------|
| **Signal** | Marvell presented "Leveraging SONiC for Real-time Adaptive Routing" at OCP 2025. Collaborating with Aviz on 400G SONiC fabric deployments on Marvell silicon. |
| **Key people** | Engineers working on SONiC + adaptive routing at Marvell are building the intelligence layer that neoclouds need. If any of these engineers leave to start a company focused on the software layer, it would be a strong signal. |
| **Action** | **WATCH** — monitor Marvell networking team departures |

Sources: [Marvell OCP](https://www.marvell.com/company/events/ocp-2025.html), [Marvell Blog](https://www.marvell.com/blogs/marvell-and-aviz-networks-collaborate-to-drive-sonic-deployment-in-cloud-and-enterprise-data-centers.html)

---

### Market Infrastructure Players (Not Latent, but Context)

| Company | Role | Note |
|---------|------|------|
| **PANTHEON.tech** (Slovakia) | SandWork SONiC orchestrator | SDN/OpenDaylight heritage. CEO: Tomáš Jančo. CPO: Miroslav Miklus. |
| **STORDIS** (Germany) | European SONiC integrator + Enterprise SONiC distribution | SONiC Foundation member. Kamal Bhatt presenting AI SONiC tools. |
| **Asterfusion** (China) | AsterNOS enterprise SONiC + white-box switches | Hardware + software play, campus + DC. |
| **Edgecore Networks** | Going pure-play SONiC provider | Hardware only, partnering with software players. |
| **Enfabrica** | RDMA + CXL + Ethernet memory fabric | Adjacent — elastic AI memory fabric, not SONiC-specific but relevant infrastructure. |

## Thesis Validation Signals

1. **NVIDIA acquired Augtera** (SONiC AIOps) — confirms intelligent SONiC layer is strategically critical
2. **Dell + NVIDIA Spectrum-X + SONiC** integration — incumbents investing heavily in SONiC for AI fabric ([Source](https://siliconangle.com/2025/11/21/dells-sonic-push-reinvents-ai-networking-ai-factories-sc25/))
3. **Nokia joined SONiC Foundation** as premier member (Dec 2025) — further mainstream validation
4. **Edgecore going pure-play SONiC** — hardware commoditizing, value shifting to software/automation layer
5. **Neoclouds using InfiniBand today** (CoreWeave, Lambda) but Ethernet/SONiC alternatives gaining — creates a transition opportunity
6. **OCP Summit 2025** — multiple SONiC + AI fabric sessions, Meta announcing Disaggregated Scheduled Fabric for AI clusters ([Source](https://engineering.fb.com/2025/10/13/data-infrastructure/ocp-summit-2025-the-open-future-of-networking-hardware-for-ai/))

## Gap Analysis — Where the Breakout Company Lives

| Need | Current State | Gap |
|------|--------------|-----|
| **Turnkey SONiC fabric for neoclouds** | Aria (switches + telemetry), Hedgehog (cloud-native) | No single vendor offers integrated Day 0→N for neocloud persona |
| **AI-driven adaptive routing** | Broadcom/Marvell at ASIC level, Aria at telemetry level | No pure-software AI layer sitting on top of any SONiC deployment |
| **Multi-vendor SONiC orchestration** | BE Networks (Verity), Dorado (Cruz), PANTHEON.tech (SandWork) | All enterprise-oriented, none neocloud-native |
| **GPU-aware fabric intelligence** | Augtera (now NVIDIA) was closest | Acquired; independent solution needed |
| **Lossless Ethernet fabric tuning** | Manual PFC/ECN tuning, some Arista tooling | No autonomous system that learns optimal fabric config for AI workloads |

**The white space:** A startup that builds an **autonomous, GPU-workload-aware fabric controller** on SONiC — one that auto-discovers topology, self-tunes lossless Ethernet (PFC/ECN/DCQCN), optimizes job placement based on network state, and provides neocloud-grade multi-tenancy — would capture the highest-value position in this stack.

## Risks & Open Questions

1. **Will NVIDIA's Augtera integration close the gap?** If NVIDIA ships a compelling SONiC AIOps product bundled with Spectrum-X, it could foreclose the startup opportunity on NVIDIA hardware.
2. **Arista "blue box" approach** — Arista offering diagnostics/management for white-box switches could commoditize the automation layer for hyperscalers/neoclouds.
3. **Will neoclouds build in-house?** CoreWeave and Lambda have strong engineering teams and may build their own SONiC fabric automation rather than buying.
4. **Broadcom Enterprise SONiC bundling** — Broadcom distributing Enterprise SONiC with Dorado Cruz could create a default choice that's "good enough."
5. **InfiniBand persistence** — if neoclouds stay on InfiniBand for backend fabric, the SONiC opportunity shrinks. However, the Ethernet transition thesis is strong (UEC 1.0, cost, multi-vendor flexibility).

## Recommended Actions

| Priority | Action | Target |
|----------|--------|--------|
| **1** | REACH_OUT | **Mansour Karam / Aria Networks** — category leader candidate, serial founder, Sutter Hill backed |
| **2** | REACH_OUT | **Marc Austin / Hedgehog** — early stage, open-source approach, real customers |
| **3** | WATCH | **Amir Elbaz / BE Networks** — strong product, monitor for funding round |
| **4** | WATCH | **Rahul Aggarwal** (NVIDIA/ex-Augtera) — latent founder, monitor for departure ~2026-2027 |
| **5** | WATCH | **Stefan Bokaie** (Dorado/ex-Dell) — SONiC godfather at Dell, monitor for new venture |
| **6** | MAP_LANDSCAPE | **SONiC Foundation contributor analysis** — identify top individual contributors who might be latent founders |
| **7** | DEEP_DIVE | **Neocloud networking pain points** — interview CoreWeave/Lambda/Crusoe network engineers to validate gap |

## Sources

- [Packet Pushers — Aria Networks Startup Radar](https://packetpushers.net/blog/startup-radar-aria-networks-sings-of-telemetry-to-sell-ethernet-switches-to-neoclouds/)
- [Network World — Apstra Founder Launches Aria](https://www.networkworld.com/article/4095220/apstra-founder-launches-aria-to-tackle-ai-networking-performance.html)
- [Aria Networks Blog — Networks that Think](https://www.arianetworks.com/blog/networks-that-think)
- [Hedgehog Cloud](https://hedgehog.cloud/)
- [Network World — Aviz Networks $17M](https://www.networkworld.com/article/3610296/sonic-pioneer-aviz-networks-raises-17m-for-ai-network-management-push.html)
- [SDxCentral — Aviz SONiC Push](https://www.sdxcentral.com/news/aviz-networks-open-sources-networking-with-sonic-push/)
- [SiliconANGLE — Dell SONiC AI Networking](https://siliconangle.com/2025/11/21/dells-sonic-push-reinvents-ai-networking-ai-factories-sc25/)
- [DCD — NVIDIA Acquires Augtera](https://www.datacenterdynamics.com/en/news/nvidia-quietly-acquires-aiops-firm-augtera-networks/)
- [ONUG — Agentic AI on SONiC](https://onug.net/events/agentic-ai-on-sonic-building-the-open-ai-fabric/)
- [DriveNets — WhiteFiber Deployment](https://www.prnewswire.com/news-releases/whitefiber-deploys-drivenets-ethernet-based-ai-fabric-in-its-new-gpuaas-data-center-302460840.html)
- [Arrcus + UfiSpace Partnership](https://www.businesswire.com/news/home/20250520289954/en/Arrcus-and-UfiSpace-Expand-Strategic-Partnership-to-Advance-Open-Infrastructure-for-AI-and-Cloud)
- [BE Networks Verity 6.3](https://www.prnewswire.com/news-releases/be-networks-releases-verity-6-3--the-industry-leading-data-center-hyperautomation-platform-for-sonic-enabled-ethernet-switches-302264077.html)
- [Meta OCP Summit 2025 — Networking for AI](https://engineering.fb.com/2025/10/13/data-infrastructure/ocp-summit-2025-the-open-future-of-networking-hardware-for-ai/)
- [Edgecore — Why SONiC for AI](https://www.edge-core.com/blogs/why-is-sonic-perfect-for-ai-data-centers/)
- [Ubuntu — SONiC in Modern Data Centers](https://ubuntu.com/blog/sonic-the-open-source-network-operating-system-for-modern-data-centers)
