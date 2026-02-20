# THE-2355 — Closed-Loop Materials Validation — Founder Scan

**Date:** 2026-02-20
**Analyst:** Claude (Tigerclaw)
**Type:** Latent Founder Signal Scan
**Theme:** THE-2355 — Lab-in-the-loop active learning platforms closing the prediction-to-proof gap for ML-designed materials
**Status:** PARTIAL (rate-limited — 3 of 4 search agents capped, ~60% query coverage)

## Executive Summary

The self-driving lab space for materials is **well-funded at the top** — Periodic Labs ($300M), Lila Sciences ($550M), Radical AI ($55M), Orbital ($NVIDIA-backed) — but the European early-stage layer is thin. **Atinary Technologies** (Lausanne) is the only identified European startup directly in this space, and they've already raised ~$7M. The gap Lunar should hunt is narrower than expected: not "self-driving lab" generically, but specifically the **active learning / experimental design** software layer that sits between MLIP predictions and physical testing. The hardware (robotic synthesis) is commoditizing; the intelligence of *which experiments to run* is the defensible IP.

## Competitive Landscape

### Too Late for Lunar (already funded)

| Company | Funding | Founders | Location | Focus |
|---------|---------|----------|----------|-------|
| **Periodic Labs** | $300M seed | Ekin Dogus Cubuk (DeepMind GNoME), Liam Fedus (OpenAI, co-created ChatGPT) | US (Northwestern) | AI scientist for materials. Superconductors, semiconductors, materials R&D |
| **Lila Sciences** | $550M ($200M seed + $350M A) | Geoffrey von Maltzahn (Flagship) | US | "Scientific superintelligence." Life sci, chemistry, materials |
| **Radical AI** | $55M seed+ | Joseph Krause, Jorge Colindres, Gerd Ceder (Berkeley A-Lab pioneer) | US (NYC) | Self-driving materials lab. TorchSim. Alloys |
| **Orbital Materials** | NVIDIA-backed | Jonathan Godwin (ex-DeepMind) | UK/NJ | Data center materials, carbon capture. Open-sourced Orb |
| **ChemLex** | $45M | — | Singapore | Self-driving lab for drug discovery |

### Borderline — Worth Investigating

| Company/Person | Stage | Location | Signal |
|----------------|-------|----------|--------|
| **Atinary Technologies** | $5M seed + CHF 2M Innosuisse grant | Lausanne, Switzerland | **European self-driving lab platform.** Co-founders Hermann Tribukait (CEO) and Loic Roch (CTO). No-code SDLabs platform. Philippe Schwaller (EPFL LIAC) on scientific advisory board. Partnered with Chemspeed (Basel). Opening labs in Basel and Boston. Primarily pharma/chemistry customers so far — materials vertical unclear. ~$7M raised may put them past Lunar's ideal entry point, but worth a conversation. |

### Academic Hubs / Latent Founder Pipelines

| Lab | PI | Location | Why Watch |
|-----|-----|----------|-----------|
| **EPFL LIAC** | Philippe Schwaller | Lausanne | ChemCrow (autonomous AI agent for chemistry), Molecular Transformer. Schwaller is tenure-track (no venture signal), but his PhD students are prime founder candidates. **Andres M. Bran** (ChemCrow co-author) and **Joshua W. Sin** (parallel reaction optimization, Nature Comms 2025) are names to track. |
| **Abolhasani Lab (NC State)** | Milad Abolhasani | Raleigh, US | "Rainbow" multi-robot SDL. 10x faster materials discovery. Nature Chem Eng 2025. Key students: **Fernando Delgado-Licona** (first author, autonomous inorganic materials), **Nikolai Mukhin** (closed-loop perovskite optimization). US-based but students may relocate. |
| **A-Lab (Berkeley/LBL)** | Gerd Ceder (now Radical AI CSO) | Berkeley, US | First autonomous solid-state synthesis lab (Nature 2023). Nathan Szymanski now UCLA faculty. Ceder defected to Radical. Lab may continue under Berkeley but key talent has scattered. |
| **Cambridge (Csányi group)** | Gábor Csányi | Cambridge, UK | MACE creator. Peter mentioned "new venture" but nothing found publicly. If he's spinning out MACE commercially, that's more model-layer than validation-layer. Watch for students moving into experimental work. |
| **EPFL COSMO (Ceriotti)** | Michele Ceriotti | Lausanne | Philip Loche (our domain expert contact) is from this group. torch-pme for MLIPs. More infrastructure than validation, but adjacent. |

### WATCH Candidates — Need Enrichment

