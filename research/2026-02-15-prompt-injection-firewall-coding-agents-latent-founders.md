# Latent Founder Scan: Prompt Injection Firewall for Autonomous Coding Agents

**Date:** 2026-02-15
**Analyst:** Claude (Tigerclaw)
**Type:** Signal Scan + Market Map

## Executive Summary

Prompt injection is the #1 LLM security risk (OWASP 2025). A wave of M&A validates the space: Prompt Security acquired by SentinelOne ($250M, Aug 2025), Lakera by Check Point (Sep 2025), Cyata by Check Point ($150M, 2026), ProtectAI by Palo Alto Networks. Yet a critical gap persists: **no one is building a dedicated prompt injection firewall specifically for autonomous coding agents** (Claude Code, Copilot, Cursor, Devin). Coding agents have a unique attack surface -- file system access, shell execution, code generation, MCP tool use -- and existing general-purpose LLM firewalls don't adequately cover it. Research shows **85%+ attack success rates against state-of-the-art defenses** when adaptive attacks are employed (Maloyan et al., Jan 2026).

We identified **20+ individuals** across academic, builder, social, and media channels showing pre-founder signals in this domain. Seven are recommended for outreach.

## Key Findings

### Market Context

| Company | Status | Signal |
|---------|--------|--------|
| Prompt Security | Acquired by SentinelOne, $250M (Aug 2025) | General LLM security, not coding-agent-specific |
| Lakera | Acquired by Check Point (Sep 2025) | LLM guardrails, Gandalf CTF |
| Cyata | Acquired by Check Point, $150M (2026) | Agentic identity, MCP vuln research |
| ProtectAI | Acquired by Palo Alto Networks (2025) | Rebuff, LLM-Guard open source |
| Aurascape AI | $62.8M from stealth (Apr 2025) | AI-native security platform, RSAC Innovation Sandbox |
| E2B | $35M total (Series A $21M, Jul 2025) | Sandboxed cloud runtime for AI agents |
| Straiker | Funded (undisclosed) | AI-native security for agentic systems |
| Lasso Security | Funded (undisclosed) | First open-source MCP security gateway |
| Pillar Security | $9M seed (2024) | AI security platform, prompt injection defense, Israel |
| Knostic | $11M (2024) | Need-to-know LLM access controls, coding assistant governance |
| Aikido Security | EUR24M | Developer-first security, discovered PromptPwnd |
| Meta (LlamaFirewall) | Open source (May 2025) | 90%+ efficacy on AgentDojo benchmark |
| NVIDIA (garak) | Open source | LLM vulnerability scanner |

**Thesis gap:** The acquired companies were all **general-purpose LLM security**. None were specifically solving for the coding agent attack surface (shell access, file system manipulation, code execution, MCP tool orchestration). The 85%+ bypass rate against current defenses (Maloyan meta-analysis of 78 studies) confirms the opportunity.

### Competitive Landscape for Coding-Agent-Specific Security

| Layer | Players | Gap |
|-------|---------|-----|
| **Sandbox/isolation** | E2B, Docker Sandboxes, Blaxel, Runloop | Container-level, not prompt-level |
| **General LLM firewall** | Aurascape, Straiker, WitnessAI, Securiti | Broad scope, not coding-agent-aware |
| **MCP security** | Lasso Security, Cyata (acquired), Cisco A2A Scanner | Protocol-level, narrow |
| **Prompt injection detection** | LlamaFirewall, Rebuff (acquired), vigil-llm | Generic detection, not coding-context-aware |
| **Coding-agent-specific firewall** | **Nobody** | **THE GAP** |

---

## Latent Founder Signals

### Tier 1: REACH_OUT (5 signals)

