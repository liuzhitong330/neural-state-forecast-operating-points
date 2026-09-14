# When is a seizure forecast actionable?

A reproducible trajectory project using the public source data from:

- Khambhati AN, Chang EF, Baud MO, Rao VR. *Hippocampal network activity forecasts epileptic seizures.* Nature Medicine 30, 2787–2790 (2024). DOI: 10.1038/s41591-024-03149-6.
- `khambhati-lab/pub-2024-hippocampal-seizure-forecasting`, pinned to commit `fea1a8d282ebfb8545dfb4ad680897891b1428d4`.

## Research question

At a fixed false-positive-rate budget, how much 24-hour seizure sensitivity does a momentary hippocampal functional-connectivity forecast retain for each participant, and when should it be preferred to a multidien IEA-cycle forecast?

## What the demo adds

The original paper reports cohort-level forecasting performance. This demo reconstructs participant-level monotone ROC envelopes and interpolates TPR at a shared FPR ceiling. It exposes model switching across people and provides a concrete starting point for patient-specific sensing thresholds.

## Reproduce locally

The page fetches the two source CSVs directly from the pinned GitHub commit at runtime. Serve this directory over HTTP so the browser can load the remote data:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

The independent audit script in the parent project directory writes participant-level operating points at 5%, 10%, 20%, and 30% FPR and a JSON summary:

```bash
python3 ../analyze_forecasts.py
```

## Method

1. Group published ROC points by participant and model.
2. For duplicate FPR values, keep the highest TPR.
3. Apply cumulative maxima to enforce a non-decreasing ROC envelope.
4. Linearly interpolate TPR at the selected FPR ceiling.
5. Compare FC, IEA-cycle, and shuffled models at that common operating constraint.

## Limits and data rights

The public repository provides figure-level source data, not raw RNS recordings or window-level predictions. FPR is not daily alert count, stimulation burden, calibration, or clinical benefit. The source repository does not include an explicit license file, so this project links to the pinned source and computes a minimal derived view rather than redistributing the raw data.

