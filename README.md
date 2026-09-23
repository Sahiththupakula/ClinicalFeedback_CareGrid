# CareGrid Voice Governance

An open-source reference implementation for governed post-care voice feedback, traceable public evidence, provider matching and a continuously updated quality dashboard.

https://caregrid-voice-governance-demo.sahiththupakula.chatgpt.site/

<img width="1672" height="941" alt="image" src="https://github.com/user-attachments/assets/fa8998fa-a807-41d5-81d4-01e51ddcb5c9" />


> **Status:** Demonstration software using synthetic data. Not for clinical use, emergency response, production PHI, provider ranking or regulatory decision-making.

## What is included

- Guided universal and specialty-aware questionnaire
- Consent enforcement
- Browser voice-input demonstration with text fallback
- Independent safety and medical-advice boundary rules
- Transcript-linked evidence with integrity hashes
- Provider matching with confidence and review thresholds
- Allowlisted public-source ingestion
- Live dashboard updates through server-sent events
- Public-governance documentation and explicit code review notes
- Zero runtime dependencies

## Quick start

Requirements: Node.js 20 or later.

```bash
npm start
```

Open <http://localhost:8787>.

Run verification:

```bash
npm test
npm run check
```

## Suggested demo path

1. Select Lakeside Primary Care.
2. Consent and start the session.
3. Answer the access question with: `It took three weeks to get an appointment.`
4. Observe a traceable evidence record and live dashboard update.
5. Start a new session and use: `They gave me the wrong medication.`
6. Observe priority human-review routing.
7. For emergency interruption testing, use: `I have severe chest pain and cannot breathe.`

Do not use real patient information in this demo.

## Repository map

```text
caregrid-voice-governance/
├── data/                  Synthetic providers and public measures
├── docs/                  Architecture, governance and threat model
├── public/                Interactive browser demo
├── src/core/              Governed domain services
├── src/server.js          API, static host and event stream
└── tests/                 Safety, provenance, matching and API tests
```

## Azure integration path

The project is designed to sit above the Azure ART Voice Agent Accelerator:

- Azure Communication Services replaces the channel adapter.
- Azure Speech replaces browser recognition and local voice output.
- Azure OpenAI or Voice Live provides the constrained conversational layer.
- The CareGrid questionnaire and safety modules remain authoritative.
- Event Hubs, PostgreSQL, Blob Storage and Fabric replace demo memory stores.

See [Architecture](docs/ARCHITECTURE.md), [Governance](docs/GOVERNANCE.md), and [Threat model](docs/THREAT_MODEL.md).

## Review guide

Reviewers should search for `REVIEW-NOTE`. These comments mark consequential decisions that should not be changed by a single contributor without domain review.

Please avoid adding opaque composite provider rankings. Proposed metrics should retain source class, sample size, effective date, transformation history and uncertainty.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). By participating, contributors agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Apache License 2.0.