#### 1. Johann Rehberger
- **Affiliation:** Electronic Arts (Red Team Director), Independent Researcher
- **Location:** Likely US/Europe
- **Signal Strength:** Strong
- **Work:** Created "AgentHopper" (proof-of-concept AI worm). Ran "Month of AI Bugs" (Aug 2025) -- one vulnerability disclosure per day targeting OpenAI Atlas, Claude, Copilot. Discovered SpAIware (persistent prompt injection via LLM memory). Presented at Black Hat 2025, 39C3 on hijacking AI coding assistants. Contributed to MITRE ATT&CK framework.
- **Why interesting:** Independent researcher with deep offensive expertise, prolific disclosure record, not tied to a single institution. Building pattern suggests transition from red-teaming to defensive tooling. The best security products are built by attackers who understand the offense.
- **Inflection indicators:** Independent researcher status, conference circuit, media presence, blog (embracethered.com), book author
- **Thesis fit:** Direct -- deep expertise in coding assistant prompt injection
- **Action:** REACH_OUT -- explore whether he's considering a defensive product/company
- **Sources:**
  - [embracethered.com](https://embracethered.com)
  - [Simon Willison: The Summer of Johann](https://simonwillison.net/2025/Aug/15/the-summer-of-johann/)
  - [39C3 Talk: Hijacking AI Coding Assistants](https://www.heise.de/en/news/39C3-Security-researcher-hijacks-AI-coding-assistants-with-prompt-injection-11125687.html)
  - Twitter: [@wunderwuzzi23](https://twitter.com/wunderwuzzi23)

#### 2. Luca Beurer-Kellner
- **Affiliation:** ETH Zurich, SRI Lab (PhD student)
- **Location:** Zurich, Switzerland
- **Signal Strength:** Strong
- **Work:** Co-author of "Design Patterns for Securing LLM Agents against Prompt Injections" (2025). Co-created AgentDojo benchmark. Discovered critical MCP vulnerabilities in Claude/GitHub integration (Jan 2026). Collaborations with Anthropic, Google DeepMind, OpenAI.
- **Why interesting:** PhD student with multiple high-impact papers AND practical tool building (AgentDojo). The MCP vulnerability discovery shows offensive skills. Industry collaborations suggest commercial awareness. PhD students are the classic latent founder profile.
- **Inflection indicators:** Multiple 2025-2026 papers, MCP vuln discovery, AgentDojo adoption by UK/US AISI, industry collaborations
- **Thesis fit:** Direct -- building security frameworks for LLM agents
- **Action:** REACH_OUT -- monitor for PhD completion timeline, spinout signals
- **Sources:**
  - [ETH SRI Lab profile](https://www.sri.inf.ethz.ch/people/luca)
  - [Design Patterns paper](https://arxiv.org/abs/2506.08837)
  - [AgentDojo (GitHub)](https://github.com/ethz-spylab/agentdojo)
  - [Simon Willison coverage](https://simonwillison.net/2025/Jun/13/prompt-injection-design-patterns/)

#### 3. Yupei Liu
- **Affiliation:** Duke University (PhD student, advised by Neil Zhenqiang Gong)
- **Location:** Durham, NC
- **Signal Strength:** Strong
- **Work:** Created DataSentinel -- game-theoretic prompt injection detection system (IEEE S&P 2025, top-tier venue). Also built SecInfer (inference-time scaling defenses). Created Open-Prompt-Injection benchmark. Collaboration with Dawn Song (Berkeley).
- **Why interesting:** Published at IEEE S&P (the gold standard for security research). Novel game-theoretic approach distinguishes from heuristic-based detectors. Has open-source tool (Open-Prompt-Injection). Working with Dawn Song, who has a track record of spinning out security companies.
- **Inflection indicators:** Top-tier venue publication, open-source tools, Berkeley/Duke network, multiple defense papers
- **Thesis fit:** Direct -- novel detection approach for prompt injection
- **Action:** REACH_OUT -- PhD student building novel defenses, Dawn Song collaboration pattern
- **Sources:**
  - [DataSentinel (arXiv)](https://arxiv.org/abs/2504.11358)
  - [Open-Prompt-Injection (GitHub)](https://github.com/liu00222/Open-Prompt-Injection)
  - [USENIX Security 2024 paper](https://www.usenix.org/conference/usenixsecurity24/presentation/liu-yupei)

#### 4. Zimo Ji
- **Affiliation:** Hong Kong University of Science and Technology (PhD student, supervised by Prof. Shuai Wang)
- **Location:** Hong Kong
- **Signal Strength:** Strong
- **Work:** Published comprehensive taxonomy of IPI defense frameworks (Nov 2025). Building mandatory access control (MAC) for LLM agents (Jan 2026) -- a novel approach treating agent privilege escalation like OS-level security.
- **Why interesting:** The MAC approach is architecturally novel -- applying OS security primitives to LLM agent permissions. Multiple rapid-fire publications suggest deep engagement. MAC for agents could be the kernel of a product.
- **Inflection indicators:** Two papers in 2 months, novel MAC approach, builder pattern
- **Thesis fit:** Direct -- agent defense frameworks with novel architecture
- **Action:** REACH_OUT -- novel defensive architecture, rapid publication pace
- **Sources:**
  - [Defense Framework Taxonomy (arXiv)](https://arxiv.org/abs/2511.15203)
  - [MAC for LLM Agents (arXiv)](https://arxiv.org/abs/2601.11893)

#### 5. Ankur Shah / Straiker
- **Affiliation:** Straiker (Co-founder & CEO)
- **Location:** Bay Area (inferred)
- **Signal Strength:** Strong
- **Work:** Founded Straiker, AI-native security company focused on agentic AI. Products include: Ascend AI (red teaming), Defend AI (runtime security), Agentic Browser Guardrails, MCP Security. Multiple podcast appearances. Serial founder with cybersecurity background (mobile, SaaS, cloud, CASB).
- **Why interesting:** Already building in the exact thesis space. Serial founder pattern. Active go-to-market. Product covers MCP security and agentic guardrails specifically.
- **Inflection indicators:** Active product, media circuit, serial founder, MCP security focus
- **Thesis fit:** Direct -- existing startup in-thesis
- **Action:** REACH_OUT -- determine funding status, stage, and whether taking investment
- **Sources:**
  - [Straiker website](https://www.straiker.ai)
  - [LinkedIn](https://www.linkedin.com/in/ankur-shah-aisec/)
  - [NDK Cyber podcast](https://www.ndkcyber.com/building-security-at-the-speed-of-innovation-wit-ankur-shah)
  - [Cloud Security Podcast](https://www.cloudsecuritypodcast.tv/videos/cybersecurity-for-ai-the-new-threat-landscape-how-do-we-secure-it)

#### 6. Dor Sarig + Ziv Karliner / Pillar Security
- **Affiliation:** Pillar Security (Co-founders)
- **Location:** Israel
- **Signal Strength:** Strong
- **Work:** Co-founded Pillar Security with $9M seed funding. Dor Sarig (CEO): 10+ years cybersecurity, Fortune 500 product development, ex-Israel Ministry of Defense, Perimeter81, Cymulate. Ziv Karliner (CTO): 10+ years cybersecurity research, ex-Israeli intelligence, IBM Trusteer, Aqua Security. Published detailed research on indirect prompt injection anatomy. Red team-blue team approach.
- **Why interesting:** Already funded, direct thesis fit, strong Israel cybersecurity pedigree. Published research on indirect prompt injection specifically. Red team heritage suggests strong offensive understanding.
- **Thesis fit:** Direct -- AI security platform focused on prompt injection defense
- **Action:** REACH_OUT -- determine stage, traction, and whether open to follow-on investment
- **Sources:**
  - [Pillar Security](https://www.pillar.security)
  - [Anatomy of Indirect Prompt Injection](https://www.pillar.security/blog/anatomy-of-an-indirect-prompt-injection)
  - [Calcalist coverage](https://www.calcalistech.com/ctechnews/article/hklv8g6cje)

#### 7. Utku Sen
- **Affiliation:** Independent (London, UK)
- **Location:** London, UK
- **Signal Strength:** Medium
- **Work:** Built promptmap and promptmap2 -- first automated prompt injection vulnerability scanners for LLM applications. Supports ChatGPT, Claude, and open source models. Published "Securing GPT" book. Presented at Black Hat Europe 2023, DEF CON Demo Labs (5 times). Previously built ransomware honeypot projects (Forbes, Business Insider). Completely rewrote promptmap in 2025.
- **Why interesting:** Independent builder with proven security tool track record. Completely rewrote his tool in 2025 suggesting active development. DEF CON/Black Hat presence. Book author. Could be looking to commercialize.
- **Thesis fit:** Direct -- automated prompt injection scanning
- **Action:** REACH_OUT -- indie builder with strong product signal, may be looking to commercialize
- **Sources:**
  - [GitHub](https://github.com/utkusen/promptmap)
  - [Twitter](https://x.com/utkusen_en)
  - [LinkedIn](https://www.linkedin.com/in/utkusn)

### Tier 2: WATCH (8 signals)

#### 6. Edoardo Debenedetti
- **Affiliation:** ETH Zurich (PhD student, advised by Florian Tramer)
- **Location:** Zurich / Bay Area
- **Work:** Co-created AgentDojo (leading benchmark, used by UK/US AISI). Co-authored CaMeL defense ("Defeating Prompt Injections by Design", 2025). Collaborations with Google DeepMind, Anthropic, OpenAI.
- **Thesis fit:** Direct
- **Signal strength:** Strong (academic), medium (commercialization probability)
- **Action:** WATCH -- AgentDojo could become a commercial testing platform; monitor for spinout
- **Sources:** [edoardo.science](https://edoardo.science), [AgentDojo (GitHub)](https://github.com/ethz-spylab/agentdojo), [CaMeL paper](https://arxiv.org/abs/2503.18813)

#### 7. Chaowei Xiao
- **Affiliation:** Johns Hopkins University / NVIDIA
- **Location:** Bay Area / Baltimore
- **Work:** Assistant Professor. AI2050 Fellow (Schmidt Sciences). Published AgentDyn benchmark (Feb 2026). Focus on secure and safe AI agents. Talk: "Towards Secure and Safe AI Agents: From Model to System" (Nov 2025).
- **Thesis fit:** Direct
- **Signal strength:** Medium -- strong expertise, but established professor less likely to found
- **Action:** WATCH -- potential technical advisor or co-founder source; students could spin out
- **Sources:** [Personal site](https://xiaocw11.github.io/), [AI2050 profile](https://ai2050.schmidtsciences.org/fellow/chaowei-xiao/), [AgentDyn](https://arxiv.org/abs/2602.03117)

#### 8. Yue Liu
- **Affiliation:** Singapore Management University
- **Location:** Singapore
- **Work:** First author of "Your AI, My Shell" (Sep 2025) -- first systematic study of prompt injection in coding editors (Copilot, Cursor). Built AIShellJack framework (314 attack payloads, 70 MITRE ATT&CK techniques). 84% attack success rate demonstrated.
- **Thesis fit:** Direct -- coding editor specific
- **Signal strength:** Medium
- **Action:** WATCH -- deep domain expertise in exactly the coding editor attack surface
- **Sources:** [Paper (arXiv)](https://arxiv.org/abs/2509.22040)

#### 9. Lior Ziv / Lasso Security
- **Affiliation:** Lasso Security (CTO & Co-founder)
- **Location:** Unknown
- **Work:** Released first open-source security gateway for MCP. Built claude-hooks (prompt injection defenses for Claude Code). 345+ GitHub stars on mcp-gateway.
- **Thesis fit:** Direct
- **Signal strength:** Medium -- early product with commercial intent
- **Action:** WATCH -- monitor traction, funding announcements
- **Sources:** [Lasso Security](https://www.lasso.security), [MCP Gateway (GitHub)](https://github.com/lasso-security/mcp-gateway)

#### 10. Rajeev Ravi
- **Affiliation:** Farnell Global (Senior Software Engineer)
- **Location:** Unknown
- **Work:** Presented at MCP Developers Summit on securing AI coding assistants from data poisoning and prompt injection using MCP guardrails.
- **Thesis fit:** Direct
- **Signal strength:** Medium -- practical builder, conference presence
- **Action:** WATCH -- monitor for side projects, open-source releases, or departure signals
- **Sources:** [MCP Summit talk (YouTube)](https://www.youtube.com/watch?v=GrQTYPvMzZg)

#### 11. TrustLayer / Dushmesh_DS / WardLink
- **Affiliation:** Independent builder
- **Location:** Unknown
- **Work:** Built TrustLayer -- API-first security control plane for LLM apps and AI agents. Protects against prompt injection, tool hijacking, behavioral drift. Open source on GitHub. Show HN post.
- **Thesis fit:** Direct
- **Signal strength:** Medium -- builder pattern, addressing real problem, limited traction
- **Action:** WATCH -- monitor GitHub traction, commercialization signals
- **Sources:** [GitHub](https://github.com/WardLink/TrustLayer--Security-Control-Plane-For-LLM-AI), [HN post](https://news.ycombinator.com/item?id=46824665)

#### 12. Narek Maloyan
- **Affiliation:** Brightcove (AI Engineer) / Lomonosov Moscow State University (researcher)
- **Location:** Boston, MA
- **Work:** Co-authored systematic analysis of prompt injection on agentic coding assistants (Jan 2026). Meta-analysis of 78 studies. Found 85%+ attack success rates. 42 attack techniques cataloged, 18 defense mechanisms analyzed. Also published on MCP protocol security.
- **Thesis fit:** Direct
- **Signal strength:** Medium -- Boston-based, publishing independently while employed
- **Action:** WATCH -- academic-to-commercial transition potential
- **Sources:** [Paper (arXiv)](https://arxiv.org/abs/2601.17548)

#### 13. Nicholas Carlini
- **Affiliation:** Anthropic (previously Google DeepMind)
- **Location:** Bay Area
- **Work:** Co-author of CaMeL defense. Co-author of "The Attacker Moves Second" (2025) showing adaptive attacks bypass all defenses. Top adversarial ML researcher globally.
- **Thesis fit:** Direct expertise, but unlikely to leave Anthropic
- **Signal strength:** Medium (expertise), Weak (founder probability)
- **Action:** WATCH -- departure from Anthropic would be a major signal
- **Sources:** [Personal site](https://nicholas.carlini.com/), [CaMeL paper](https://arxiv.org/abs/2503.18813)

### Tier 3: PASS (3 signals)

#### 14. Rishika Bhagwatkar / Kevin Kasa
- **Affiliation:** ServiceNow Research + Mila/UdeM (Bhagwatkar), ServiceNow Research + U Guelph (Kasa)
- **Work:** Dual-firewall architecture for indirect prompt injection (Tool-Input + Tool-Output Firewalls). Oct 2025 paper with Irina Rish, Graham Taylor.
- **Action:** PASS -- corporate research lab, product-oriented but likely stays at ServiceNow
- **Sources:** [Paper (arXiv)](https://arxiv.org/abs/2510.05244)

#### 15. Haoyu Wang
- **Affiliation:** Huazhong University of Science and Technology (Professor)
- **Location:** Wuhan, China
- **Work:** Professor running SECURITY PRIDE Research Group. Research on software security + LLM security. Co-authored AIShellJack paper with Yue Liu.
- **Action:** PASS -- established professor in China, unlikely US-fundable founder
- **Sources:** [Personal site](https://howiepku.github.io/)

#### 16. Leon Derczynski
- **Affiliation:** NVIDIA / ITU Copenhagen
- **Work:** Created garak (leading LLM vulnerability scanner). OWASP LLM Top 10 core team. Professor.
- **Action:** PASS -- firmly embedded at NVIDIA
- **Sources:** [garak.ai](https://garak.ai), [GitHub](https://github.com/NVIDIA/garak)

---

## Investment Thesis: Coding Agent Prompt Injection Firewall

**One-liner:** Autonomous coding agents (Claude Code, Copilot, Cursor, Devin) represent a new attack surface where prompt injection can escalate to RCE, and no purpose-built defensive product exists.

**Why now:**
1. **Coding agents are proliferating** -- Docker reports sandboxed coding agent usage growing rapidly (Dec 2025)
2. **Attacks are real** -- Trail of Bits demonstrated prompt injection to RCE in AI agents (Oct 2025)
3. **Defenses fail** -- 85%+ bypass rate against SOTA defenses with adaptive attacks (Maloyan, Jan 2026)
4. **M&A validates the category** -- $400M+ in AI security acquisitions in 2025 (Prompt Security $250M, Cyata $150M, Lakera by Check Point, ProtectAI by Palo Alto)
5. **The coding agent attack surface is unique** -- file system, shell, code execution, MCP tools require specialized defenses beyond generic LLM firewalls

**The gap:** Existing solutions are either (a) generic LLM firewalls not aware of coding context, (b) sandbox/isolation layers that don't inspect prompts, or (c) academic benchmarks without commercial products. A coding-agent-specific firewall that understands code semantics, tool invocations, and MCP flows would fill this gap.

**Primitive:** Context-aware prompt injection detection and prevention for agentic code execution workflows.

**Risks:**
- Model providers (Anthropic, OpenAI) could build this in-house
- The problem may prove unsolvable at the prompt level (requiring architectural solutions like CaMeL)
- Market may consolidate around general-purpose AI security platforms (Aurascape, Straiker)
- Open source (LlamaFirewall) could commoditize the detection layer

---

## Sources

### Papers
- [Indirect Prompt Injections: Are Firewalls All You Need?](https://arxiv.org/abs/2510.05244) -- Bhagwatkar et al., Oct 2025
- [Prompt Injection Attacks on Agentic Coding Assistants](https://arxiv.org/abs/2601.17548) -- Maloyan & Namiot, Jan 2026
- ["Your AI, My Shell"](https://arxiv.org/abs/2509.22040) -- Liu et al., Sep 2025
- [AgentDyn Benchmark](https://arxiv.org/abs/2602.03117) -- Li, Wen, Shi, Zhang, Xiao, Feb 2026
- [From Prompt Injections to Protocol Exploits](https://arxiv.org/abs/2506.23260) -- Ferrag et al., Jun 2025
- [DataSentinel: Game-Theoretic Detection](https://arxiv.org/abs/2504.11358) -- Liu et al., IEEE S&P 2025
- [Defeating Prompt Injections by Design (CaMeL)](https://arxiv.org/abs/2503.18813) -- Debenedetti et al., Mar 2025
- [Design Patterns for Securing LLM Agents](https://arxiv.org/abs/2506.08837) -- Beurer-Kellner et al., Jun 2025
- [IPI Defense Frameworks Taxonomy](https://arxiv.org/abs/2511.15203) -- Ji et al., Nov 2025
- [MAC for LLM Agents](https://arxiv.org/abs/2601.11893) -- Ji et al., Jan 2026
- [PromptArmor](https://arxiv.org/abs/2507.15219) -- Jul 2025

### Companies & Products
- [Prompt Security (acquired)](https://prompt.security) -- SentinelOne $250M acquisition
- [Lakera (acquired)](https://www.lakera.ai) -- Check Point acquisition
- [Cyata (acquired)](https://cyata.ai) -- Check Point $150M acquisition
- [Aurascape AI](https://aurascape.ai) -- $62.8M
- [E2B](https://e2b.dev) -- $35M sandbox for AI agents
- [Straiker](https://www.straiker.ai) -- AI-native agent security
- [Lasso Security](https://www.lasso.security) -- MCP gateway
- [LlamaFirewall](https://meta-llama.github.io/PurpleLlama/LlamaFirewall/) -- Meta open source
- [garak](https://garak.ai) -- NVIDIA LLM scanner
- [TrustLayer](https://github.com/WardLink/TrustLayer--Security-Control-Plane-For-LLM-AI) -- indie builder

### Blog Posts & News
- [Trail of Bits: Prompt Injection to RCE in AI Agents](https://blog.trailofbits.com/2025/10/22/prompt-injection-to-rce-in-ai-agents/)
- [Trail of Bits: Exploiting GitHub Copilot](https://blog.trailofbits.com/2025/08/06/prompt-injection-engineering-for-attackers-exploiting-github-copilot/)
- [Simon Willison: The Summer of Johann](https://simonwillison.net/2025/Aug/15/the-summer-of-johann/)
- [SentinelOne acquires Prompt Security](https://www.sentinelone.com/press/sentinelone-to-acquire-prompt-security-to-advance-genai-security/)
- [Docker Sandboxes for Coding Agents](https://www.docker.com/blog/docker-sandboxes-a-new-approach-for-coding-agent-safety/)
- [Aikido: PromptPwnd in GitHub Actions](https://www.aikido.dev/blog/promptpwnd-github-actions-ai-agents)
- [Heise: 39C3 Hijacking AI Coding Assistants](https://www.heise.de/en/news/39C3-Security-researcher-hijacks-AI-coding-assistants-with-prompt-injection-11125687.html)
