# Big Tech AI Departures Scan: Founders at Day -1

**Date:** 2026-02-11
**Analyst:** Claude (Tigerclaw)
**Type:** Signal Scan / Founder Research

## Executive Summary

A historic wave of senior AI talent is leaving big tech labs (Google DeepMind, OpenAI, Anthropic, Meta AI, xAI, Apple ML). In the last 31 days alone, we identified 15+ notable departures, with several directly relevant to our target domains: agent memory/context management, knowledge graphs, LLM infrastructure, spec-driven development, and agent orchestration. The most significant signals are:

1. **Thomas Dohmke / Entire** -- ex-GitHub CEO, launched with record $60M seed at $300M valuation. Building agent context management platform with open-source "Checkpoints" tool. **Directly relevant** to agent memory/context management.
2. **Humans&** -- $480M seed at $4.48B valuation. Founded by ex-Anthropic (Andi Peng), ex-xAI (Eric Zelikman, Yuchen He), ex-Google (Georges Harik), and Stanford (Noah Goodman). Multi-agent coordination startup. **Directly relevant** to agent orchestration.
3. **OpenAI senior exodus** -- VP Research Jerry Tworek, researcher Hitzig, model policy lead Andrea Vallone, economist Tom Cunningham all departed. Tworek explicitly left to pursue "types of research hard to do at OpenAI."
4. **xAI losing half its founding team** -- 6 of 12 co-founders have now left, including Tony Wu (reasoning team lead) and Jimmy Ba (this week). Both signaled "next chapter" -- potential startup formation.
5. **Yann LeCun / AMI Labs** -- left Meta Nov 2025, raising ~EUR500M at ~EUR3B valuation for world model startup in Paris.
6. **David Silver / Ineffable Intelligence** -- left Google DeepMind Jan 2026, founded RL-based AGI startup in London.

---

## SIGNAL 1: Thomas Dohmke / Entire

| Field | Detail |
|-------|--------|
| **Name** | Thomas Dohmke |
| **Prior role** | CEO of GitHub (Microsoft) |
| **Departure date** | August 2025 (announced); stepped down end of 2025 |
| **New company** | **Entire** |
| **Funding** | $60M seed at $300M valuation -- largest seed round ever for a developer tools startup per lead investor Felicis |
| **Lead investor** | Felicis Ventures |
| **Co-investors** | Microsoft M12, Madrona Venture Group |
| **Angel investors** | Datadog CEO Olivier Pomel, YC CEO Garry Tan, former Yahoo CEO Jerry Yang |
| **Location** | Seattle-area (GeekWire coverage) |
| **Team size** | 15 people, planning to double |
| **Announced** | February 10, 2026 |

### What Entire Is Building

Entire is building a Git-compatible platform optimized for AI-generated code workflows. The core problem: traditional Git systems capture code changes but **not the context behind AI-generated code** -- the prompts, reasoning chains, token usage, and tools AI agents used to produce it.

**First product: Checkpoints** (open-source, released on GitHub Feb 10)
- A CLI logging system that captures: AI prompts, token usage metrics, third-party tools employed by AI agents
- Currently supports: **Anthropic Claude Code** and **Google Gemini CLI**, with more agents planned
- Makes context accessible to both developers and AI agents for future reference

**Upcoming products:**
- **Semantic layer** enabling AI agents to leverage saved project data more effectively
- **Review interface** for developers to "review, approve and deploy hundreds of changes" daily

**Key quote from Dohmke:** "Just like when automotive companies replaced the traditional, craft-based production system with the moving assembly line, we must now reimagine the software development lifecycle for a world where machines are the primary producers of code."

**Key quote on token economics:** "In 2026, any leader needs to think about head count no longer just as salaries and benefits and travel and expenses, but tokens."

### Thesis Relevance

- **Agent memory/context management:** DIRECT. Entire captures and stores agent reasoning context across sessions. This is agent memory infrastructure for developer workflows.
- **Spec-driven development:** ADJACENT. Checkpoints stores what agents were told to do and how they did it -- this is contextual provenance, closely related to spec execution tracking.
- **Developer tools:** DIRECT. Built by the person who ran the world's largest developer platform.

