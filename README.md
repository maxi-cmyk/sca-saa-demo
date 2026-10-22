# SCA / SAA Explorer

A focused, offline simulator for Vashista & Patro, *Enhancing Malware Analysis Using Data Visualization Through Shared Code and Attribute Analysis* (IEEE Access, 2025, DOI 10.1109/ACCESS.2025.3582164).

75 deterministic synthetic samples across five fictional families demonstrate the methods and their complementary evidence. The original nine teaching samples are retained; 66 variants have distinct, reproducibly modified code and attribute sets. Every displayed score is computed from synthetic data. These are not the paper's experimental results.

## Run

`npm start` opens the local demo at http://localhost:5173. Alternatively, open `index.html` directly or launch `start.command` on macOS. No dependencies or network requests are required. The server binds to localhost; Ctrl+C stops it. Use `PORT=8080 npm start` to choose a port or `node server.js --no-open` to skip browser launch.

## Walkthrough

The presentation opens on the clickable framework overview, followed by SCA, SAA, Synthesis and Output. The selected pair persists across all five tabs; Next and Back move directly between them.

| Screen | Visible calculation |
| --- | --- |
| SCA | Extracted-string counts → hash-minimum signatures → matching positions / signature length → estimated Jaccard index and decision |
| SAA | A-only/shared/B-only attributes → intersection / union → Jaccard index and decision |
| Synthesis | Code-block vectors → numerical cosine similarity calculation → weighted blend with attribute Jaccard index → final decision |
| Output | Combined scores across 75 samples: relationships and clustering, similarity matrix, or t-SNE and interpretation |

Synthesis follows the paper’s pairwise integration flow: choose A/B, inspect independently calculated code and attribute similarities, then combine them using Equation 2. It has no invented scenario categories. The SAA panel names up to four representative overlapping values from the selected files, including API names and network, mutex or file indicators. All files, feature values and scores in this simulator remain synthetic illustrations, not the paper’s experimental samples or reported pairwise results. The default pair is `obviousmalware_v1` / `obviousmalware_v4`.

SCA and SAA retain their existing inline disclosures. Synthesis and Output provide visible A/B sample dropdowns, preserving the selected pair between pages. Synthesis presents SCA calculation on the left, SAA calculation on the right, and their weighted combination below. Offline LaTeX shows the general cosine formula throughout a three-step SCA explanation: actual 16-byte block excerpts and A/B counts, aligned vector coordinates, then the numerical cosine calculation over every coordinate. Only a few real blocks are shown; the feature-count bar chart stays removed. The fifth tab, **Output**, opens the 75-sample graph, red heatmap and t-SNE. The overview’s Input data and Preprocessing boxes open supporting details; **Back to demo** returns to the overview and preserves the selected pair. Slides provide the conceptual overview; the demo provides concrete calculations.

SCA's standalone search uses feature strings, MinHash and sketches. Its output scores only candidates sharing a sketch with the query; skipped samples remain unscored. The integrated model follows the cosine-vector definition beside Equation 2: this simulator counts exact 16-byte code blocks from its generated files and calculates normalized cosine similarity. Its attribute term is the Jaccard index. Changing MinHash signature length therefore does not change the integrated score.

The combination is a weighted blend, not a sequential fallback. The examples show how additional evidence can resolve an ambiguous match; they do not claim universal accuracy.

## Presentation examples

Default settings: signature length 64, cutoff 0.70, code weight 0.60. Rounded values below; decisions use full precision.

| Example | MinHash | Code cosine similarity | Attribute Jaccard index | Combined |
| --- | ---: | ---: | ---: | ---: |
| Related versions: obviousmalware_v1 / obviousmalware_v2 | .969 | .961 | .947 | .956 |
| Rewritten code: obviousmalware_v1 / obviousmalware_v4 | .422 | .597 | .947 | .737 |
| Reused code: obviousmalware_v1 / totallysafe | .719 | .847 | .115 | .554 |
| Similar behaviour: payme_v1 / oopslocked | .078 | .095 | .727 | .348 |

The synthetic pairs illustrate how code and attribute similarities can differ; these are not experimental categories from the paper. At the default cutoff, the 75-sample combined graph has five groups. The original nine teaching samples alone still produce two multi-sample groups and three isolated samples.

Relationships and clustering share one view: the threshold selects pairwise edges, and connected components define the groups. Graph positions are arranged for readability. The t-SNE view separately derives positions from all combined scores and explains how to read local neighbourhoods. Groups are connected components, not asserted malware families. Two samples can belong to one group through a chain without sharing a direct edge. The graph's group colours also appear on the t-SNE map. The cutoff changes links and colours, not t-SNE positions.

