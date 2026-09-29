# `backend/src/config/node-version.ts`

> Added after **patch 06** (setup help) · [View the code](../../../../../backend/src/config/node-version.ts)

## What it is for

Answers one question: **is this Node.js new enough?** Our tools need Node.js 22.12 or newer
(Node 20.19+ also works). An older Node doesn't fail cleanly: it breaks inside some package
with a message that has nothing to do with the real cause. So we check first.

Used by [`env.ts`](env.ts.md) (the server refuses to start) and by
[`npm run doctor`](../scripts/doctor.ts.md).

## The code

```ts
export const NODE_REQUIREMENT = '22.12 or newer (or 20.19+)';

export function isSupportedNode(version = process.versions.node): boolean {
  const [major, minor] = version.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19);
}
```

- `process.versions.node` is the running Node's version as text, e.g. `"22.12.0"`.
- `version = process.versions.node` is a **default parameter**: `isSupportedNode()` checks
  the current Node, and `isSupportedNode('18.19.0')` checks any version (handy for testing).
- `'22.12.0'.split('.')` → `['22', '12', '0']`; `.map(Number)` → `[22, 12, 0]`;
  `const [major, minor] = …` takes the first two.
- The rule reads: any version above 22, or 22.12 and above, or 20.19 and above. It's the
  same rule Vite and Prisma use.
