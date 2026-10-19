# SCA / SAA Explorer

A focused, offline simulator for Vashista & Patro, *Enhancing Malware Analysis Using Data Visualization Through Shared Code and Attribute Analysis* (IEEE Access, 2025, DOI 10.1109/ACCESS.2025.3582164).

75 deterministic synthetic samples across five fictional families demonstrate the methods and their complementary evidence. The original nine teaching samples are retained; 66 variants have distinct, reproducibly modified code and attribute sets. Every displayed score is computed from synthetic data. These are not the paper's experimental results.

## Run

`npm start` opens the local demo at http://localhost:5173. Alternatively, open `index.html` directly or launch `start.command` on macOS. No dependencies or network requests are required. The server binds to localhost; Ctrl+C stops it. Use `PORT=8080 npm start` to choose a port or `node server.js --no-open` to skip browser launch.

## Walkthrough

The presentation opens on the clickable framework overview, followed by three worked examples. The selected pair persists across all three; Next and Back move between examples without intermediate calculation slides.

| Screen | Visible calculation |
| --- | --- |
| SCA | Extracted-string counts → hash-minimum signatures → matching positions / signature length → estimated Jaccard index and decision |
| SAA | A-only/shared/B-only attributes → intersection / union → Jaccard index and decision |
| Synthesis | Code-block vectors → numerical cosine similarity calculation → weighted blend with attribute Jaccard index → final decision |

Start with Related variants, then switch to Rewritten code to see the SCA false negative and how the additional attribute evidence changes the combined decision. Reused code and Similar attributes remain available as additional examples. All examples use calculated synthetic scores, with a visible threshold and known relationship.

Inline disclosures contain extracted strings, hash minima, complete attributes, and vector products. **Explore** opens the optional full lessons, framework, ranked search, 75-sample graph, red heatmap and t-SNE. **Back to demo** returns to the presentation screen and preserves the selected pair. Slides provide the conceptual overview; the demo provides concrete calculations.

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

Rewritten code is rescued by shared attributes. Attribute differences weaken the reused-code match. Code differences weaken the behaviour look-alike. At the default cutoff, the 75-sample combined graph has five groups. The original nine teaching samples alone still produce two multi-sample groups and three isolated samples.

Relationships and clustering share one view: the threshold selects pairwise edges, and connected components define the groups. Graph positions are arranged for readability. The t-SNE view separately derives positions from all combined scores and explains how to read local neighbourhoods. Groups are connected components, not asserted malware families. Two samples can belong to one group through a chain without sharing a direct edge. The graph's group colours also appear on the t-SNE map. The cutoff changes links and colours, not t-SNE positions.

The map implements exact t-SNE over distances `1 − S_final`, with perplexity 15, seed 440 and 1,000 iterations. It uses Gaussian input affinities and Student-t output affinities following [van der Maaten and Hinton (2008)](https://www.jmlr.org/papers/volume9/vandermaaten08a/vandermaaten08a.pdf). Nearby points describe local similarity; axis position and large gaps do not establish family membership. This is a synthetic illustration, not a reproduction of the paper's Figure 8.

## Controls

| Key | Action |
| --- | --- |
| ← / → | Previous / next scene, including every calculation stage |
| 1–5 | Jump to a page |
| D | Specimen drawer |
| / | Drawer filter |
| F | Full screen |
| + / − | Text size |
| ? | Shortcut sheet |
| Esc | Release a control or close a panel |
| R | Reset |

Example buttons select the same pair across method, search, graph and combination pages. Each comparison shows its known synthetic relationship, observed evidence and threshold decision; false positives and false negatives are labelled explicitly. SCA search also has a query selector. Cutoff controls update the graphs; optional combination details expose the code weight.

## Verification and files

`npm run verify` checks score invariants, known cosine similarity cases, MinHash independence of the integrated model, complementary examples, connected components, and deterministic finite t-SNE output. Walkthrough checks cover progression in both directions, displayed calculations, failure cases and changed settings. Verification also prints all score matrices. `node tools/verify.js 128 0.7 0.6` prints an alternative signature setting.

- `js/data.js`: synthetic samples and example pairs.
- `js/core.js`: scoring, sketches, graph analysis, projection and generated bytes.
- `js/app.js`: five-page walkthrough and secondary tools.
- `css/style.css`, `fonts/`: navy/cream theme and self-hosted fonts.
- `tools/verify.js`: reproducible numerical checks.
- `tools/verify-walkthrough.js`: scene progression and teaching-content checks.

The `screenshots/` folder contains historical captures; regenerate them before using them as backup slides for this version.

Cohort sizes: MOTH 30, SPINDLE 12, INKLOCK 16, SLATECRYPT 10, DRIFTMINER 7. The graph and projection show all 75 samples with selected labels and full-name tooltips. The red matrix shows all 5,625 cells with every tenth axis label; select samples A/B or click a cell for the exact pair score. This remains a synthetic workflow demonstration, not a reproduction of the paper’s experimental results.
