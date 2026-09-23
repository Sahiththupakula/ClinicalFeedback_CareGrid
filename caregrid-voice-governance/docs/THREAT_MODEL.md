# Threat model

## Assets

- Patient voice and transcripts
- Encounter and provider identity
- Consent records
- Evidence and review decisions
- Public reporting methodology
- Service credentials and tool permissions

## Principal risks and controls

| Risk | Initial control | Production follow-up |
| --- | --- | --- |
| PHI exposure in logs | Avoid transcript logging | Automated telemetry redaction and DLP tests |
| Prompt injection | No direct tool execution from transcript | Allowlists, schemas and policy gateway |
| Wrong provider attribution | Confidence threshold and review flag | NPI/location/date reconciliation |
| False emergency negative | Visible deterministic patterns | Multilingual classifier and clinical validation |
| False public allegation | Patient-report labeling | Human review, suppression and appeal workflow |
| Dashboard manipulation | Separate source classes | Rate limiting, anomaly and duplicate detection |
| Model drift | Version fields | Regression suite and controlled release gates |
| Evidence tampering | Integrity hash | Signed events and immutable audit storage |
| Insider access | Not implemented in demo | Entra ID, least privilege and audited access |

This is a starting threat model, not a security certification.
