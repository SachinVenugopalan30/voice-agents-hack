# Results Screen Redesign Specification

> Redesign the post-analysis results screen to feel like a polished AI triage cockpit for a 30-second YC demo, without changing the data contract or hiding any existing output.

## 1. Goal

The current results screen is functionally correct but visually flat. The redesign should preserve the warm, trustworthy visual language already established in the app while making the results feel more premium, layered, and demo-ready on a mirrored iPhone screen.

Success criteria:

- The first viewport immediately communicates that the system calculated risk, explained the drivers, and generated an action plan.
- The screen remains readable when shown from an iPhone simulator on a MacBook.
- All existing `cloudResult` data continues to render.
- No changes are made to the store shape, result parsing, or result generation flow.

## 2. Scope

In scope:

- Visual redesign of the ready state in `ResourcePlanScreen`
- Visual polish for the existing loading, queued, error, and empty states
- Enhancements to the existing cloud result UI components so they feel part of one coherent report surface
- Stronger hierarchy, card treatment, spacing, ranking, and summary presentation

Out of scope:

- Any change to the API response shape
- Any new interaction that hides data behind expansion, tabs, or gestures
- Any change to navigation flow
- Any new backend-derived fields

## 3. Design Direction

The results view should shift from a plain stacked document to an executive-summary-first report.

Design principles:

- Preserve the current palette family: warm neutrals, deep teal, amber, and red
- Increase perceived sophistication through layering and hierarchy, not through novelty that breaks consistency
- Bias toward “AI triage cockpit” rather than “clinical form”
- Make the first screen feel decisive and information-rich without becoming dense or noisy

## 4. Information Architecture

The screen continues to render the same content, but in a different order and grouping.

### 4.1 Hero Report Panel

The top section becomes a large, elevated report surface containing:

- A small eyebrow label such as `AI TRIAGE REPORT`
- A concise status line describing urgency
- The existing risk score as the visual focal point
- A short supporting sentence synthesized from existing data counts and severity band, not from new backend fields
- A compact metrics row showing:
  - risk factor count
  - protective factor count
  - action item count
  - program match count

This panel must fit within the initial viewport and make the product feel substantially more advanced in under two seconds.

### 4.2 Detail Cards

Below the hero panel, the existing content is regrouped into elevated cards:

- `Primary Drivers`: all risk factors, with the top of the section feeling prioritized and sharper
- `Stabilizers`: all protective factors, presented in a calmer card
- `30-Day Action Plan`: the full existing timeline
- `Eligible Programs`: the full existing program match list

No item is dropped. If lists are long, they still render in full within the existing scroll model.

## 5. Component Changes

### 5.1 `ResourcePlanScreen`

This screen becomes the main composition layer.

Responsibilities:

- Build the executive summary layout from the existing `cloudResult`
- Keep all current non-ready states functional
- Derive presentational summary copy from current fields only
- Render the complete downstream detail sections

No business logic or state shape changes are allowed here.

### 5.2 `RiskScoreBadge`

The badge should feel more premium and integrated into the hero panel.

Changes:

- Stronger visual weight
- Better framing around the score and label
- Styling that works inside a richer parent container

Constraints:

- Continue accepting the existing `score` prop
- Continue reflecting the same risk bands

### 5.3 `TimelineView`

The timeline should read more clearly as an analyst-generated action sequence.

Changes:

- Stronger day markers
- Clearer vertical rhythm and separation
- Better card integration and readability

Constraints:

- Continue rendering every existing entry
- Preserve current category semantics

### 5.4 `ProgramMatchCard`

Program cards should feel ranked and recommendation-oriented rather than generic list items.

Changes:

- More deliberate header treatment
- Better emphasis on match likelihood
- Cleaner hierarchy between program name and reason

Constraints:

- Continue rendering all matches with the existing `match` prop
- Do not collapse or truncate the meaning of the reason text

## 6. Visual Treatment

The redesign should create more perceived depth using:

- Larger surface contrast between background, hero panel, and cards
- Heavier but still restrained use of borders and shadows
- Stronger typography hierarchy at the top of the screen
- Denser metadata rows that imply intelligence and structure
- Refined chip treatments for risk and protective signals

The visual direction should remain consistent with the app’s current identity. It should look like a more mature version of the same product, not a separate design system.

## 7. Data Preservation Requirements

The redesign must preserve all currently visible outputs:

- risk score
- all risk factors
- all protective factors
- full timeline
- all program matches

Additional preservation rules:

- Loading, queued, error, and empty states must still render correctly
- Existing state selectors and result parsing must remain unchanged
- No data may be hidden behind user interaction
- The screen must remain a simple vertical scroll

## 8. Demo Constraints

This work is optimized for a live YC-style demo:

- The first screen must be legible when mirrored from iPhone to MacBook
- Key value must be visible before scrolling deep into the page
- The UI should imply backend sophistication quickly, even if the content volume is modest
- The screen should feel polished enough to support a 30-second pitch without narration doing all the work

## 9. Validation

Implementation is complete when:

- The results screen renders the same dataset as before
- The first viewport has a clear executive summary
- Supporting components visually match the new report style
- Non-ready states still work
- No TypeScript or React Native errors are introduced by the redesign

## 10. Risks And Mitigations

Risk: The redesign becomes too dense for a mirrored mobile demo.
Mitigation: Keep the first viewport summary-heavy and move full detail into clean cards below.

Risk: Styling changes accidentally imply missing or reordered data.
Mitigation: Preserve all current fields and keep section labels explicit.

Risk: Child components look visually inconsistent after the screen redesign.
Mitigation: Apply coordinated updates to the badge, timeline, and program cards as part of the same pass.
