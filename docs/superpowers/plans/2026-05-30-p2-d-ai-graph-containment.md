# P2-D AI And Graph Containment Plan

## Goal

Turn AI and graph from legacy/demo-feeling modules into contained workbench modules with honest status, bounded performance cost, and no interference with the chat transcript workflow.

## Scope

- Replace legacy `AppleButton` use in semantic/graph visible flows with current design-system primitives or a purpose-built compact control.
- Keep AI configuration states honest: unconfigured, testing, configured, indexing, ready, failed, and unavailable.
- Keep graph rendering lazy-loaded and isolated from the default workbench route.
- Address the persistent `GraphModule` chunk warning with one of:
  - deeper lazy loading of Three.js/R3F-only graph canvas code,
  - route-level module splitting,
  - documented chunk-size exception if the lazy chunk is acceptable after smoke and memory checks.
- Respect reduced-motion and avoid large list/canvas entrance animations.

## Known Inputs From P2-B Review

- `GraphModule` still builds as a chunk larger than Vite's 500 kB warning threshold.
- The warning is not a P2-B release blocker because the graph module is lazy, but it must be measured and explicitly accepted or reduced before final release readiness.
- Semantic setup still has legacy modal/button patterns and should be handled as a focused module polish, not folded into chat workbench code.

## Verification

- `pnpm build` with recorded chunk output.
- Browser smoke opening graph and AI modules from the workbench.
- Canvas nonblank check and narrow-width fallback check.
- No Graph/AI code in the initial core chat route chunk beyond lazy import glue.
