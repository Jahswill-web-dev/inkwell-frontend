# Experience switcher — approved option 1

final result: passed

## Findings and fixes

- Resolved P2, opening focus: the first browser run left focus on the trigger because the menu was still hidden when focus moved. Focus now moves after positioning has made the popup visible. A subsequent browser run confirmed the selected menuitemradio receives focus; arrows and Escape work from there.
- Resolved P2, Tab navigation: the first keyboard test showed focus landing on the document body after closing the portaled menu. Tab and Shift+Tab now close the menu and move relative to its trigger, skipping hidden/inert controls and navigation hidden by responsive CSS. The enclosing review is not dismissed by the menu’s Escape key.
- Resolved P2, narrow review header: the initial 320px render truncated “Consultant.” Gave the review’s switcher wrapper an explicit bounded width and prevented flex shrinking. The post-fix live browser capture showed the full label; measured trigger width was 170px and label client/scroll widths were both 84px. The menu fit from x=16 to x=304 in a 320px viewport.
- No actionable P0/P1/P2 visual issues remain. P3 differences from the bitmap are small icon geometry, font rasterization, border curvature and approximately 5% component-width variation at desktop scale.

## Source and evidence

Selected source: `design-evidence/experience-switcher/approved-option-1.png`, the first displayed image in the latest three-option set. It shows one compact dropdown design in consultant and content marketing contexts.

Desktop source and rendered captures are 1487 × 1058 at a matching CSS viewport and 1x density. `consultant-final.jpg` captures the consultant selection and `marketing-final.jpg` captures the marketing selection. Only one real menu stays open at a time. `both-contexts.jpg` combines the upper 590px of the consultant capture and lower 468px of the marketing capture into a comparison board showing both states, matching the source specimen’s presentation. This combined bitmap is evidence only, not application UI.

`comparison-full.png` pairs source left and render right at equal 744 × 529 reductions. `comparison-menu.png` pairs corresponding 420 × 265 crops at native scale. Both combined comparisons were opened and inspected. The surrounding specimen content is synthetic context; only the switcher is the design target. Existing application typography, article controls and dashboard content are not redesigned to imitate incidental differences in the generated background.

Additional evidence: `consultant-first.jpg`, `marketing-first.jpg`, `error.jpg`, `review-desktop.jpg`, `mobile-consultant.jpg`, `mobile-marketing.jpg`, and `mobile-review.jpg`. Standard phone checks used a 390 × 844 CSS viewport; content width was 375px with a 15px scrollbar, without horizontal overflow. The menu measured x=16..374. The narrow 320 × 568 view was also inspected live and measured as described above. A corrupted saved narrow screenshot from the browser compositor was discarded; the live capture and measured geometry supplied the narrow check. A fresh isolated review-component preview produced the clean saved `mobile-review.jpg`.

Previous review QA is archived as `previous-review-qa.md`.

## Required fidelity surfaces

Typography: the shared trigger, caption and options use existing Manrope with identical weights and sizes in both experiences. Labels remain single-line; mobile sizes adapt. Existing Newsreader page headings remain unchanged.

Spacing/layout: icon, active label and chevron form one outlined trigger. The matching white popover has a quiet caption and two rows, with a selected checkmark and pale rose highlight. Desktop width is 360px and mobile width is bounded by 16px screen gutters. The menu repositions on resize/scroll, can open above a low trigger, and closes when its anchor leaves the viewport. The marketing switcher sits above the workspace header, aligned right. The review header allows the shared control to shrink to its bounded mobile width without clipping its label.

Colors/tokens: existing navy, crimson, warm paper, white, muted and divider colors. Crimson marks selection; pale blue is a hover surface. Custom focus styling replaces the browser-native blue selection appearance. Reduced-motion preferences disable the loading icon animation.

Assets/icons: existing Phosphor User, Buildings, CaretDown, Check and CircleNotch icons; no generated bitmap, handcrafted icon or screenshot is embedded in the product.

Copy/content: retained “Consultant” and “Content marketing.” The popup caption is “Switch experience.” No new settings, billing, account or workspace-management features were added.

## Behavior and validation

All existing instances use ExperienceSwitcher: consultant layout, the article-review header and marketing WorkspaceHeader. The same implementation and CSS control all placements. The existing PUT experience request, saved preference behavior, destinations and route refresh are retained. Clicking the active option closes without a request. Loading prevents duplicate writes; failure keeps the previous selection and a visible retryable error. The menu is portaled to the nearest dialog when present so review keyboard handling and inert-background behavior remain compatible; otherwise it uses document.body.

35 focused checks passed across switcher, consultant article/review, and marketing dashboard tests. Switcher tests cover both selections and directions, no-op active selection, keyboard navigation, outside dismissal, pending requests and recovery. TypeScript, targeted ESLint, formatting and whitespace checks passed.

Browser checks used temporary development-only contexts with the real shared components and an isolated failing response for the experience endpoint. They verified both selection marks, current-option dismissal, arrows/Escape/Tab, errors, popup placement, phone layout and review containment. Successful persistence/navigation is covered by mocked integration tests; no real user’s preference was switched. Browser error logs were empty. Both temporary preview routes were removed. Backend source/API contracts and authentication rules are unchanged.

## Checklist

- [x] Implement the exact first displayed concept.
- [x] Use the same component in consultant, review and marketing contexts.
- [x] Preserve switching behavior and provide keyboard/loading/error handling.
- [x] Compare source and render in full and focused views.
- [x] Inspect responsive states, retain evidence and remove preview routes.
