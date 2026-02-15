# THE-1810: Verified Runtime to Reduce Hallucinations — Founder Scan

**Date:** 2026-02-15
**Analyst:** Claude (Tigerclaw)
**Type:** Latent Founder Signal Scan
**Theme:** THE-1810 — Verified Runtime to Reduce Hallucinations (VOR)

## Executive Summary

Scanned for latent founder signals in the verified/grounded AI reasoning space — people who could build a company around runtime verification of LLM outputs, enforcing provably grounded answers, and deterministic evidence chains. The space is heavily funded at the company level ($800M+ deployed across Goodfire, Contextual AI, Humans&, Guardrails AI, Ciphero, Inferact) but has very few unfunded individual builders. Most pre-founder activity is in academia. Identified 5 qualified WATCH-level candidates and 3 secondary signals.

## VOR Creator Assessment

**Rob C (CULPRITCHAOS)** — [github.com/CULPRITCHAOS/VOR](https://github.com/CULPRITCHAOS/VOR)
- Self-described carpenter, coding since July 2025 (7 months)
- VOR repo: 14 stars, 3 forks, Python, created Feb 1 2026
- Also built Interlock (RAG pipeline safety) and MCP-Sentinel (MCP server security testing)
- HN post got 1 point, 1 comment (from himself)
- Shows "NeuraLogix" branding and public/commercial product split — company formation indicators
- **Risk:** 7 months of coding experience producing sophisticated systems (typed graph IR, cryptographic receipts, DSL parsers) raises authorship questions
- **Action:** WATCH — monitor for 60-90 days. Upgrade to REACH_OUT if legitimate technical background emerges or third-party validation appears.

## Qualified Founder Candidates

### 1. Natan Levy — Hebrew University of Jerusalem (WATCH)
- **What:** Statistical runtime verification for LLMs via robustness estimation (RoMA)
- **Background:** PhD student with Guy Katz (leading verification researcher). Prior industry experience in production ML systems and aerospace.
- **Thesis fit:** DIRECT — developing scalable alternatives to formal methods for LLM verification
- **Signal strength:** Medium — industry background + PhD could signal startup intent, Israel-based (geo match)
- **Paper:** [arxiv.org/abs/2504.17723](https://arxiv.org/abs/2504.17723) (April 2025)
- **Website:** [natan-levy.com](https://www.natan-levy.com)
- **Why interesting:** Rare combination of production engineering experience + formal verification research. Israel ecosystem is strong for deep tech spin-outs.
- **Next step:** Monitor for PhD defense timing. Check for new repos or side projects.

### 2. Bingbing Wen — University of Washington iSchool (WATCH)
- **What:** Comprehensive research on abstention in LLMs — when models should refuse to answer to prevent hallucinations
- **Background:** PhD student. Lead author on major TACL survey (June 2025) + EMNLP 2024 papers.
- **Thesis fit:** DIRECT — abstention is exactly VOR's "refuse to answer unless provably grounded" philosophy
- **Signal strength:** Medium — strong publication record, practical safety focus
- **Paper:** [arxiv.org/abs/2407.18418](https://arxiv.org/abs/2407.18418)
- **Website:** [bbwen.github.io](https://bbwen.github.io)
- **LinkedIn:** [linkedin.com/in/bingbing-wen-18593570](https://www.linkedin.com/in/bingbing-wen-18593570)
- **Why interesting:** Abstention research is the most directly aligned primitive with VOR. Productizable angle (safety).
- **Next step:** Monitor for PhD completion. Check LinkedIn for career trajectory signals.

### 3. KR Labs — Ádám Kovács & Gábor Recski, TU Wien spin-off (WATCH)
- **What:** LettuceDetect — lightweight hallucination detection framework for RAG applications
- **Background:** TU Wien spin-off founded 2024. Recski leads TU Wien NLP group. Mission: "transparent and trustworthy NLP."
- **Thesis fit:** DIRECT — hallucination detection via triplet-based NLI
- **Signal strength:** Medium — already co-founded spin-off, 531 GitHub stars, active development
- **GitHub:** [github.com/KRLabsOrg/LettuceDetect](https://github.com/KRLabsOrg/LettuceDetect)
- **Paper:** [arxiv.org/abs/2502.17125](https://arxiv.org/abs/2502.17125) (Feb 2025)
- **Website:** [informatics.tuwien.ac.at/people/gabor-recski](https://informatics.tuwien.ac.at/people/gabor-recski)
- **Why interesting:** Already formed entity, building in public, strong technical execution. Vienna-based (EU).
- **Risk:** May be research lab model, not venture-scale. Funding status unclear.
- **Next step:** Verify funding status. Assess venture intent vs. academic lab model.

### 4. Yedi Zhang — National University of Singapore (WATCH)
- **What:** RvLLM — runtime verification of LLMs with domain knowledge
- **Background:** Postdoc at NUS (PhD from ShanghaiTech). 196 citations in formal methods / trustworthy AI.
- **Thesis fit:** DIRECT — runtime verification of LLM outputs using expert knowledge
- **Signal strength:** Medium — postdoc = key transition phase, active research
- **Paper:** [arxiv.org/abs/2505.18585](https://arxiv.org/abs/2505.18585) (May 2025)
- **Website:** [zhangyedi.github.io](https://zhangyedi.github.io)
- **Why interesting:** Postdoc is the prime inflection point for academic founders. Direct primitive alignment.
- **Next step:** Monitor for next career move (academic job market vs. industry).

### 5. Aaron Councilman — UIUC (WATCH)
- **What:** Formal verification of LLM-generated code from natural language prompts, focusing on DSLs
- **Background:** PhD student at UIUC.
- **Thesis fit:** DIRECT — formal verification of LLM outputs
- **Signal strength:** Medium — builder pattern with practical DSL focus
- **Paper:** [arxiv.org/abs/2507.13290](https://arxiv.org/abs/2507.13290) (July 2025)
- **LinkedIn:** [linkedin.com/in/aaron-councilman-910847149](https://www.linkedin.com/in/aaron-councilman-910847149)
- **Why interesting:** Focus on DSLs suggests builder instinct (developer experience angle).
- **Next step:** Monitor for PhD defense and post-PhD trajectory.

## Secondary Watch List

| Name | Affiliation | Work | Thesis Fit | Notes |
|------|-------------|------|------------|-------|
| Roham Koohestani | TU Delft / JetBrains | AgentGuard — runtime verification of AI agents | Direct | BSc, heading to PhD. Early career. [rohamkoohestani.com](https://rohamkoohestani.com/) |
| Pierre Dantas | U Manchester | 4/δ Bound for LLM-verifier convergence | Direct | PhD student, theoretical focus. [arxiv.org/abs/2512.02080](https://arxiv.org/abs/2512.02080) |
| Omri Isac | Hebrew University | Neural network verification with proofs | Direct | PhD student with Guy Katz + Clark Barrett (Stanford). [omriisack.github.io](https://omriisack.github.io) |

## Funded Landscape (Out of Scope)

| Company | Funding | Focus | Founders |
|---------|---------|-------|----------|
| Goodfire | $150M Series B ($1.25B val) | Mechanistic interpretability, hallucination debugging | Eric Ho, Tom McGrath, Dan Balsam |
| Contextual AI | $100M (Seed + A) | Grounded language model for enterprise | Douwe Kiela, Amanpreet Singh |
| Humans& | $480M seed | Human-centric AI, worker empowerment | Andi Peng, Georges Harik, Noah Goodman |
| Guardrails AI | $7.5M seed | Open-source LLM guardrails | Diego Oppenheimer, Safeer Mohiuddin |
| Ciphero | $2.5M pre-seed | AI verification layer for enterprise | Saoud Khalifah, Rob Gross, Sen Tian |
| Inferact (vLLM) | $150M Series A | LLM inference + HaluGate hallucination detection | Simon Mo, Woosuk Kwon |
| Cleanlab | Series A | Trustworthy language model (TLM) | Curtis Northcutt |
| Arize AI | $38M Series B | AI observability + hallucination detection | Jason Lopatecki, Aparna Dhinakaran |
| Overmind | £2M seed | Supervision layer for AI agents | (London-based) |

## Market Observations

1. **$800M+ deployed** in verified/grounded AI reasoning in the last 12 months — the primitive is validated
2. **Dominated by funded companies** — very few independent builders. The space requires deep ML + formal verification expertise, which concentrates in PhD programs
3. **Academic pipeline is active** — multiple PhD students working on directly relevant primitives (runtime verification, abstention, formal verification of LLM outputs)
4. **Geographic clusters:** Israel (Guy Katz's lab at Hebrew University), Seattle (UW iSchool/CSE), Vienna (TU Wien/KR Labs), Singapore (NUS)
5. **Gap:** No one is building VOR's specific approach (deterministic evidence chains + hash-chain receipts + proof gates) at venture scale. The VOR repo itself has minimal traction and authorship concerns.

## Risks & Open Questions

- Most candidates are deep in academia with no visible venture signals — these are WATCH, not REACH_OUT
- The funded landscape is crowded — a new entrant would need a differentiated approach (VOR's "prove it or abstain" is differentiated but unvalidated)
- Israel cluster (Levy, Isac) worth monitoring as a geographic thesis for spin-outs from Guy Katz's lab
- KR Labs is the only entity that's already formed — but may be a research lab, not a venture

## Sources

- [VOR GitHub](https://github.com/CULPRITCHAOS/VOR)
- [CULPRITCHAOS Profile](https://github.com/CULPRITCHAOS)
- [HN Post](https://news.ycombinator.com/item?id=46851711)
- [AgentGuard Paper](https://arxiv.org/abs/2509.23864)
- [Natan Levy Website](https://www.natan-levy.com)
- [Bingbing Wen Website](https://bbwen.github.io)
- [KR Labs LettuceDetect](https://github.com/KRLabsOrg/LettuceDetect)
- [Yedi Zhang Website](https://zhangyedi.github.io)
- [Aaron Councilman Paper](https://arxiv.org/abs/2507.13290)
- [Goodfire Series B](https://techfundingnews.com/goodfire-150m-series-b-1-25b-interpretability-ai/)
- [Contextual AI](https://contextual.ai/)
- [Guardrails AI Seed](https://www.geekwire.com/2024/guardrails-ai-a-startup-co-founded-by-seattle-tech-vet-diego-oppenheimer-raises-7-5m/)
- [Ciphero Pre-Seed](https://fintech.global/2025/12/22/enterprise-ai-security-firm-ciphero-bags-2-5m-pre-seed/)
- [Overmind Seed](https://pulse2.com/overmind-exits-stealth-with-2-million-seed-to-supervise-ai-agents/)
