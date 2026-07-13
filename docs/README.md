# Engineering Documentation

- [`headline-engine.md`](headline-engine.md): complete source of truth for the
  animated headline's product intent, semantic model, generation architecture,
  text-editing runtime, Unicode and formatting invariants, telemetry, testing,
  maintenance boundary, and change checklist.
- [`resume.html`](resume.html): the single editable source for the accessible,
  one-column résumé served from `public/Timothy-Cisneros-Resume.pdf`.
- [`github-profile/README.md`](github-profile/README.md): publish-ready content
  for the `timcisneros/timcisneros` GitHub profile repository.
- [`github-profile/PROFILE.md`](github-profile/PROFILE.md): verified public bio
  and recommended repository pin order.

Regenerate the PDF with:

```sh
npm run resume:build
```

The exporter produces a one-page US Letter PDF and preserves document tags
and link annotations for accessibility.
