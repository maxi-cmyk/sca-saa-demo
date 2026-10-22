# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A CS440 student presenter and classmates learning the methods for the first time. Primary use is a classroom projector; narrow screens support rehearsal.

## Product Purpose

Explain how SCA and SAA work, show each method's output, demonstrate their complementary evidence, then show integrated data analysis. Follow the provided Vashista & Patro paper. Paper errors and critique are covered later in slides.

## Positioning

A small, live-computed teaching simulator with 75 deterministic fictional specimens. It illustrates the workflow and does not reproduce or claim the paper's experimental results.

## Operating Context

Local and offline; static HTML/CSS/JS without dependencies. Keyboard-driven presentation with a specimen drawer.

## Capabilities and Constraints

- Five presentation tabs: Overview, SCA, SAA, Synthesis and Output. Open on the clickable framework; retain the selected pair throughout. Slides supply the overview.
- Next moves directly through the five tabs. The three worked examples present one calculation and decision each; intermediate arithmetic is disclosed inline. Output provides the dataset views. Input and preprocessing details open from Overview, with Back to demo returning to it.
- SCA: feature-string MinHash, sketch candidates, ranked search results.
- SAA: attribute Jaccard index and threshold graph.
- Integrated score: cosine similarity over synthetic byte-block frequency vectors plus attribute Jaccard index; default code weight .60. Five synthetic lineages contain 30, 12, 16, 10 and 7 samples.
- Output shows clustering, a readable overview-plus-detail heatmap, or exact t-SNE. Clustering and t-SNE combine animation and inspection in one selectable view, with persistent A/B labels, current settings, Play/Pause, Replay, a 13.3-second timeline and Show final. No explanatory captions. Groups use connected components. No hidden Output panels.
- Synthesis uses local LaTeX with SCA calculation on the left, SAA calculation on the right, and the combination below; paper-based parameter captions and the code-weight control stay with the combination. Synthesis follows the paper’s pairwise integration flow without invented scenario categories. The SAA panel names overlapping values from the selected synthetic files. SCA and SAA retain their existing content and controls.
- Synthetic data stays labelled. No efficiency or paper-error material in the main flow.

## Brand Commitments

Preserve the navy ground, cream controls, local Atkinson Hyperlegible and Courier Prime fonts. Amber means code, sky blue means attributes, white means combined evidence.

## Evidence on Hand

The user-provided paper and 75 synthetic samples. All scores and views are derived from those samples. Code blocks and extracted attributes are simulated; no real malware is executed.

## Product Principles

1. One calculation or visual at a time.
2. Let Next guide the presenter through methods and outputs.
3. Explain what a result means in one short takeaway.
4. Keep optional detail out of the initial reading path.

## Accessibility & Inclusion

Readable projector type, strong contrast, keyboard navigation, labelled controls, and text alongside colour. Narrow screens use normal vertical scrolling.
