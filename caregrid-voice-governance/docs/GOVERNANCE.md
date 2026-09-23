# Governance model

Governance is implemented as product behavior, not an external policy document.

## Questionnaire governance

- Every questionnaire has a version.
- Universal questions remain separate from specialty modules.
- Question changes require patient-experience, accessibility, privacy and clinical-safety review.
- LLM rephrasing must preserve intent and may not remove mandatory questions.
- Published metrics must identify the questionnaire version and collection channel.

## Safety governance

- Immediate-risk phrases interrupt the questionnaire.
- Medical-advice requests receive a boundary response and redirection.
- Priority safety reports enter human review.
- Deterministic controls run independently of any generative model.
- Safety test cases must be segmented by language, accent and audio conditions.

## Evidence governance

Each record must answer:

1. Who or what produced the source?
2. When was it captured or retrieved?
3. Which provider was matched, by what method, and with what confidence?
4. Which transformations were applied?
5. What original span supports the extracted claim?
6. Does the record require human review?
7. Has its content changed since capture?

## Reporting governance

- Patient voice and public measures are not blended into an unexplained score.
- Minimum sample and small-cell suppression policies are required before public release.
- Allegations are labeled as patient-reported until independently resolved.
- Providers need correction and response pathways.
- The public methodology, effective dates and limitations must be visible.
- Automated dashboards inform review; they do not impose regulatory findings.

## Decision rights

| Change | Required review |
| --- | --- |
| Questionnaire wording | Patient experience + accessibility |
| Safety rule or threshold | Clinical safety + legal |
| New public source | Data governance + methodology |
| Provider match threshold | Data quality + council representative |
| Public metric or ranking | Statistical review + public governance council |
| Retention or recording change | Privacy + security + legal |
