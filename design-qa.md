# Consultant live interview — approved option 3

final result: passed

## Source and rendered evidence

Source: `design-evidence/consultant-live/approved-option-3.png` (1487 × 1058). The exact approved image supplies the centered orb, listening status, large current question, collapsed transcript, compact article header, elapsed/save state and three bottom actions.

`comparison-full.png` and `comparison-focused.png` show source left and implementation right, inspected together. Chrome used a 1487 × 1058 CSS viewport fitted to the native window. The rendered region (744 × 529 display pixels at 20,154) and source were normalized to identical dimensions. Both show Listening to you with the transcript closed. This is a composition comparison at reduced display density, not a pixel-exact unscaled capture. The implementation uses a real test article, real elapsed time and real question; its Saving status reflects transcript writes. These dynamic differences are intentional.

`desktop-final.png` is the native 1366 × 768 paused handoff, with all three actions visible. `desktop-content.png` excludes browser chrome. `mobile.png` shows the 390 × 844 CSS viewport fitted to 274 × 591 display pixels; `mobile-actions.png` shows the lower portion after normal vertical scrolling. `mobile-transcript.png` shows the working expanded transcript. `console-errors.png` records the empty Chrome console with the level:error filter after the real call.

Earlier preparation QA is preserved in `design-evidence/consultant-live/previous-preparation-qa.md`. `actual-live-desktop.png` records the initial successful live call before the final typography correction.

## Visual findings

Resolved P2: the shared `.main h2` selector initially overrode the current question's display typography. Scoped the live-stage question selector, then recaptured desktop, tall desktop and mobile evidence. The question is now the dominant content element.

No outstanding P0/P1/P2 findings. The layout keeps the approved hierarchy, uncluttered empty space, divider placement and crimson finish action. Laptop spacing reduces the orb and type enough to retain the controls. Mobile stacks metadata and actions, wraps the question, and permits normal vertical scrolling. The expanded transcript has a bounded scrollable area.

Fonts and assets: existing Newsreader and Manrope, Inkwell paper/navy/crimson/muted/divider tokens, the existing voice-orb raster and Phosphor icons are reused. The reference is not embedded in the product. Existing navigation is retained; its font scale and spacing differ from the generated mock. P3: the existing orb artwork and real fonts have slightly different glow, weight and rasterization from Image Gen; this does not impair the selected composition. P3: the transcript disclosure retains its Show transcript label while open; its chevron and native expanded state communicate the toggle.

## Behavior and backend connection

The real authenticated voice test succeeded. The server registered a pending question, the matching spoken transcript and browser audio activity allowed the client to acknowledge delivery, and the backend stored a delivered current question with its voice session and saved transcript item IDs. A subsequent resumed call displayed the saved question and then updated it to a new follow-up. Pausing stopped microphone capture and retained the question. No draft generation was started by these smoke tests. Two clearly named local QA articles remain available; existing user articles were preserved.

The frontend polls current-question state while the interview is active, uses exact backend question text, checks matching interviewer fragments from the same voice session, and waits for successful transcript persistence before delivery acknowledgement. It handles interrupted/blocked playback, stale sessions and temporary acknowledgement failures. It exposes actual save state, audio recovery, transcript disclosure, mute, pause/resume and finish controls. Pause uses a pausing label rather than a draft-creation label.

Playback observation uses Web Audio samples from the remote MediaStream while retaining the HTML audio element for normal audible output. It is a client playback observation combined with matching saved words, not proof that a listener heard every word or that OS volume was audible. Brief silence is not by itself treated as sufficient transcript evidence. No provider-supplied deterministic per-question playback-complete event is available in the existing Live event flow.

## Validation

- 13 frontend tests passed across the consultant conversation hook, interview screen, audio observer and realtime hook. Coverage includes playback plus saved evidence before acknowledgement, interrupted/blocked/stale observations, retry, ordered fragments, remote audio attachment, quiet-triggered transcript flushing, explicit microphone start and completion behavior.
- TypeScript, targeted ESLint, Prettier and git whitespace checks passed.
- Browser checks covered actual connected/listening, paused, transcript closed/open, laptop, tall desktop and mobile states. No visible application console errors remained after the final call.
- Backend `/health` returned ok and `/ready` returned ready. PostgreSQL container is healthy; API and consultant worker processes are running. Database migrations are at head. Earlier backend validation passed 72 focused tests plus Ruff and mypy; backend source was not changed during this UI pass.

## Completion checklist

- [x] Implement the selected live-screen layout using existing brand assets.
- [x] Connect exact current-question state to the realtime interview.
- [x] Verify a real approved microphone call and persisted delivery.
- [x] Check responsive and transcript states, compare source and render together.
- [x] Resolve P2 typography and pass focused automated checks.
- [x] Leave local services running with the microphone stopped.
