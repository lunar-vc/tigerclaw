# Lunar Mining / Resource Extraction — Investment Thesis Analysis

**Date:** 2026-02-18
**Analyst:** Claude (Tigerclaw)
**Type:** Theme Analysis — Investment Thesis Evaluation
**Requested by:** Mick

---

## Executive Summary

Lunar resource extraction is real but extremely early. 2025 was the first year ISRU instruments actually operated on the lunar surface (Honeybee Robotics' drill on IM-2, instruments on Firefly's Blue Ghost). The Artemis program is accelerating with Artemis II crewed flyby targeting Feb-Apr 2026 and the first crewed landing (Artemis III) no earlier than mid-2027. SpaceX's surprise pivot to prioritizing a "self-growing city" on the Moon over Mars (announced Feb 2026) adds a massive demand signal. However, **profitable lunar mining is 10+ years away**, capex is staggering ($200M+ just for equipment transport), and VC exit timelines are fundamentally misaligned with the technology development cycle. The software/low-capex angle exists but is thin and deeply dependent on the hardware players reaching the Moon first. **This is a WATCH theme, not an invest-now theme for a pre-seed fund.**

---

## 1. What's Actually Being Mined / Targeted

### Commercially Viable (Near-Term, 2029-2035 Window)

| Resource | Status | First Customer | Reality Check |
|----------|--------|----------------|---------------|
| **Water ice** | Confirmed at poles by multiple missions. PRIME-1 (Honeybee/IM-2) drilled lunar surface in Feb 2025 but off-nominal landing prevented full ice extraction. | NASA (life support, propellant), future cislunar operators | Concentration uncertain. Exists in permanently shadowed craters at -230C. Extraction is brutally hard. No commercial-scale demo yet. |
| **Helium-3** | Present in regolith at 2-26 ppb (error margin is ~81% of value). Not yet extracted on lunar surface. | Quantum computing (dilution refrigerators), fusion (someday) | At $20M/kg, Interlune claims viable business for quantum computing. But you need to process ~100 tons of regolith/hour to get meaningful quantities. Fusion demand is speculative — we don't have commercial fusion reactors. |
| **Oxygen (from regolith)** | Lab-demonstrated via carbothermal reduction. Blue Alchemist (Blue Origin) demo'd regolith-to-solar-cell process on Earth. | Life support for crewed missions, propellant (LOX) | Most mature ISRU pathway. NASA/ESA are actively funding. But still no lunar surface demo of full oxygen extraction at scale. |
| **Regolith (as construction material)** | Readily available. 3D printing with regolith simulant demonstrated on Earth. | Radiation shielding, landing pads, habitats | Low-value bulk material. Not a revenue-generating "mining" play — it's construction support. |

### Theoretical / Too Early

| Resource | Status | Reality Check |
|----------|--------|---------------|
| **Rare earth elements** | Present in lunar regolith but at low concentrations | Not economically viable to extract and return to Earth. Transport cost (~$20,000-50,000/kg to lunar surface) destroys any margin. |
| **Platinum group metals** | Trace amounts detected | Same economics problem. Asteroid mining is a better path for PGMs than lunar. |
| **Iron, titanium, aluminum** | Abundant in regolith (ilmenite = FeTiO3) | Only valuable for in-situ manufacturing, not Earth return. Decades away from demand. |

**Bottom line:** Water ice and oxygen from regolith are the only near-term commercially relevant resources. Helium-3 is a niche play ($50M total market by 2033 per Verified Market Reports) with one serious company chasing it. Everything else is 2035+ at best.

