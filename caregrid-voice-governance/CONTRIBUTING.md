# Contributing

Thank you for helping make patient-experience evidence more accountable.

## Before opening a change

1. Open an issue describing the user need and affected governance boundary.
2. State whether the change affects consent, safety, questionnaire wording, provider identity, evidence provenance or public reporting.
3. Include tests for expected and failure behavior.
4. Never add real patient data, credentials or proprietary provider data.

## Pull-request checklist

- [ ] I used synthetic or explicitly public data.
- [ ] I added or updated tests.
- [ ] I documented evidence transformations.
- [ ] I did not weaken consent, emergency or medical-advice boundaries.
- [ ] I considered accessibility and multilingual behavior.
- [ ] I identified metrics or thresholds requiring public-methodology review.
- [ ] I added a `REVIEW-NOTE` where multidisciplinary approval is required.

## Review expectations

At least one maintainer review is required for routine changes. Changes to safety, public reporting, consent or retention require a second reviewer representing the relevant domain.
