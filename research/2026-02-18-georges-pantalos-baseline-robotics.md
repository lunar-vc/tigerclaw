# Georges Pantalos / Baseline Robotics -- Founder Deep Dive

**Date:** 2026-02-18
**Analyst:** Claude (Tigerclaw)
**Type:** Founder Research

---

## Executive Summary

Georges Pantalos (legal name: Georgios Pantalos) is a Belgian-Greek technical founder based in Zurich, building in the robotics space. He runs two ventures: **AdaAI GmbH** (registered April 2024, multi-agent RL for warehouse robotics) and **Baseline Robotics** (robot-as-a-service platform for embodied AI research). He holds an MSc in Robotics from ETH Zurich (2018-2021), a BSc in Mechanical Engineering from EPFL (2015-2018), and has industry experience at ABB Research (semiconductor defect detection) and NematX (industrial 3D printing). His advisory board -- Andreas Krause, Florian Dorfler, Cesar Cadena, Lars Lindemann -- is elite-tier ETH faculty. The key open question is the relationship between AdaAI (warehouse MARL) and Baseline Robotics (robot lab API) -- they may represent a pivot or a dual-product strategy.

---

## 1. Background & Education

### EPFL -- BSc Mechanical Engineering (2015-2018)
- Standard 3-year Swiss bachelor program
- No notable research output from this period
- Source: [Personal website](https://gpantalos.com), LinkedIn profile

### ETH Zurich -- MSc Robotics (2018-2021)
- **GPA: 5.44/6** (approximately top 10-15%, Swiss scale)
- **Thesis:** "Function Space Transfer of Probability Distributions" -- Bayesian models with priors defined in function space rather than weight space
  - Supervisors: **Jonas Rothfuss** (now Research Scientist at Google DeepMind) and **Andreas Krause** (Professor, Chair ETH AI Center)
  - Done in the **Learning & Adaptive Systems (LAS) Group** under Krause
  - Code open-sourced: [github.com/gpantalos/master-thesis](https://github.com/gpantalos/master-thesis)
  - Used MuJoCo physics simulations for control tasks (Hopper, HalfCheetah, Ant) -- directly relevant to his current robotics work
- Source: [GitHub master-thesis repo](https://github.com/gpantalos/master-thesis), personal website

### Pre-university
- **Belgian Mathematical Olympiad** -- 2nd place (May 2012), 3rd place (May 2014)
- This confirms Belgian origin
- Languages: French (native), Greek (native/bilingual), English (professional)
- Personal website mentioned "AIME finalist" with prizes in 2011 and 2013 -- this was actually the Belgian Mathematical Olympiad, not the American AIME
- Source: LinkedIn awards section

### Age Estimate
- BSc started 2015, typical age 18 at entry -> born ~1996-1997
- Current age: approximately **28-29 years old**
- Chess.com profile (since Nov 2016) is listed in the "ASK Reti Zurich" chess club
- Source: LinkedIn education dates, Chess.com profile

---

## 2. Work History

### ABB Research (Hitachi ABB Power Grids), Lenzburg, Switzerland (2019-2020)
- Worked on **active learning for semiconductor defect detection** in the power semiconductors division
- Published an IEEE paper: "An Active Deep Learning Method for the Detection of Defects in Power Semiconductors" at ASMC 2021 (11 citations)
- Co-authors: Marco Bellini, Peter Kaspar, Lars Knoll, Luca De-Michielis (all Hitachi ABB Power Grids, Semiconductors)
- **His affiliation on the paper was "Department of Mechanical Engineering, ETH Zurich"** -- this suggests it was a student research project / internship at ABB during his MSc, not full-time employment
- Source: [IEEE Xplore DOI: 10.1109/ASMC51741.2021.9435657](https://ieeexplore.ieee.org/document/9435657/)

### ETH AI Center (2021)
- Post-thesis research position at the ETH AI Center
- Worked on function-space priors for deep Bayesian models
- Short stint (~1 year based on timeline)
- Source: Personal website

### NematX AG, Zurich (2022-2024)
- **NematX** is an ETH Zurich spinoff (founded April 2020) specializing in high-performance polymer 3D printing using liquid crystal polymers (LCP)
- Georges worked on **slicing algorithms for industrial 3D printing applications**
- NematX is a real company with products (NEX 01 printer), corporate partnerships (Polyplastics invested), and recognition (Formnext Start-up Challenge winner 2020)
- Co-founders: Dr. Raphael Heeb (CEO) and Dr. Silvan Gantenbein (CTO)
- **This is his "industrial manufacturing" experience** -- it was at a deeptech hardware startup, not a large incumbent
- Source: Personal website, [NematX website](https://nematx.com)

### AdaAI GmbH, Zurich (2024-present)
- **Co-founder** (listed as sole management on commercial register)
- Official company details below
- Source: Personal website, Moneyhouse, startup.ch

---

## 3. Companies

### AdaAI GmbH
- **Registered:** 25 April 2024 in Zurich, Canton ZH
- **CHE Number:** CHE-292.854.063
- **Commercial register:** CH-020.4.084.260-6
- **Legal form:** GmbH (Limited Liability Company)
- **Share capital:** CHF 20,000 (minimum legal requirement -- bootstrapping signal)
- **Address:** Schaffhauserstrasse 261, 8057 Zurich
- **Management:** Georgios Pantalos (sole authorized signatory)
- **Purpose (German):** Development of IT solutions, particularly in data management and AI, and all related services. May establish branches and subsidiaries in Switzerland and abroad, acquire real estate, etc. (standard Swiss boilerplate)
- **Sector:** IT services
- **Last SOGC notification:** 30 April 2024 (just the initial registration)
- **Product:** Multi-agent reinforcement learning (MARL) control layer for warehouse robotics -- coordinated real-time movement of robots, reducing bottlenecks and improving throughput
- **Website:** adaai.ch (SSL certificate issues observed)
- **Startup.ch listing:** Founded April 2024, describes "Large Scale Warehouse Navigation" using MARL
- Source: [Moneyhouse](https://www.moneyhouse.ch/en/company/adaai-gmbh-19855501431), [startup.ch/adaai](https://www.startup.ch/adaai)

### Baseline Robotics
- **Domain:** baseline-robotics.com (live, operational website)
- **No Swiss commercial register entry found** -- not registered as a separate entity on Moneyhouse or Zefix
- **This is likely a product/brand under AdaAI GmbH**, or an unregistered trade name
- **Product:** API access to physical robots for embodied AI research -- "democratising robotics research by making hardware more accessible"
- **Offering:**
  - **Bimanual Manipulation Stations** (8 robot arms available, hourly rental):
    - AgileX PiPER: EUR 0.60/min
    - SO-ARM101: EUR 0.05/min
    - Elephant Robotics myCobot 280: EUR 0.10/min
    - Trossen Robotics WidowX 250: EUR 0.52/min
    - Trossen Robotics ViperX 300 S: EUR 0.91/min
    - igus ReBeL: EUR 1.05/min
    - DOBOT Nova 2: EUR 1.32/min
    - UFACTORY xArm 6: EUR 1.47/min
  - **Dexterity Stations** (coming soon): 7 dexterous hands (Aero Hand, WUJI, DexRobot, Robot Era, Inspire Robotics, Schunk, Shadow Robot)
  - **R&D Booth:** 1080p/60fps, 45-min continuous, 180-min daily cap
  - **Pro Booth:** 4K/120fps, 60-min continuous, 240-min daily cap
- **Access model:** REST API or Python SDK, live telemetry, job submission system
- **Uses SmolVLA** (HuggingFace/LeRobot) policies -- the website references "baseline/smolvla-wuji@main" as a policy format
- **No team page, no press, no social media presence, no blog**
- Source: [baseline-robotics.com](https://baseline-robotics.com)

### Relationship between AdaAI and Baseline Robotics

This is a critical open question. Two hypotheses:

1. **Pivot:** AdaAI started as warehouse MARL (April 2024), but pivoted to robot-as-a-service infrastructure (Baseline Robotics). The warehouse MARL product may have been harder to sell than expected.

2. **Dual product:** Baseline Robotics is a beachhead product -- generate revenue from robotics researchers while building the MARL technology that eventually becomes the main product. The robot lab provides data flywheel for training manipulation policies.

Evidence for pivot: LinkedIn still shows "AdaAI" as his current company, not Baseline Robotics. The Baseline Robotics website has no team page or "about" section. No separate entity registration. The website feels like it was launched recently.

Evidence for dual product: The Baseline Robotics site references SmolVLA policies being executed on the robots, which aligns with the original MARL/RL thesis. The infrastructure could serve both external researchers and internal policy development.

---

## 4. Publications

| # | Title | Venue | Year | Citations | Co-authors |
|---|-------|-------|------|-----------|------------|
| 1 | "An Active Deep Learning Method for the Detection of Defects in Power Semiconductors" | IEEE ASMC 2021 | 2021 | 11 | M. Bellini, P. Kaspar, L. Knoll, L. De-Michielis (all ABB) |
| 2 | "A Bayesian Approach to Invariant Deep Neural Networks" | ICML UDL 2021 (workshop) | 2021 | 1 | N. Mourdoukoutas, M. Federici, M. van der Wilk, V. Fortuin |

**Google Scholar:** [scholar.google.com/citations?user=Nghp7PwAAAAJ](https://scholar.google.com/citations?user=Nghp7PwAAAAJ&hl=en) -- 11 total citations, both papers from 2021.

**Assessment:** Very thin publication record. Both papers are from 2021 (his MSc year). No first-author papers. The ABB paper (11 citations) is applied ML, not groundbreaking. The Bayesian invariance paper was an ICML workshop paper (not main conference) and has only 1 citation. He is not an academic researcher -- he is a builder who did research during his MSc.

---

## 5. GitHub Profile

- **Username:** [gpantalos](https://github.com/gpantalos)
- **Location:** Zurich
- **Website:** gpantalos.com
- **Followers:** 21 / Following: 241
- **Repositories:** 7 total (only 1 original, 6 forked)

**Original repository:**
- `master-thesis` -- "Function Space Transfer of Probability Distributions" (Python, MIT, 0 stars)

**Forked repositories (signal of active interests):**
- `open-r1` (from huggingface/open-r1) -- DeepSeek-R1 reproduction
- `hrm` (from sapientinc/HRM) -- unknown
- `tiny-zero` (from Jiayi-Pan/TinyZero) -- DeepSeek R1-Zero minimal reproduction
- `ollama-deep-researcher` (from langchain-ai/local-deep-researcher) -- local research assistant
- `AgileRL` (from AgileRL/AgileRL) -- RL library with RLOps
- `pearl` (from facebookresearch/Pearl) -- Meta's production RL library

**Pinned gists:** Laplace Approximation in PyTorch, Stein's Identity in TensorFlow, Gaussian Process in NumPy

**Assessment:** Low GitHub activity. The forked repos tell a story: he's deeply interested in reinforcement learning (AgileRL, Pearl) and reasoning models (open-r1, tiny-zero). No Baseline Robotics or AdaAI code is public. The master thesis repo was recently opened (single "open-sourcing" commit).

---

## 6. Advisory Board Analysis

This is the strongest signal in the entire profile. The advisory board is exceptional for a pre-seed company:

### Andreas Krause
- **Role:** Professor of Computer Science, ETH Zurich; Chair, ETH AI Center; Academic Co-Director, Swiss Data Science Center
- **Connection to Pantalos:** Direct MSc thesis supervisor (via LAS Group)
- **H-index:** Very high (4,957+ citations per Google Scholar co-author page)
- **Notable:** IEEE Fellow (2025), UN High-level AI Advisory Body member, co-founded ETH spinoff LatticeFlow
- **Assessment:** World-class ML researcher. Having him as advisor is a genuine stamp of approval from the ETH AI ecosystem. He doesn't lend his name lightly.

### Florian Dorfler
- **Role:** Full Professor of Complex Systems Control, Automatic Control Laboratory, ETH Zurich
- **Connection to Pantalos:** Likely from MSc coursework or Krause's network; Jonas Rothfuss (Pantalos's thesis co-supervisor) has published with Dorfler
- **Research:** Control theory, networked systems, autonomous systems
- **Assessment:** Top control theory researcher. Relevant to multi-agent coordination and robot fleet control.

### Cesar Cadena
- **Role:** Senior Scientist (tenured), ETH Zurich; leads Perception, Mapping & Navigation team at Robotic Systems Lab (RSL); Managing Director of ETH RobotX
- **Connection to Pantalos:** RSL is the epicenter of ETH robotics (ANYmal, etc.). Cadena's perception and navigation expertise is directly relevant to warehouse robotics.
- **Assessment:** Deeply embedded in the ETH robotics ecosystem. Strong operational research leader, not just a professor.

### Lars Lindemann
- **Role:** Assistant Professor of Algorithmic Systems Theory, Automatic Control Laboratory, ETH Zurich (joined 2025, previously USC)
- **Research:** Systems and control theory, formal methods, robotics, autonomous systems, machine learning for verification and control
- **Born:** 1989 -- relatively young, newly appointed professor
- **Connection to Pantalos:** Also at ETH Automatic Control Lab (same department as Dorfler). Research on formal verification of autonomous systems is relevant to safe robot fleet deployment.
- **Assessment:** Rising star. His formal methods background could be critical for safety guarantees in multi-agent warehouse systems.

**Board Assessment:** All four advisors are active ETH faculty in directly relevant domains (ML, control theory, robotics perception, formal verification). This is not a name-board -- it's a working advisory group. The Krause connection is the anchor, and the others fill complementary technical gaps (perception, control, safety). This board would be very hard to assemble without genuine relationships and a compelling technical vision.

---

## 7. Social Media Presence

- **LinkedIn:** [linkedin.com/in/georges-pantalos](https://ch.linkedin.com/in/georges-pantalos) -- 1,089 followers, 500+ connections. Lists "AdaAI" as current position. Active -- likes/shares robotics content (Unitree, DEEP Robotics, autonomous driving)
- **Twitter/X:** [@gpantalos1](https://x.com/gpantalos1) -- exists but could not be scraped
- **Chess.com:** [georgespantalos](https://www.chess.com/member/georgespantalos) -- Gold member, plays in ASK Reti Zurich chess club. Active recently ("8 days ago")
- **No Baseline Robotics social media** accounts found anywhere
- **No personal blog or newsletter**

---

## 8. Prior Startup Attempts

No evidence of any prior startup attempts before AdaAI GmbH (April 2024). His career path was: EPFL student -> ETH MSc -> ABB research internship -> ETH AI Center short stint -> NematX (startup, but as employee, not founder) -> AdaAI (first founder venture).

---

## 9. Open Questions & Risk Factors

### Critical Questions

1. **AdaAI vs Baseline Robotics:** What's the actual company? Has he pivoted from warehouse MARL to robot-as-a-service? Or is Baseline Robotics a product under AdaAI? This needs direct clarification.

2. **Solo founder?** Moneyhouse shows him as sole management. His personal website says "Co-founder" of AdaAI. **Who is the co-founder?** Not visible anywhere. A co-founder who's invisible could be a silent/departed co-founder -- a red flag.

3. **Funding status:** CHF 20,000 share capital (minimum) suggests bootstrapped. No evidence of any institutional funding, grants (Venture Kick, Innosuisse), or angels. The Baseline Robotics hardware inventory (8+ robot arms, some expensive) implies some capital has been deployed -- either personal funds, revenue, or undisclosed funding.

4. **Revenue:** Baseline Robotics has pricing published, but is anyone paying? No testimonials, case studies, or customer logos visible.

5. **"Industrial manufacturing and warehouse robotics" experience:** This is slightly overstated in the brief. His "industrial manufacturing" experience was at NematX (a 3D printing startup, ~10 employees), working on slicing algorithms -- software work at a small company, not shop-floor manufacturing ops. His "warehouse robotics" experience is AdaAI itself, not prior industry roles.

6. **No PhD:** He has an MSc, not a PhD. In the Zurich robotics ecosystem, this is less common for technical founders. The advisory board compensates, but it's worth noting.

### Positive Signals

- ETH Zurich MSc in Robotics with strong grades (5.44/6)
- Thesis directly relevant to current work (Bayesian models, MuJoCo physics sim, function-space priors)
- Elite advisory board with genuine relationships (Krause = thesis supervisor)
- Industry experience at ABB (big corp, applied ML) and NematX (startup, shipped product)
- Active GitHub forks show deep engagement with RL literature and latest models
- Brussels Mathematical Olympiad placements suggest strong quantitative foundation
- Young (28-29) -- long runway

### Risk Factors

- Solo founder (or invisible co-founder)
- Extremely early -- company registered April 2024, website has no traction signals
- Two products/brands creates confusion about focus
- Thin publication record (2 papers, no first-author)
- No evidence of funding
- No visible team beyond himself
- "Baseline Robotics" not registered as a company -- is it a side project or the main thing?
- No press coverage, no social proof whatsoever

---

## 10. Thesis Fit Assessment

**Domain:** Robotics / Autonomy -- directly in Mick's lane
**Geography:** Switzerland (Europe) -- preferred
**Stage:** Day zero / pre-seed -- fits
**Valuation concern:** Very early, likely sub-EUR 5M if even fundraising

**AdaAI (warehouse MARL):**
- Multi-agent RL for warehouse robotics is a real problem (Amazon Robotics, Locus Robotics, etc.)
- But MARL for warehouse navigation is competitive -- incumbents have large engineering teams
- The "control layer" positioning (hardware-agnostic middleware) is smarter than building robots
- Thesis fit: **adjacent** to core robotics/autonomy theme

**Baseline Robotics (robot-as-a-service for research):**
- "AWS for physical robots" is a compelling concept
- Targets the sim-to-real gap problem -- huge pain point for embodied AI researchers
- Revenue model (per-minute pricing) is concrete
- SmolVLA/LeRobot ecosystem integration is timely
- Market: embodied AI research labs, university groups, startups building robot policies
- Risk: niche market, unclear if researchers will pay enough for this to be venture-scale
- Thesis fit: **adjacent** to robotics/autonomy -- infrastructure play, not end-application

---

## Sources

- Personal website: [gpantalos.com](https://gpantalos.com)
- GitHub: [github.com/gpantalos](https://github.com/gpantalos)
- Google Scholar: [scholar.google.com/citations?user=Nghp7PwAAAAJ](https://scholar.google.com/citations?user=Nghp7PwAAAAJ&hl=en)
- LinkedIn: [linkedin.com/in/georges-pantalos](https://ch.linkedin.com/in/georges-pantalos)
- IEEE Paper: [doi.org/10.1109/ASMC51741.2021.9435657](https://ieeexplore.ieee.org/document/9435657/)
- Arxiv Paper: [arxiv.org/abs/2107.09301](https://arxiv.org/abs/2107.09301)
- Baseline Robotics: [baseline-robotics.com](https://baseline-robotics.com)
- AdaAI on startup.ch: [startup.ch/adaai](https://www.startup.ch/adaai)
- AdaAI on Moneyhouse: [moneyhouse.ch/en/company/adaai-gmbh-19855501431](https://www.moneyhouse.ch/en/company/adaai-gmbh-19855501431)
- Andreas Krause profile: [las.inf.ethz.ch/krausea](https://las.inf.ethz.ch/krausea)
- Cesar Cadena homepage: [cesarcadena.ethz.ch](https://cesarcadena.ethz.ch/)
- Lars Lindemann profile: [control.ee.ethz.ch](https://control.ee.ethz.ch/people/profile.lars-lindemann.html)
- Florian Dorfler profile: [ch.linkedin.com/in/florian-dorfler-a8852258](https://ch.linkedin.com/in/florian-dorfler-a8852258)
- NematX: [nematx.com](https://nematx.com)
- GitHub master-thesis repo: [github.com/gpantalos/master-thesis](https://github.com/gpantalos/master-thesis)
- Chess.com: [chess.com/member/georgespantalos](https://www.chess.com/member/georgespantalos)
- DeepAI profile: [deepai.org/profile/georges-pantalos](https://deepai.org/profile/georges-pantalos)