| Name | Affiliation | Signal | Next Step |
|------|-------------|--------|-----------|
| **Andres M. Bran** | EPFL LIAC | Co-author of ChemCrow (Nature Machine Intelligence 2024). LLM agents that autonomously plan and execute chemistry experiments. European (EPFL). | Check PhD timeline, GitHub, LinkedIn. Is he close to defending? Any builder signals? |
| **Joshua W. Sin** | EPFL (Schwaller group) | "Highly parallel optimisation of chemical reactions through automation and machine intelligence" — Nature Comms 2025. | Check career stage. Postdoc or PhD? LinkedIn profile. |
| **Fernando Delgado-Licona** | NC State (Abolhasani lab) | First author: flow-driven autonomous inorganic materials discovery (Nature Chem Eng 2025). Built the core autonomous synthesis platform. | Check if PhD defended. LinkedIn for next move signals. |
| **Nikolai Mukhin** | NC State / possibly MIT | Closed-loop experimentation for perovskite nanocrystals using parallelized miniaturized batch reactors with spectroscopic feedback (Mukhin et al., 2025). | Verify affiliation, career stage, geo. |
| **Niklas Leimeroth** | TU Darmstadt (DEAL-1660) | Already in pipeline. MLIP benchmarking, pyiron contributor. Validation/testing adjacent. | Monitor for PhD defense. |

## Key Insight: The Wedge Is Narrower Than Expected

The "self-driving lab" category is crowded and capital-intensive (hardware + wet lab + ML). But within it, there's a defensible software layer:

1. **Experimental design intelligence** — Deciding *which* experiments to run (active learning, Bayesian optimization, epistasis-aware design a la MULTI-evolve) — not the robotic execution itself
2. **Automated characterization interpretation** — ML models that close the loop by interpreting XRD, spectroscopy, microscopy data without human experts
3. **Cross-lab data infrastructure** — Standardizing experimental results across different synthesis setups (the "Materials Project" for experimental data)

For Lunar's check size and stage preference, the best target might be someone building **#1 or #2 as software/IP** — not building their own lab, but selling to everyone who has one. Chemspeed, Beckman Coulter, and others sell the robots; the intelligence layer is undersupplied.

## Gaps in This Scan (Rate-Limited)

- Social search (Twitter/LinkedIn/Reddit) — 0 queries completed
- Media search (YouTube/podcasts) — 0 queries completed
- Builder search (GitHub repos) — partial (~3 queries)
- Missing: departure scans for national labs, conference speaker scans, patent filing scans
- Missing: Schwaller group member enumeration, Abolhasani lab alumni tracking

**Recommended follow-up:** Re-run full scan when rate limit resets. Specifically:
1. Enumerate EPFL LIAC group members (Schwaller's website)
2. Check GitHub activity for Andres Bran, Joshua Sin
3. Run departure scan for BASF/Dow/3M computational materials teams
4. Conference speaker scan for MRS Fall 2025 Symposium MT03 (Accelerated Materials Discovery Through Data-Driven AI and Automation)

## Sources

- [Periodic Labs — TechCrunch $300M](https://techcrunch.com/2025/09/30/former-openai-and-deepmind-researchers-raise-whopping-300m-seed-to-automate-science/)
- [Lila Sciences — Reuters $1.3B valuation](https://www.reuters.com/business/ai-lab-lila-sciences-tops-13-billion-valuation-with-new-nvidia-backing-2025-10-14/)
- [Radical AI — self-driving materials lab](https://www.rdworldonline.com/how-radical-ai-is-building-a-self-driving-materials-lab/)
- [Atinary Technologies](https://atinary.com/)
- [Atinary $5M seed](https://www.startupticker.ch/en/news/atinary-technologies-banks-5m-in-seed-round)
- [Schwaller EPFL LIAC](https://schwallergroup.github.io/)
- [ChemCrow — Nature Machine Intelligence](https://www.sciencedaily.com/releases/2024/05/240508093714.htm)
- [Abolhasani lab — NC State](https://www.abolhasanilab.com/)
- [Abolhasani SDL 10x — Nature Chem Eng 2025](https://news.ncsu.edu/2025/07/fast-forward-for-self-driving-labs/)
- [A-Lab — Nature 2023](https://www.nature.com/articles/s41586-023-06734-w)
- [Joshua Sin et al. — Nature Comms 2025](https://www.nature.com/articles/s41467-025-61803-0)
- [MIT Tech Review — AI materials needs real world](https://www.technologyreview.com/2025/12/15/1129210/ai-materials-science-discovery-startups-investment/)
- [Benchmarking SDLs — Digital Discovery 2026](https://pubs.rsc.org/en/content/articlehtml/2026/dd/d5dd00337g)
- [NIST — Autonomous Laboratories](https://www.nist.gov/autonomous-laboratories)