| Field | Assessment |
|-------|------------|
| **Primitive** | Agent context provenance -- knowing what agents did, why, and how |
| **Thesis fit** | Direct (agent memory/context + developer tools) |
| **Signal strength** | **Strong** -- proven builder (ran GitHub), record seed, solves real pain point, open-source strategy |
| **Action** | **REACH_OUT** -- this is the most relevant signal in the scan. Dohmke has deep insight into where developer tools are going and is building the context management layer for agentic coding. |

**Sources:**
- [TechCrunch: Record $60M seed](https://techcrunch.com/2026/02/10/former-github-ceo-raises-record-60m-dev-tool-seed-round-at-300m-valuation/)
- [The New Stack: Interview](https://thenewstack.io/thomas-dohmke-interview-entire/)
- [Bloomberg](https://www.bloomberg.com/news/articles/2026-02-10/former-github-ceo-thomas-dohmke-raises-60-million-for-new-startup)
- [SiliconANGLE: Technical details](https://siliconangle.com/2026/02/10/entire-launches-60m-build-ai-focused-code-management-platform/)
- [GeekWire](https://www.geekwire.com/2026/former-github-ceo-launches-new-developer-platform-with-huge-60m-seed-round/)
- [Axios](https://www.axios.com/2026/02/10/former-github-ceo-ai-coding-startup)
- [Open Source For You: Checkpoints details](https://opensourceforu.com/2026/02/ai-code-transparency-platform-entire-unveiled-by-ex-github-ceo-with-60m-seed)
- [Winbuzzer: Agent transparency](https://winbuzzer.com/2026/02/10/ex-github-ceo-launches-ai-platform-record-60m-seed-xcxwbn/)

---

## SIGNAL 2: Humans& (ex-Anthropic, xAI, Google, OpenAI, Meta founders)

| Field | Detail |
|-------|--------|
| **Company** | Humans& |
| **Founded** | September 2025 |
| **Funding** | $480M seed at $4.48B valuation |
| **Lead** | SV Angel + co-founder Georges Harik |
| **Other investors** | NVIDIA, Jeff Bezos, Google Ventures, Emerson Collective |
| **Announced** | January 20, 2026 |

### Founding Team

| Name | Prior Role | Expertise |
|------|-----------|-----------|
| **Andi Peng** | Anthropic researcher | Reinforcement learning and post-training of Claude 3.5 through 4.5 |
| **Eric Zelikman** | xAI researcher | Grok-2 pretraining and RL scaling |
| **Georges Harik** | Google employee #7 | Built Google's first advertising systems, initiated Google Docs, led Android acquisition |
| **Yuchen He** | xAI/OpenAI researcher | Worked on Grok; also background at OpenAI |
| **Noah Goodman** | Stanford professor | Stints at DeepMind; AI + cognitive science |

### What They're Building

Per NYT (Jan 20): Humans& says it wants to "empower workers, not replace them." Per TechCrunch (Jan 25): Humans& thinks **"coordination is the next frontier for AI"** and they're building a model to prove it. They specialize in **multi-agent reinforcement learning**.

The thesis is that current AI tools optimize individual task completion, but the real productivity unlock comes from AI systems that coordinate with humans and other agents -- scheduling, delegating, synthesizing across workflows.

### Thesis Relevance

- **Agent orchestration / multi-agent systems:** DIRECT. Multi-agent coordination is their core thesis.
- **Agent memory/context:** ADJACENT. Coordination requires shared context and memory between agents.

| Field | Assessment |
|-------|------------|
| **Primitive** | Multi-agent coordination and human-AI collaboration |
| **Thesis fit** | Direct (agent orchestration + multi-agent systems) |
| **Signal strength** | **Strong** -- dream team from every major AI lab, massive funding, NVIDIA + Bezos backing |
| **Action** | **WATCH** -- too expensive ($4.48B valuation at seed) for early-stage VC entry. Monitor product launch and whether coordination models actually outperform single-agent approaches. |

**Sources:**
- [NYT: Humans& launch](https://www.nytimes.com/2026/01/20/technology/humans-ai-anthropic-xai.html)
- [Reuters: $480M raise](https://www.reuters.com/business/ai-startup-humans-raises-480-million-45-billion-valuation-seed-round-2026-01-20/)
- [TechCrunch: Coordination thesis](https://techcrunch.com/2026/01/25/humans-thinks-coordination-is-the-next-frontier-for-ai-and-theyre-building-a-model-to-prove-it/)
- [Yahoo Finance: Founder details](https://finance.yahoo.com/news/humans-human-centric-ai-startup-160057256.html)
- [Crunchbase](https://news.crunchbase.com/ai/humans-raises-huge-seed-round-unicorn-valuation/)

---

## SIGNAL 3: OpenAI Senior Exodus

OpenAI is bleeding senior talent as CEO Sam Altman redirects resources toward ChatGPT at the expense of long-term research. Key departures in the last 60 days:

### Jerry Tworek -- VP of Research

| Field | Detail |
|-------|--------|
| **Prior role** | VP of Research, OpenAI (7 years) |
| **Departure** | January 5, 2026 |
| **Expertise** | Led OpenAI's reasoning efforts (o1, o3 models), Codex |
| **Stated reason** | Wants to explore "types of research that are hard to do at OpenAI" |
| **What's next** | Unknown -- explicitly stated he wants to pursue "risky fundamental research" that commercialized labs deprioritize |
| **Key quote** | Called Google's AI comeback "OpenAI's fumble" |

**Thesis relevance:** Tworek led reasoning model development (o1, o3) and Codex -- deeply relevant to agentic coding infrastructure. If he starts a company, it will likely be in reasoning/agent architecture space.

**Signal strength:** **Strong** -- 7 years at OpenAI, led their most important product line, explicitly signaling desire for something new.

**Action:** **WATCH closely** -- if Tworek announces a startup, it could be category-defining.

**Sources:**
- [Core Memory podcast: EP 53 Jerry Tworek](https://www.corememory.com/p/he-left-openai-jerry-tworek)
- [Winbuzzer: Google caught up because OpenAI stumbled](https://winbuzzer.com/2026/01/23/ex-openai-researcher-google-caught-up-because-openai-stumbled-xcxwbn/)
- [Irish Times](https://www.irishtimes.com/business/2026/02/03/openais-chatgpt-push-triggers-senior-staff-exits/)
- [American Bazaar](https://americanbazaaronline.com/2026/02/06/openai-sees-wave-of-senior-exits-following-chatgpt-push-474654/)
- [FT: ChatGPT push triggers exits](https://www.ft.com/content/e581b7a4-455c-48e6-a87c-c39bb9c62a12)

### Hitzig -- Researcher (Resigned Feb 11, 2026)

| Field | Detail |
|-------|--------|
| **Prior role** | Researcher, OpenAI (2 years) |
| **Departure** | February 11, 2026 (today) |
| **Stated reason** | Published NYT op-ed: "Putting Ads on ChatGPT Was the Last Straw" |
| **Expertise** | Helped shape how AI systems are deployed and governed |
| **What's next** | Unknown |

**Source:** [NYT: I Left My Job at OpenAI](https://www.nytimes.com/2026/02/11/opinion/openai-ads-chatgpt.html)

### Andrea Vallone -- Model Policy Lead

| Field | Detail |
|-------|--------|
| **Prior role** | Model policy lead, OpenAI |
| **Departure** | January 2026 |
| **Joined** | Anthropic |

**Source:** [Technobezz](https://www.technobezz.com/news/openai-shifts-resources-to-chatgpt-prompting-senior-staff-de-2026-02-04-0hdk)

### Tom Cunningham -- Economist

| Field | Detail |
|-------|--------|
| **Prior role** | Economist, OpenAI |
| **Departure** | Late 2025 |
| **Stated reason** | Part of broader research deprioritization |

**Source:** [Technobezz](https://www.technobezz.com/news/openai-shifts-resources-to-chatgpt-prompting-senior-staff-de-2026-02-04-0hdk)

### Context: Thinking Machines Lab Reverse-Flow

Notably, OpenAI is also hiring *back* talent: Two Thinking Machines Lab (Mira Murati's $12B+ startup) co-founders are **leaving to rejoin OpenAI**, along with Sam Schoenholz. This suggests OpenAI is backfilling departures with experienced returnees.

**Source:** [WIRED: Thinking Machines cofounders return to OpenAI](https://www.wired.com/story/thinking-machines-lab-cofounders-leave-for-openai/)

---

## SIGNAL 4: xAI Founding Team Collapse (6 of 12 departed)

Half of Elon Musk's xAI founding team has now left. The latest two departed this week:

### Yuhuai "Tony" Wu

| Field | Detail |
|-------|--------|
| **Prior role** | Co-founder, xAI; led reasoning team |
| **Departure** | February 10, 2026 |
| **Key quote** | "It's time for my next chapter. It is an era with full possibilities: a small team armed with AIs can move mountains." |
| **Expertise** | Reasoning, reinforcement learning, mathematical AI |
| **What's next** | Unknown -- "small team armed with AIs" strongly signals startup formation |

### Jimmy Ba

| Field | Detail |
|-------|--------|
| **Prior role** | Co-founder, xAI |
| **Departure** | February 11, 2026 |
| **Expertise** | Deep learning research; co-author of the foundational Adam optimizer paper and Layer Normalization |
| **What's next** | Unknown |

### Other xAI Departures (Earlier)

| Name | Departed | What's Next |
|------|----------|-------------|
| Igor Babuschkin | August 2025 | Created a venture firm |
| Greg Yang | January 2026 | Health reasons |
| Kyle Kosic | 2024 | First co-founder to leave |
| One additional unnamed | Various | Unknown |

**Thesis relevance:** Tony Wu's expertise in reasoning is directly relevant to agentic AI infrastructure. His "small team + AI" quote signals he may build something in the agentic coding/dev tools space. Jimmy Ba's foundational ML research (Adam optimizer, LayerNorm) means any startup he founds will have deep technical credibility.

**Signal strength:** **Strong** for Tony Wu (explicit "next chapter" signal + reasoning expertise). **Medium** for Jimmy Ba (departure confirmed but no direction signaled).

**Action:** **WATCH** -- monitor both for startup announcements in the next 30-60 days.

**Sources:**
- [TechCrunch: Half of xAI founding team left](https://techcrunch.com/2026/02/10/nearly-half-of-xais-founding-team-has-now-left-the-company/)
- [Bloomberg: Tony Wu departure](https://www.bloomberg.com/news/articles/2026-02-10/tony-wu-becomes-latest-xai-co-founder-to-leave-musk-s-startup)
- [CNBC: Tony Wu](https://www.cnbc.com/2026/02/10/elon-musk-xai-co-founder-tony-wu.html)
- [Business Insider: Jimmy Ba](https://www.businessinsider.com/elon-musk-xai-loses-second-cofounder-jimmy-ba-2026-2)
- [India Today: xAI exodus](https://www.indiatoday.in/technology/news/story/elon-musk-loses-half-his-xai-founding-team-researcher-who-resigned-in-few-weeks-says-ai-work-is-boring-2866378-2026-02-11)

---

## SIGNAL 5: Yann LeCun / AMI Labs

| Field | Detail |
|-------|--------|
| **Name** | Yann LeCun |
| **Prior role** | Chief AI Scientist, Meta (12 years) |
| **Departure** | November 19, 2025 |
| **New company** | **AMI Labs** (Advanced Machine Intelligence) |
| **Location** | Paris |
| **CEO** | Alex LeBrun |
| **Funding** | $120M raised; seeking ~EUR500M at ~EUR3B (~$3.5B) valuation |
| **Potential investors** | Cathay Innovation, Hiro Capital |
| **Team** | Poaching from Meta and Google DeepMind (per Sifted) |

### What AMI Labs Is Building

AMI Labs is building **"world models"** -- AI systems that understand the physical world, demonstrate persistent memory, recognize spatial dimensions, and anticipate outcomes of actions. This is a fundamentally different approach from LLMs.

- **First product: Marble** -- generates physically sound 3D worlds
- **Target verticals:** Healthcare (partnership with Nabla announced), wearables, robotics, manufacturing
- **Key thesis:** LLMs alone will not lead to AGI. World models that learn from experience (not just text) are necessary.

**LeCun's stated reason for leaving Meta:** "I left because the current AI industry is driving a $2.5 trillion train toward a brick wall" -- believes the entire industry's LLM-only approach is a dead end.

### Thesis Relevance

- **Agent memory/context:** ADJACENT. World models inherently require persistent state and memory -- they must remember the state of the world.
- **Knowledge graphs:** ADJACENT. World models are, in some sense, dynamic knowledge graphs of physical reality.

**Signal strength:** **Strong** -- Turing Award winner, massive fundraise, contrarian thesis with growing support.

**Action:** **WATCH** -- valuation too high for entry, but thesis is important to track. If world models prove out, it reshapes the entire agent memory/context landscape.

**Sources:**
- [WIRED: LeCun-linked startup](https://www.wired.com/story/logical-intelligence-yann-lecun-startup-chart-new-course-agi/)
- [Forbes: AMI Labs healthcare focus](https://www.forbes.com/sites/amyfeldman/2026/01/21/why-yann-lecuns-hot-new-ai-startup-is-targeting-healthcare/)
- [Wikipedia: Yann LeCun](https://en.wikipedia.org/wiki/Yann_LeCun)
- [Bloomberg: Cathay/Hiro investor interest](https://www.bloomberg.com/news/articles/2026-01-19/yann-lecun-s-ami-labs-draws-investor-interest-from-cathay-hiro)
- [Sifted: Leaked pitch deck](https://sifted.eu/articles/pitch-deck-yann-lecun-ami-labs)
- [Sifted: Team poaching from Meta/DeepMind](https://sifted.eu/articles/yann-lecun-ami-labs-team-meta)
- [Digitimes: EUR3B valuation](https://www.digitimes.com/news/a20260122PD204/ai-startup-europe-technology-2025.html)
- [LetsdataScience: AMI Labs launch](https://www.letsdatascience.com/news/yann-lecun-launches-ami-labs-for-open-source-world-models-bd68309e)

---

## SIGNAL 6: David Silver / Ineffable Intelligence

| Field | Detail |
|-------|--------|
| **Name** | David Silver |
| **Prior role** | VP of Reinforcement Learning, Google DeepMind |
| **Departure** | January 2026 |
| **New company** | **Ineffable Intelligence** |
| **Location** | London |
| **Founded** | November 2025 (registered) |
| **Funding** | Actively recruiting and seeking VC (per ainvest.com, $3B+ capital flow signal) |

### What Ineffable Intelligence Is Building

Silver was one of DeepMind's first employees and the lead researcher behind AlphaGo, AlphaZero, and MuZero. Ineffable Intelligence will build agents that explore simulated or physical environments autonomously, using reinforcement learning rather than LLM-based approaches.

Silver's preprint with Richard Sutton declares the coming "era of experience" -- agents that learn by doing, not by reading text.

**Key thesis:** LLMs alone won't reach superintelligence. RL-based agents that learn through experience are the path.

### Thesis Relevance

- **Agent orchestration:** ADJACENT. RL agents that explore environments are a form of agent orchestration.
- **Agent memory:** ADJACENT. Experience-based learning requires robust state/memory management.

**Signal strength:** **Strong** -- one of the most accomplished RL researchers alive, leaving the world's top AI lab.

**Action:** **WATCH** -- pre-funding. Monitor for Series A announcement.

**Sources:**
- [Fortune: Silver launches Ineffable Intelligence](https://fortune.com/2026/01/30/google-deepmind-ai-researcher-david-silver-leaves-to-found-ai-startup-ineffable-intelligence/)
- [The Decoder: Silver departs DeepMind](https://the-decoder.com/google-deepmind-pioneer-david-silver-departs-to-found-ai-startup-betting-llms-alone-wont-reach-superintelligence/)
- [ainvest: $3B+ capital flow signal](https://www.ainvest.com/news/david-silver-startup-3b-capital-flow-signal-2602/)

---

## SIGNAL 7: Mrinank Sharma -- Anthropic Safety Lead Resignation

| Field | Detail |
|-------|--------|
| **Name** | Mrinank Sharma |
| **Prior role** | Head of Safeguards Research Team, Anthropic |
| **Departure** | February 9, 2026 (4 days after Claude Opus 4.6 launch) |
| **Stated reason** | Cryptic public letter: "The world is in peril." Cited inability to align personal integrity with organizational direction. |
| **What's next** | Says he wants to study poetry and pursue a degree -- does NOT appear to be forming a startup |

### Significance

While Sharma is not starting a company, his departure is a **canary signal** for Anthropic's internal tensions between safety research and commercial deployment pressure. This is the second high-profile safety departure from a major lab in recent months.

**Thesis relevance:** TANGENTIAL -- not a startup signal, but important context for the competitive landscape. Safety talent departures from frontier labs may eventually produce founders building "safety-as-infrastructure" companies.

**Signal strength:** **Weak** as a founder signal; **Strong** as a market signal about Anthropic's internal dynamics.

**Sources:**
- [Business Insider: Exit letter](https://www.businessinsider.com/read-exit-letter-by-an-anthropic-ai-safety-leader-2026-2)
- [Futurism](https://futurism.com/artificial-intelligence/anthropic-researcher-quits-cryptic-letter)
- [NDTV](https://www.ndtv.com/feature/anthropics-head-of-ai-safety-quits-warns-of-world-in-peril-in-cryptic-resignation-letter-10979921)

---

## SIGNAL 8: Apple ML/AI Talent Exodus

Apple lost at least 4 AI researchers + a senior Siri executive in late January 2026:

| Name | Prior Role | Went To |
|------|-----------|---------|
| **Yinfei Yang** | AI researcher, Apple | **Left to start a new company** (unannounced) |
| **Haoxuan You** | AI researcher, Apple | Meta Superintelligence research arm |
| **Bailin Wang** | AI researcher, Apple | Meta recommendations team |
| **Zirui Wang** | AI researcher, Apple | Google DeepMind |
| **Stuart Bowers** | Senior Siri executive | Google DeepMind |

### Key Signal: Yinfei Yang Starting a Company

Yang's departure to start a new company is the most relevant signal here. His Apple background in AI/ML research and the timing (amid Apple's AI talent crisis) suggests he may be building something in the agent/LLM infrastructure space. **No details on the company have been announced yet.**

**Signal strength:** **Medium** -- confirmed startup formation, but zero details on what's being built.

**Action:** **WATCH** -- monitor for Yang's company announcement. Apple ML researcher starting a company amid the agentic AI wave is worth tracking.

**Sources:**
- [Bloomberg: Apple AI talent exodus](https://www.bloomberg.com/news/articles/2026-01-30/apple-loses-more-ai-researchers-and-a-siri-executive-in-latest-departures)
- [9to5Mac](https://9to5mac.com/2026/01/30/apple-loses-more-ai-researchers-siri-exec-to-google-and-meta/)
- [MacDailyNews](https://macdailynews.com/2026/01/30/latest-blow-to-apple-four-ai-researchers-top-siri-leader-depart/)

---

## SIGNAL 9: Robert Playter -- Boston Dynamics CEO Resignation

| Field | Detail |
|-------|--------|
| **Name** | Robert Playter |
| **Prior role** | CEO, Boston Dynamics (6 years as CEO, 30+ years at company) |
| **Departure** | February 27, 2026 (announced Feb 10) |
| **What's next** | Plans to retire (per company statement) |

**Thesis relevance:** TANGENTIAL. Robotics/embodied AI is adjacent to agent orchestration but Playter appears to be retiring, not founding. Monitor in case "retirement" turns into a startup.

**Sources:**
- [TechCrunch: Playter steps down](https://techcrunch.com/2026/02/10/boston-dynamics-ceo-robert-playter-steps-down-after-30-years-at-the-company/)
- [The Robot Report](https://www.therobotreport.com/boston-dynamics-ceo-robert-playter-steps-down/)

---

## Summary Table: All Signals Ranked by Relevance

| # | Person/Company | From | Signal Type | Thesis Fit | Strength | Action |
|---|---------------|------|-------------|------------|----------|--------|
| 1 | Thomas Dohmke / Entire | GitHub (Microsoft) | New startup launched | Direct (context mgmt + dev tools) | **Strong** | REACH_OUT |
| 2 | Humans& (Peng, Zelikman, Harik, He, Goodman) | Anthropic, xAI, Google, OpenAI | New startup launched | Direct (multi-agent orchestration) | **Strong** | WATCH |
| 3 | Jerry Tworek | OpenAI (VP Research) | Departed, no company yet | Adjacent (reasoning/agentic) | **Strong** | WATCH |
| 4 | Tony Wu | xAI (co-founder, reasoning lead) | Departed, signals startup | Adjacent (reasoning/agentic) | **Strong** | WATCH |
| 5 | Jimmy Ba | xAI (co-founder) | Departed | Adjacent (foundational ML) | **Medium** | WATCH |
| 6 | Yann LeCun / AMI Labs | Meta (Chief AI Scientist) | New startup launched | Adjacent (world models + memory) | **Strong** | WATCH |
| 7 | David Silver / Ineffable Intelligence | Google DeepMind (VP RL) | New startup launched | Adjacent (RL agents) | **Strong** | WATCH |
| 8 | Yinfei Yang | Apple AI | Starting new company | Unknown (TBD) | **Medium** | WATCH |
| 9 | Mrinank Sharma | Anthropic (Safety Lead) | Departed | Tangential (safety signal) | **Weak** (founder) | PASS |
| 10 | Hitzig | OpenAI (Researcher) | Departed today | Tangential (AI governance) | **Weak** (founder) | PASS |
| 11 | Andrea Vallone | OpenAI -> Anthropic | Lateral move | N/A | N/A | PASS |
| 12 | Robert Playter | Boston Dynamics (CEO) | Retiring | Tangential (robotics) | **Weak** | PASS |

---

## Cross-Reference with Existing Memory/Context Landscape

Connecting these departures to the research in `2026-02-11-context-memory-spec-driven-agentic-founders.md`:

1. **Entire (Dohmke) vs. Letta vs. Mem0:** Entire's Checkpoints captures agent *reasoning context* (prompts, tools, token usage). This is complementary to, not competitive with, Letta (memory management for agent state) and Mem0 (cross-app memory for LLM applications). Entire focuses on developer workflow context; Letta/Mem0 focus on agent runtime memory. Could see partnerships or eventual convergence.

2. **Humans& vs. Composio vs. Smithery:** Humans& is building coordination models (the intelligence layer), while Composio provides tool integrations and Smithery provides the MCP marketplace. These are different layers of the agent orchestration stack and likely complementary.

3. **Spec-driven development context:** Entire's Checkpoints + Tessl's spec framework could form a powerful stack: specs define *what* agents should build (Tessl), and Checkpoints records *how* they actually built it (Entire). The spec-execution gap is a real problem.

---

## Macro Observations

### 1. The Great Unbundling of AI Labs

Every major AI lab is losing senior talent to startups. The pattern: researchers who built foundational capabilities inside labs are now building companies around specific applications of those capabilities. This is analogous to the Google/Facebook engineer exodus of 2010-2015 that created the modern SaaS landscape.

### 2. Three Philosophical Camps Emerging

- **LLM-only camp** (OpenAI, Anthropic) -- believes scaling language models is sufficient
- **RL/experience camp** (Silver, LeCun) -- believes agents need to learn from experience, not just text
- **Coordination camp** (Humans&) -- believes the bottleneck is not intelligence but coordination between agents and humans

Each camp will produce different infrastructure needs, creating distinct investment opportunities.

### 3. The "Agent Context" Stack is Forming

From bottom to top:
1. **Model layer:** Foundation models (OpenAI, Anthropic, Google)
2. **Memory layer:** Persistent agent state (Mem0, Letta, Zep)
3. **Context provenance layer:** What agents did and why (Entire/Checkpoints)
4. **Coordination layer:** Multi-agent orchestration (Humans&)
5. **Specification layer:** What agents should do (Tessl, GitHub Spec Kit)
6. **Tool layer:** What agents can connect to (Composio, Smithery)

The most interesting investment opportunities are at layers 2, 3, and 5 -- where the infrastructure is least mature and the demand is growing fastest.

---

## Risks & Open Questions

1. **Valuation compression risk:** Humans& at $4.48B and AMI Labs at ~$3.5B are pre-revenue seed valuations. If the AI funding bubble deflates, these become cautionary tales.
2. **Will Tworek and Wu actually start companies?** Both signaled interest in independent work, but neither has announced anything concrete. They could join existing startups, return to labs, or pursue academic research.
3. **OpenAI's backfill strategy:** OpenAI is hiring Thinking Machines Lab cofounders to replace departures. If this pattern continues, departures may not weaken OpenAI as much as they signal.
4. **Apple's wild card:** Yinfei Yang starting a company from Apple ML is interesting but we have zero visibility into what he's building. Could be anything from computer vision to language models to agent infrastructure.
5. **European hub forming:** Both LeCun (Paris) and Silver (London) are building in Europe. This could accelerate the European AI startup ecosystem -- or face talent gravity pulling toward SF.

---

## Sources Index

All sources cited inline. Key publications referenced:
- TechCrunch, Bloomberg, CNBC, Fortune, WIRED, NYT, Reuters, Axios
- The New Stack, SiliconANGLE, GeekWire, Winbuzzer
- Business Insider, India Today, Times of India
- Sifted (EU tech), The Decoder (AI)
