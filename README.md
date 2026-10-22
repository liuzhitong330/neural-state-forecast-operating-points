# Seizure forecasts at a shared false-positive-rate budget

An exploratory, participant-level analysis of public source data from Khambhati et al., *Nature Medicine* (2024).

[Explore the interactive analysis](https://liuzhitong330.github.io/neural-state-forecast-operating-points/)

## Research question

At the same false-positive-rate budget, does a momentary hippocampal functional-connectivity forecast retain more seizure sensitivity than a multidien epileptiform-activity-cycle forecast—and does the answer differ between participants?

## What this project does

The interface compares published participant-level AUC values and reconstructs monotone ROC envelopes from released figure-source data. Selecting a participant and an FPR budget shows the interpolated sensitivity of the FC, IEA-cycle, and shuffled models.

The aim is to make individual trade-offs inspectable and identify comparisons worth testing in a future longitudinal evaluation. This is a descriptive reanalysis, not a new trained forecasting model or a validated stimulation policy.

## Data and attribution

- Khambhati AN, Chang EF, Baud MO, Rao VR. *Hippocampal network activity forecasts epileptic seizures.* Nature Medicine 30, 2787–2790 (2024). [DOI: 10.1038/s41591-024-03149-6](https://doi.org/10.1038/s41591-024-03149-6).
- Source repository: [khambhati-lab/pub-2024-hippocampal-seizure-forecasting](https://github.com/khambhati-lab/pub-2024-hippocampal-seizure-forecasting/tree/fea1a8d282ebfb8545dfb4ad680897891b1428d4), pinned to commit `fea1a8d282ebfb8545dfb4ad680897891b1428d4`.
- Source files fetched by the public interface: `source-data/data-fig2c-auc.csv` and `source-data/data-figext7d-forecast-roc.csv`.

The source data and original forecasting models belong to the study authors. This project adds a browser-based comparison; it does not claim a collaboration with or endorsement by the KNOT Lab.

## Run locally

Clone this repository, then run the following from its root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Internet access is required: the page fetches the two source CSVs directly from the pinned GitHub commit at runtime.

[app.js](app.js) contains the displayed calculations; [data.js](data.js) contains the source configuration. The public repository provides the browser workflow. A separate audit script referenced in an earlier README exists only in the original local workspace and is **not included in this repository**; it is not a prerequisite or a publicly available reproduction step.

## Method

1. Group published ROC points by participant and model.
2. For duplicate FPR values, keep the highest TPR.
3. Apply cumulative maxima to enforce a non-decreasing ROC envelope.
4. Linearly interpolate TPR at the selected FPR ceiling.
5. Compare FC, IEA-cycle, and shuffled models at that common operating constraint.

## Limitations

- The inputs are figure-level source data, not raw RNS recordings or window-level predictions. This project does not retrain or reproduce the full forecasting pipeline.
- Selecting the highest TPR at duplicate FPR values and applying a cumulative maximum can produce an optimistic summary. Interpolated operating points are descriptive approximations, not independently measured performance.
- A false-positive rate is not a daily alert count, calibration measure, stimulation burden, or clinical benefit.
- A participant's apparent model preference needs new, held-out longitudinal evaluation. This analysis does not establish an actionable clinical threshold or stimulation policy.

## Data rights and project provenance

The pinned source repository does not include an explicit license file. This project links to the original source and computes a minimal derived view rather than bundling the raw CSVs. Source access is not a blanket grant of redistribution rights; consult the original authors and applicable terms for reuse.

This is a personal, public-data exploration developed with AI-assisted implementation. The browser interface and reanalysis are distinct from the original study, and do not establish hands-on neural-recording or clinical-stimulation experience.
