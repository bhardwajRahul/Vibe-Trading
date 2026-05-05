# Demo / Promo Production Pipeline

This folder holds lightweight planning assets for demo and promo production.

Raw captures in `recordings/` and `screenshots/` should be real product footage from Vibe-Trading. Promo overlays, callouts, highlights, captions, and storyboards are explanatory only: they may guide viewers through the workflow, but they should not imply fabricated product behavior, results, accounts, or data.

Keep committed files tiny. Large recordings, rendered exports, and generated media should stay out of git; the main rollout should add ignore rules for those paths.

## Folders

- `fixtures/`: tiny non-sensitive sample inputs for demos.
- `scenarios/`: scripted demo flows and prompts.
- `scripts/`: quality gates and capture automation.
- `recordings/`: raw product captures.
- `exports/`: rendered promo outputs.
- `screenshots/`: source screenshots from the product.
- `src/remotion/`: promo compositions for 16:9, 9:16, and 1:1 exports.
- `storyboards/`: shot lists, copy drafts, and edit notes.
- `state/`: local demo state snapshots or temporary run metadata.

## Workflow

Install the internal demo toolchain once:

```bash
scripts/record install
```

Start the real app in record mode:

```bash
scripts/record up
scripts/record quality
```

Capture browser footage from a scenario:

```bash
scripts/record capture -- --scenario=demo/scenarios/natural_language_backtest.example.json
```

Capture CLI output from the same scenario:

```bash
scripts/record cli -- --scenario=demo/scenarios/natural_language_backtest.example.json
```

Render promo shells after raw footage exists:

```bash
scripts/record render landscape
scripts/record render portrait
scripts/record render square
```

Use `scripts/record preview` for Remotion Studio.

`scripts/record render` automatically uses the newest Playwright capture manifest in `state/captures/`. To render a specific source, pass a manifest or video path:

```bash
scripts/record render landscape -- --manifest=demo/state/captures/<run>.json
scripts/record render portrait -- --video=demo/recordings/<run>/<video>.webm
```

The current Remotion compositions render a clean promo shell even before raw footage is attached. Once a Playwright capture exists, the render command embeds that real footage and stores the generated prop file under `state/`.