Sources:
- SpaceNews: [Lunar helium-3: separating market from marketing](https://spacenews.com/lunar-helium-3-separating-market-from-marketing/) (May 2025)
- Aerospace America: [2025 advances in space resources](https://aerospaceamerica.aiaa.org/year-in-review/2025-advances-in-the-field-of-space-resources/)
- ISRU Market Report 2026: [GlobeNewsWire](https://www.globenewswire.com/news-release/2026/01/20/3222092/28124/en/In-Situ-Resource-Utilization-ISRU-Market-Report-2026-5-25-Bn-Opportunities-Trends-Competitive-Landscape-Strategies-and-Forecasts-2020-2025-2025-2030F-2035F.html)

---

## 2. Key Startups and Companies

### Lunar Mining / ISRU Startups — Global Landscape

| Company | Location | Founded | Stage / Funding | What They're Building | Notes |
|---------|----------|---------|-----------------|----------------------|-------|
| **Interlune** | Seattle, USA | 2022 | ~$23M+ total ($18M+ VC + $5M SAFE Jan 2026 + $375K DOE grant) | Helium-3 harvester — full-scale excavator prototype built with Vermeer. Processes 100 tons regolith/hour. | Most serious lunar mining startup. Ex-Blue Origin CEO Rob Meyerson + Apollo 17 astronaut Harrison Schmitt. DOE agreement to deliver He-3 by 2029. NASA contract for excavator dev (mid-2026). First customer: Maybell Quantum. |
| **AstroForge** | Huntington Beach, USA | 2022 | $56M over 4 rounds | Asteroid mining (PGMs) — not lunar. Built Odin spacecraft for asteroid rendezvous. | Asteroids not Moon, but relevant competitor for space mining narrative. Two failed missions so far. |
| **Karman+** | Colorado, USA (HQ) / European roots | 2023 | $20M seed (Feb 2025, Plural + Hummingbird) | Asteroid mining — autonomous spacecraft for water extraction from near-Earth asteroids. Demo mission "High Frontier" targeting 2027. | **European VC-backed** (Plural = London, Hummingbird = Antwerp, HCVC = Paris). Dutch-born founder Teun van den Dries. Adjacent to lunar but targeting asteroids. |
| **Maana Electric** | Luxembourg | 2018 | ESA Space Resources Accelerator (first cohort) | Solar panels manufactured from lunar regolith. TERRABOX terrestrial testbench + SOURCE lunar demonstrator. | **European.** In Luxembourg's ISRU ecosystem. Dual-use: also making solar panels from desert sand on Earth. Partnered with University of Luxembourg for ESA's LuMA challenge. |
| **OffWorld** | Pasadena, USA / Europe (Luxembourg partnership) | 2016 | $4.3M | AI-powered autonomous robots for mining — Earth, Moon, Mars, asteroids. Swarm robotics approach. | Partnership with Luxembourg Space Agency for ISRU. Very early. $4.3M is tiny for the ambition. |
| **Orbital Mining** | USA | Recent | Early | Robotic systems for lunar regolith harvesting, thermal processing for power/propellant. | Limited public info. Early stage. |
| **ELO2 Consortium** | Australia/UK | Recent | $42M Australian Space Agency contract (Dec 2024) | Lunar rovers for regolith collection + oxygen extraction. Includes Lunar Outpost. | Government-funded. Australia targeting 2026-2027 rover launch. |
| **Lunar Helium-3 Mining (LH3M)** | USA | Recent | Pre-revenue, 5 patents secured | "Fully integrated lunar helium-3 mining platform" | Claims $17T annual market. Highly speculative. Patent-first approach. |
| **Space RS** | Luxembourg | Recent | Unknown | Space mine planning, SRU/ISRU value chain optimization, Lunar Ore Reserve Standards (LORS). | **European.** Consulting/planning — potentially a software angle. |
| **Deep Space Energy** | Riga, Latvia | Recent | €930K total | Radioisotope thermoelectric generator (RTG) using americium-241 for lunar rovers and mining operations. | **European.** Pre-seed. Not mining itself but enabling tech (power for miners). |

### Infrastructure Players (Not Mining, But Required)

| Company | Role | Status |
|---------|------|--------|
| **Intuitive Machines** (LUNR, public) | Commercial lunar landers. 2 successful Moon landings (2024, 2025). IM-3 targeting H2 2026. | Most proven commercial lunar delivery. CLPS contractor. |
| **Astrobotic** | Griffin lander (lunar south pole). CLPS contractor. | Peregrine failed (2024). Griffin Mission One targeting 2026. |
| **ispace** (Japan, public) | Lunar landers + ISRU. Water electrolyzer flown on SpaceX 2025. | 2nd landing attempt failed (June 2025 — lost location tracking). But demonstrated ISRU hardware on SpaceX mission. |
| **Firefly Aerospace** | Blue Ghost lander — successful March 2025 landing. | Carried Honeybee Robotics ISRU instruments. CLPS contractor. |
| **Blue Origin** | Blue Moon lander. Blue Alchemist (regolith-to-solar-cells). Owns Honeybee Robotics. | Massive resources. Blue Moon targeting 2026 landing. |
| **Honeybee Robotics** (Blue Origin) | Drills, instruments, LUNARSABER power/comm tower. DARPA's LunA-10. | The actual ISRU hardware leader. Operated 4 instruments on lunar surface in 2025. |
| **Lunar Outpost** | MAPP rovers. MARS-1 autonomous swarm contract (US military). | Software: "Mobile Autonomous Robotic Swarms" — relevant software angle. |

### European ISRU Ecosystem Summary

Luxembourg is the European hub — first European country with a space resources law (2017), home to ESRIC (European Space Resources Innovation Centre, ESA/LSA/LIST joint venture), and the Space Resources Industry Accelerator. Key entities:
- **Maana Electric** (Luxembourg) — solar panels from regolith
- **Space RS** (Luxembourg) — mine planning consulting
- **Deep Space Energy** (Latvia) — RTG power systems
- **Karman+** (European VC-backed) — asteroid mining, not lunar
- **European Space Ventures AG** — investment vehicle for lunar resources

**Notable gap:** There are no pre-seed/seed-stage European startups doing pure lunar mining software. The ecosystem is small and mostly hardware-focused or government-funded research.

Sources:
- GeekWire: [Interlune funding](https://www.geekwire.com/2026/interlune-funding-moon-mining-safe/) (Jan 2026)
- National Today: [Interlune $5M SAFE](https://nationaltoday.com/us/wa/seattle/news/2026/01/29/interlune-secures-5m-to-advance-lunar-mining-for-helium-3/) (Jan 2026)
- Forbes: [Interlune moon mining](https://www.forbes.com/sites/jeremybogaisky/2025/08/29/moon-mining-heiium-interlune/) (Aug 2025)
- TechCrunch: [Karman+ $20M seed](https://techcrunch.com/2025/02/19/karman-digs-up-20m-to-build-an-asteroid-mining-autonomous-spacecraft/) (Feb 2025)
- EU-Startups: [Deep Space Energy €930K](https://www.eu-startups.com/2026/02/with-europe-seeking-greater-defence-and-space-autonomy-deep-space-energy-secures-e930k-to-advance-lunar-energy-tech/) (Feb 2026)
- ESA BSGN: [ESRIC first accelerator cohort](https://bsgn.esa.int/2025/02/11/esric-first-cohort/) (Feb 2025)
- Luxembourg Space Agency: [Maana Electric](https://space-agency.public.lu/en/expertise/space-directory/MaanaElectric.html)

---

## 3. Technical Readiness — ISRU State of Play

### What Actually Worked on the Moon (as of Feb 2026)

| Technology | TRL | Status |
|------------|-----|--------|
| **Drilling into regolith** | 6-7 | TRIDENT (Honeybee) drilled on IM-2 (Feb 2025) but lander tipped, preventing full operation. LISTER probe drilled to 1m on Blue Ghost (Mar 2025). |
| **Regolith sample collection** | 6-7 | Lunar PlanetVac collected ~10g on Blue Ghost (Mar 2025). Chinese Chang'e-5/6 returned samples. |
| **Mass spectrometry (volatile detection)** | 7 | MSOLO operated on lunar surface (IM-2, 2025). |
| **Water ice detection** | 5-6 | Confirmed by LCROSS (2009), Chandrayaan-1 (2008). IM-2/PRIME-1 was supposed to confirm in-situ but off-nominal landing limited results. |
| **Water electrolysis (H2/O2 splitting)** | 4-5 | ispace water electrolyzer launched on SpaceX 2025 — tech demo, not full extraction. Lab-proven. |
| **Oxygen from regolith (carbothermal)** | 4-5 | CaRD demo tested on Earth. Blue Alchemist lab-demonstrated full regolith-to-solar-cell pipeline. Not yet operated on Moon. |
| **Autonomous excavation** | 3-4 | Interlune has full-scale prototype on Earth. NASA Lunar Autonomy Challenge used digital twins. No autonomous excavation on Moon yet. |
| **Regolith 3D printing** | 3-4 | Demonstrated in lab with simulants. Not on Moon. |
| **Industrial-scale processing** | 2-3 | All concepts are paper studies or small lab demos. Interlune's "100 tons/hour" target is aspirational. |

### Key Technical Gaps

1. **Nobody has extracted water from lunar ice in situ.** PRIME-1 was the closest attempt — the lander tipped and couldn't drill properly.
2. **No oxygen extraction demonstrated on the Moon.** All demos are Earth-based with regolith simulants.
3. **Thermal management in permanent shadow is unsolved at scale.** Operating at -230C in permanently shadowed craters where water ice exists is an extreme engineering challenge.
4. **Autonomous operations over weeks/months are unproven.** Current missions last days, not the months needed for mining.
5. **Power generation at polar craters is a fundamental problem.** No sunlight = no solar power = need nuclear (RTG or fission). Deep Space Energy's RTG is relevant here.

**Bottom line:** We're at TRL 4-6 for individual components. Nobody has demonstrated an integrated ISRU system on the Moon. The gap between "we drilled some regolith" and "we're commercially extracting resources" is enormous — probably a decade.

Sources:
- Aerospace America: [2025 ISRU Year in Review](https://aerospaceamerica.aiaa.org/year-in-review/2025-advances-in-the-field-of-space-resources/)
- NASA: [ISRU Pilot Excavator](https://www.nasa.gov/isru-pilot-excavator/)
- NASA Technical Reports: [ISRU Development Review 2019-2025](https://ntrs.nasa.gov/citations/20250003730)

---

## 4. Timing Signals

### Artemis Program

| Mission | Target Date | Relevance |
|---------|-------------|-----------|
| **Artemis II** | Feb-Apr 2026 (16 launch windows selected) | Crewed lunar flyby. No landing. Proves SLS + Orion for crewed deep space. |
| **Artemis III** | Mid-2027 (originally 2025, slipped repeatedly) | First crewed lunar landing since 1972. Uses SpaceX Starship HLS. Lunar south pole. |
| **Artemis IV** | Late 2028 | Lunar Gateway docking. Sustained presence begins. |
| **Artemis V+** | 2029+ | Sustained crewed surface operations. ISRU demonstrations planned. |

### Commercial Lunar Landers (2026 Manifest)

At least 4 commercial lunar landing attempts scheduled for 2026:
- **Blue Origin** Blue Moon Mark 1 (lunar south pole)
- **Firefly Aerospace** (2nd Blue Ghost mission)
- **Intuitive Machines** IM-3 (Reiner Gamma, H2 2026)
- **Astrobotic** Griffin Mission One (lunar south pole)

This is a significant acceleration — in 2024 there was 1 successful commercial landing, in 2025 there were 2-3 attempts.

### SpaceX Lunar Pivot (Feb 2026)

Elon Musk announced Feb 8, 2026 that SpaceX is shifting priority from Mars to building a "self-growing city" on the Moon, achievable "in less than 10 years." This is a massive demand signal for lunar infrastructure and ISRU. Combined with the SpaceX-xAI merger and talk of AI-powered lunar manufacturing, this could accelerate timelines — or be typical Musk overclaiming.

### Regulatory / Legal

- **Artemis Accords:** 55 signatory nations as of June 2025. Affirms space resource extraction is permissible under the Outer Space Treaty. Provides political/legal cover for commercial operators.
- **Luxembourg Space Resources Law (2017):** First European legal framework for space resource extraction.
- **US Commercial Space Launch Competitiveness Act (2015):** Grants US citizens rights to resources extracted from space.
- **Gap:** No binding international framework for property rights, operating zones, or environmental protection. The Outer Space Treaty prohibits "national appropriation" but explicitly allows resource extraction — the tension is unresolved.
- **China's ILRS program** (International Lunar Research Station) targeting 2035 represents a competing governance framework outside the Artemis Accords.

Sources:
- Wikipedia: [Artemis program](https://en.wikipedia.org/wiki/Artemis_program) (updated Nov 2025)
- Space.com: [Moon rush 2026](https://www.space.com/astronomy/moon/moon-rush-these-private-spacecraft-will-attempt-lunar-landings-in-2026) (Jan 2026)
- Reuters: [SpaceX lunar pivot](https://reuters.com/science/musk-says-spacex-prioritise-building-self-growing-city-moon-2026-02-08) (Feb 2026)
- The Conversation: [Moon mining rules](https://theconversation.com/the-race-to-mine-the-moon-is-on-and-it-urgently-needs-some-clear-international-rules-270943) (Dec 2025)

---

## 5. Investment Landscape

### Recent Rounds (2024-2026)

| Company | Round | Amount | Date | Investors |
|---------|-------|--------|------|-----------|
| Interlune | SAFE | $5M | Jan 2026 | Undisclosed |
| Karman+ | Seed | $20M | Feb 2025 | Plural (London), Hummingbird (Antwerp), HCVC (Paris) |
| AstroForge | Series A (est.) | $56M total | Through 2025 | Multiple rounds |
| Deep Space Energy | Pre-seed | €930K | Feb 2026 | Undisclosed |
| Interlune | Earlier rounds | $18M+ | 2022-2024 | VC + DOE grant |

### VCs Active in Space Mining / Resources

- **Plural** (London) — led Karman+ seed
- **Hummingbird** (Antwerp) — co-led Karman+ seed
- **HCVC** (Paris) — participated in Karman+ seed
- **Seven Seven Six** (Alexis Ohanian) — active in space broadly
- **Valhalla Ventures** (LA) — early-stage space
- **Seraphim Space** (London) — dedicated space VC, though focused more on EO/data
- **Promus Ventures** — backed Interlune
- **Type One Ventures** — space-focused

**No dedicated space mining VC thesis exists.** The space VCs invest across the stack — launch, satellites, data, manufacturing. Mining is a tiny niche within their portfolios. The SpaceNews article explicitly warns: "Venture capitalists need exits within five to seven years. That timeline doesn't even cover the development phase for lunar mining operations."

### Market Size Projections (Take with Heavy Skepticism)

- ISRU market: $5.25B by 2030 (GlobeNewsWire market report, Jan 2026)
- Space-based metal mining: $3.25B by 2030 (GlobeNewsWire, Jan 2026)
- Lunar exploration technology: $21.4B by 2030, 13.3% CAGR (GlobeNewsWire, Jan 2026)
- Helium-3 market: $50M by 2033 (Verified Market Reports)

These projections from market research firms are notoriously unreliable for pre-commercial deep tech markets. The ISRU "$5.25B by 2030" is particularly suspect given that zero commercial ISRU revenue exists today.

Sources:
- GeekWire: [Interlune SAFE](https://www.geekwire.com/2026/interlune-funding-moon-mining-safe/) (Jan 2026)
- TechCrunch: [Karman+ seed](https://techcrunch.com/2025/02/19/karman-digs-up-20m-to-build-an-asteroid-mining-autonomous-spacecraft/) (Feb 2025)
- TechCrunch: [Space investing mainstream](https://techcrunch.com/2025/09/01/space-investing-goes-mainstream-as-vcs-ditch-the-rocket-science-requirements/) (Sep 2025)
- SpaceNews: [Lunar mining gold rush](https://spacenews.com/the-lunar-mining-gold-rush-is-coming-and-success-requires-bridging-two-worlds/)

---

## 6. Risks and Concerns

### Hard Risks

1. **Capex is disqualifying for pre-seed VC.** Even the "cheap" SpaceX Starship scenario costs ~$10M per ton delivered to the lunar surface. A minimal mining operation needs 20+ tons of equipment = $200M+ for transport alone, before building the equipment. This is not a pre-seed business.

2. **Timeline to revenue: 2030 at earliest, realistically 2033+.** Interlune (the furthest along) targets first delivery in 2029 — and they're building hardware. Any software company depends on hardware operators reaching the Moon first.

3. **The "confirmed" water ice might not be economically extractable.** It's in permanently shadowed craters at the lunar south pole, in unknown concentrations, mixed with regolith, at -230C. Nobody has actually extracted it yet. PRIME-1 couldn't complete its mission due to a lander malfunction.

4. **SpaceX dependency.** Every commercial lunar mission currently rides on Falcon 9 or will use Starship. One company controls access to the Moon. This is a systemic risk for the entire sector.

5. **VC exit timeline mismatch.** A 5-7 year VC exit cycle doesn't work when the technology development phase alone is 5-10 years. The SpaceNews article puts this bluntly: VCs are "backing the wrong players" — traditional mining companies with decadal patience may be better positioned.

6. **Regulatory uncertainty.** While the Artemis Accords and US law permit resource extraction, there's no binding international framework for exclusive operating zones, property rights, or environmental protection. China doesn't sign the Accords. A territorial dispute at the lunar south pole is plausible.

7. **Most space mining startups will fail.** The sector has a history of spectacular failures: Planetary Resources (founded 2010, sold for parts 2018), Deep Space Industries (founded 2013, acquired 2019 and pivoted away from mining). AstroForge has had two failed missions. ispace has crashed a lander. The technical difficulty is extreme.

### Softer Risks

8. **Helium-3 market is tiny and may shrink.** Quantum computing may move to less cryogenic-dependent architectures. Fusion is perpetually 30 years away. The total addressable market for He-3 is perhaps $50M/year.

9. **Traditional miners may dominate.** Rio Tinto already runs autonomous mining operations in the Pilbara. These companies have decades of experience in extreme-environment mining, massive balance sheets, and long time horizons. When lunar mining becomes real, BHP writing a $500M check is more likely than a startup bootstrapping the operation.

10. **Government dependency.** NASA CLPS contracts, ESA accelerator grants, and DARPA programs are the primary funding source for ISRU development. If government priorities shift (budget cuts, political change), the entire timeline slides.

---

## 7. The Software / Low-Capex Angle — Critical Assessment

This is where I need to be most honest. The question is: **Is there a venture-scale software opportunity in lunar mining that a pre-seed fund could back with €1-2M?**

### Potential Software Opportunities

| Opportunity | Who Needs It | Readiness | Competitive Moat | Verdict |
|-------------|-------------|-----------|-------------------|---------|
| **Autonomous mining operations software** | Hardware operators (Interlune, Blue Origin, NASA) | NASA's Lunar Autonomy Challenge and CADRE mission (2025-2026) are testing this. Lunar Outpost's MARS-1 "Mobile Autonomous Robotic Swarms" is under US military contract. | Low — NASA will open-source much of this. Robotics companies (Honeybee, Lunar Outpost) build their own. | Weak. The autonomy layer gets built by the hardware company or NASA. Third-party play is hard. |
| **Lunar geological mapping / prospecting software** | All operators, space agencies | Active research area. Arxiv paper (Apr 2025) on LLMs for lunar mission planning + geological datasets. M3 hyperspectral data processing (MDPI 2025). OGC Space Pilot: The Moon working on standards. | Medium — specialized knowledge of lunar geology + remote sensing. | Possible niche. But customer base is tiny (<20 organizations worldwide). |
| **Mission planning / simulation** | NASA, ESA, commercial operators | NASA already uses digital twins (XOSS platform with Cesium Moon Terrain). Bentley Systems active. Stanford won Lunar Autonomy Challenge with simulation. | Low — well-served by aerospace primes and NASA internal tools. | Weak. Dominated by established players. |
| **Mine planning / resource estimation** | Future mining operators | Space RS (Luxembourg) is doing this as consulting. Very early — no customers at operational scale exist. | Medium — mining engineering expertise + space adaptation. | Too early. No customers for 5+ years. |
| **ISRU process optimization** | Hardware operators | All done in-house currently. NASA/ESA fund research directly. | Low — process optimization is integral to hardware design. | Weak. Not separable from hardware. |
| **Lunar positioning / navigation** | All surface operators | OGC working on standards. PNT (positioning, navigation, timing) is a NASA/ESA priority. LuGRE (Lunar GNSS Receiver Experiment) on IM-2. | Medium — standards still emerging. | Possible but government-dominated. |
| **Cislunar logistics / supply chain optimization** | Future economy participants | Conceptual. No operational demand yet. | Unknown — novel domain. | Way too early. 2035+ at best. |
| **Regolith characterization / materials informatics** | ISRU developers, construction | Related to computational materials — ML models for regolith processing optimization, sintering parameters, etc. | Medium-High — specialized materials science + ML. | **Most interesting angle for Lunar VC's thesis.** Adjacent to comp materials theme. But tiny customer base currently. |

### Honest Assessment

**The software angle is thin.** Here's why:

1. **The customer base doesn't exist yet.** There are maybe 10-15 organizations worldwide doing lunar ISRU work, and most are government agencies or well-funded primes (Blue Origin, Lockheed) who build software in-house.

2. **NASA gives away most of the foundational software.** Simulation environments, terrain models, autonomy frameworks — NASA develops these and makes them available through challenges and open-source programs.

3. **The real bottleneck is hardware, not software.** Nobody is saying "we could mine the Moon if only we had better planning software." The bottleneck is getting reliable hardware to the surface and making it work at -230C for months.

4. **Any software business is deeply coupled to hardware customers.** A lunar mine planning tool is worthless without a mine. The software market can't exist independent of the hardware market, and the hardware market doesn't exist yet.

5. **The one interesting angle is materials/process simulation** — computational models for regolith processing, oxygen extraction optimization, sintering for 3D printing. This overlaps with the fund's computational materials theme. But even this is a research project today, not a business.

### What a Software Play Would Need to Look Like

If you wanted to find a software company in this space, it would need:
- **Dual-use**: Applicable to terrestrial mining/materials AND space (de-risks the "space never happens" scenario)
- **Government contract anchor**: Initial revenue from NASA/ESA/DARPA contracts
- **Small team, low burn**: Research-stage company with government grants, not burning VC capital waiting for commercial customers
- **10+ year patience**: This is not a 5-year exit play

**This does not fit the fund's pre-seed model.** The check size (€1-2M) and exit timeline expectations are misaligned with the market reality.

---

## 8. Recommendation

### For the Thesis

**Action: PASS as primary investment thesis. WATCH as adjacent signal within defense/aerospace.**

| Dimension | Assessment |
|-----------|------------|
| Market timing | Too early by 5-10 years for commercial revenue |
| Capex requirements | Disqualifying — lunar mining is a hardware business requiring $100M+ |
| Software angle | Thin — tiny customer base, government-dominated, tightly coupled to hardware |
| European pipeline | Very thin — Luxembourg has ISRU ecosystem but no investable pre-seed targets |
| Fit with fund | Poor — high capex, long timelines, no clear software/low-capex entry point |
| VC alignment | Poor — 5-7 year exit cycle doesn't match 10-15 year development cycle |

### What to Actually Watch

1. **SpaceX lunar pivot** — If Musk is serious about a lunar city, this could compress timelines and create a massive demand signal. Watch for Starship lunar landing attempts in 2026-2027.

2. **Artemis III (mid-2027)** — First crewed landing. If this slips again (likely), the entire ISRU timeline slides with it.

3. **PRIME-1 follow-up** — NASA will try again to extract water ice. Success here would be the single most important milestone for lunar mining viability.

4. **Dual-use ISRU/terrestrial startups** — Companies like Maana Electric (solar panels from sand) that have Earth-side revenue but space upside. These are investable. But Maana is Luxembourg-based and likely already beyond pre-seed.

5. **Computational materials angle** — ML models for regolith processing, sintering optimization, or materials characterization. If someone is building this as a general-purpose computational materials platform with lunar ISRU as one application, that could fit the fund.

6. **Interlune** — The most credible lunar mining company. Already too late for pre-seed (>$23M raised), but their progress is a leading indicator for the sector.

### Adjacent Themes That ARE Investable

Rather than lunar mining itself, consider these related themes where software/low-capex plays exist:

- **Autonomous robotics for extreme environments** (lunar surface operations are a use case, not the product)
- **Space mission planning/simulation tools** (if dual-use with terrestrial defense/aerospace)
- **Computational materials for advanced manufacturing** (regolith processing is one application among many)
- **Space domain awareness / cislunar tracking** (the defense angle is more investable than the mining angle)

---

## Sources Index

| # | Source | URL | Date |
|---|--------|-----|------|
| 1 | SpaceNews — Lunar helium-3 analysis | https://spacenews.com/lunar-helium-3-separating-market-from-marketing/ | May 2025 |
| 2 | SpaceNews — Lunar mining gold rush | https://spacenews.com/the-lunar-mining-gold-rush-is-coming-and-success-requires-bridging-two-worlds/ | 2025 |
| 3 | GeekWire — Interlune $5M SAFE | https://www.geekwire.com/2026/interlune-funding-moon-mining-safe/ | Jan 2026 |
| 4 | GeekWire — Interlune excavator | https://www.geekwire.com/2026/interlune-excavator-helium-3-moon-construction/ | 2026 |
| 5 | National Today — Interlune $5M | https://nationaltoday.com/us/wa/seattle/news/2026/01/29/interlune-secures-5m-to-advance-lunar-mining-for-helium-3/ | Jan 2026 |
| 6 | Forbes — Interlune moon mining | https://www.forbes.com/sites/jeremybogaisky/2025/08/29/moon-mining-heiium-interlune/ | Aug 2025 |
| 7 | TechCrunch — Karman+ $20M seed | https://techcrunch.com/2025/02/19/karman-digs-up-20m-to-build-an-asteroid-mining-autonomous-spacecraft/ | Feb 2025 |
| 8 | EU-Startups — Deep Space Energy €930K | https://www.eu-startups.com/2026/02/with-europe-seeking-greater-defence-and-space-autonomy-deep-space-energy-secures-e930k-to-advance-lunar-energy-tech/ | Feb 2026 |
| 9 | Aerospace America — 2025 ISRU advances | https://aerospaceamerica.aiaa.org/year-in-review/2025-advances-in-the-field-of-space-resources/ | 2025 |
| 10 | Reuters — SpaceX lunar pivot | https://reuters.com/science/musk-says-spacex-prioritise-building-self-growing-city-moon-2026-02-08 | Feb 2026 |
| 11 | Space.com — 2026 moon rush | https://www.space.com/astronomy/moon/moon-rush-these-private-spacecraft-will-attempt-lunar-landings-in-2026 | Jan 2026 |
| 12 | The Conversation — Moon mining rules | https://theconversation.com/the-race-to-mine-the-moon-is-on-and-it-urgently-needs-some-clear-international-rules-270943 | Dec 2025 |
| 13 | ISRU Market Report 2026 | https://www.globenewswire.com/news-release/2026/01/20/3222092/28124/en/ | Jan 2026 |
| 14 | ESA BSGN — ESRIC accelerator cohort | https://bsgn.esa.int/2025/02/11/esric-first-cohort/ | Feb 2025 |
| 15 | Luxembourg Space Agency — Legal framework | https://space-agency.public.lu/en/agency/legal-framework.html | — |
| 16 | NASA — ISRU Pilot Excavator | https://www.nasa.gov/isru-pilot-excavator/ | — |
| 17 | NASA Technical Reports — ISRU 2019-2025 | https://ntrs.nasa.gov/citations/20250003730 | 2025 |
| 18 | Space.com — Interlune harvester prototype | https://www.space.com/astronomy/moon/moon-mining-machine-interlune-unveils-helium-3-harvester-prototype-photo | 2025 |
| 19 | CIM Magazine — Mining the moon's helium | https://magazine.cim.org/en/news/2025/mining-the-moon-s-helium-en/ | 2025 |
| 20 | ArXiv — LLMs for lunar mission planning | https://arxiv.org/html/2504.20125v1 | Apr 2025 |
| 21 | NASASpaceFlight — Lunar Outpost MAPP | https://www.nasaspaceflight.com/2025/12/lunar-outpost-mapp/ | Dec 2025 |
| 22 | ArXiv — CADRE mission autonomy | https://arxiv.org/html/2502.14803v1 | Feb 2025 |
| 23 | Verified Market Reports — He-3 market | https://www.verifiedmarketreports.com/product/helium-3-market/ | — |
| 24 | Daily Galaxy — Startup plans to mine Moon | https://dailygalaxy.com/2026/01/startup-plans-mine-moon-theyre-not-alone | Jan 2026 |
| 25 | Euronews — Europe moon economy | https://www.euronews.com/next/2025/10/15/europe-wants-to-bring-industry-to-space-what-is-the-moon-economy | Oct 2025 |
