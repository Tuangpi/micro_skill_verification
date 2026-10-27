# Bilingual and Accessibility Notes

- Supported languages: English (`en`) and Burmese (`my`).
- Language preference is stored in `localStorage` and applied through a React context.
- Burmese rendering uses the `Noto Sans Myanmar` font fallback in the sans-serif stack.
- Responsive layout uses Tailwind mobile-first breakpoints (`sm`, `md`, `lg`) and flexible grids.
- Keyboard focus is visible through a global `:focus-visible` outline.
- ARIA: health status region uses `aria-live="polite"`.

## Known Gaps / Manual Review Limits

- Full feature screens (courses, payments, quizzes, certificates, earnings, payouts) are not yet implemented in the frontend; localization covers the available foundation screens only.
- Burmese copy is a draft and requires review by a qualified translator before production.
- No automated end-to-end or accessibility audit (Playwright/axe) is configured yet; manual keyboard and screen-reader checks are required.
- Mobile/tablet/desktop layouts should be re-verified as feature screens are added.