The map implements exact t-SNE over distances `1 − S_final`, with perplexity 15, seed 440 and 1,000 iterations. It uses Gaussian input affinities and Student-t output affinities following [van der Maaten and Hinton (2008)](https://www.jmlr.org/papers/volume9/vandermaaten08a/vandermaaten08a.pdf). Nearby points describe local similarity; axis position and large gaps do not establish family membership. This is a synthetic illustration, not a reproduction of the paper's Figure 8.

## Controls

| Key | Action |
| --- | --- |
| ← / → | Previous / next main tab; supporting lessons retain their calculation stages |
| 1–5 | Jump to a page |
| D | Specimen drawer |
| / | Drawer filter |
| F | Full screen |
| + / − | Text size |
| ? | Shortcut sheet |
| Esc | Release a control or close a panel |
| R | Reset |

Example buttons select the same pair across method, search, graph and combination pages. Each comparison shows its known synthetic relationship, observed evidence and threshold decision; false positives and false negatives are labelled explicitly. SCA search also has a query selector. Cutoff controls update the live graphs; Synthesis exposes the code weight directly.

## Verification and files

`npm run verify` checks score invariants, known cosine similarity cases, MinHash independence of the integrated model, complementary examples, connected components, and deterministic finite t-SNE output. Walkthrough checks cover progression in both directions, displayed calculations, failure cases and changed settings. Verification also prints all score matrices. `node tools/verify.js 128 0.7 0.6` prints an alternative signature setting.

- `js/data.js`: synthetic samples and example pairs.
- `js/core.js`: scoring, sketches, graph analysis, projection and generated bytes.
- `js/app.js`: five-page walkthrough and secondary tools.
- `css/style.css`, `fonts/`: navy/cream theme and self-hosted fonts.
- `tools/verify.js`: reproducible numerical checks.
- `tools/verify-walkthrough.js`: scene progression and teaching-content checks.

The `screenshots/` folder contains historical captures; regenerate them before using them as backup slides for this version.

Cohort sizes: MOTH 30, SPINDLE 12, INKLOCK 16, SLATECRYPT 10, DRIFTMINER 7. The graph and projection show all 75 samples with selected labels and full-name tooltips. The red matrix combines a 75×75 overview with a magnified eight-sample neighbourhood and readable cell values. Click the overview or a magnified cell to choose a pair; specimen numbers identify rows and columns. This remains a synthetic workflow demonstration, not a reproduction of the paper’s experimental results.

## Desktop animations and math

Output uses one interactive SVG for playback and inspection. There is no Animation/Live view switch. Both clustering and t-SNE keep A/B labels visible, use the current weights and cutoff, and expose Play/Pause, Replay, a 13.3-second timeline slider and Show final. Samples remain selectable at every point. Reduced-motion preferences initially show the interactive final frame. Playback stops when the page is hidden or the Output tab is left. No explanatory captions or hidden panels occupy the visualization.

Clustering starts with separated samples, reveals only links meeting the current cutoff, then arranges their connected components. It does not silently change the cutoff during playback. t-SNE begins with a spaced sample grid; the grid-to-map transition is an explanatory layout, followed by actual optimizer snapshots from iterations 250–1000. The unstable initial optimization transient is omitted. A fixed camera, one rotation and one uniform scale preserve geometry during the optimization segment. The sequence holds its final frame for 2.7 seconds, then remains interactive. Colours come from graph components at the selected cutoff; t-SNE does not determine those groups.

The parameter captions reference paper Equation 2 (experimental code weight .60 and complementary attribute weight .40) and Section IV.C (reported precision–recall balance around thresholds .70–.80). The demo starts at .70; these values are not universal guarantees.

LaTeX is rendered by locally bundled KaTeX 0.16.22 (`vendor/katex`, MIT licence included); nothing is fetched from a CDN. The current workspace ignores `vendor/` in Git, so include this folder when packaging or transferring the offline demo. Runtime remains static and offline. This revision targets desktop/projector use.

Standalone 15-second GIF exports remain in `assets/animations/`; they are fixed-setting presentation assets rather than the interactive runtime. To regenerate those GIFs on macOS, run `npm run build:animations` with Swift/AppKit and ffmpeg installed. `tools/build-animations.js` computes the frames, `tools/render-animation.swift` rasterizes them, and ffmpeg encodes the GIFs. The generated `assets/animations/manifest.json` records settings, matrix checksum, graph endpoints and final t-SNE coordinates. `tools/verify-presentation.js` checks those against the current engine and parses GIF frame timing/resolution. The animation generation tools are build-time dependencies only.
