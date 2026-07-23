# Shareable Images

This document designs the exportable image formats for sweep milestones. It is a product/design contract for a future generator, not a generated asset store.

## Formats

- Portrait social: 1080 x 1350, optimized for group chats and social feeds.
- Landscape recap: 1600 x 900, optimized for desktop sharing and TV display.

## Allocation Reveal

- Lead with the sweep name, date, and prize pool.
- Show one card per participant with avatar, participant name, and allocated entries.
- Use flag images for tournament teams and a compact badge/photo slot for player-based sweeps.
- Keep draw order visible only when it is meaningful for the sweep format.
- Include a small rules footer with buy-in and prize split.

## Final Results

- Use a hero winner segment across the top third of the image.
- Show winner name, total prize money, winning entries, and trophy/champion context.
- Rank all participants by prize money, then by furthest run, then alphabetically.
- For each participant show every allocated entry, its exit stage, and prize contribution.
- Fade eliminated or non-scoring entries while keeping the flag/player identity readable.

## Optional Stage Recaps

- Group-stage wrap: group winners paid, active entries remaining, next knockout matchups.
- Knockout preview: active participants, head-to-head sweep clashes, and potential prize paths.
- Live final card: finalist owners, current score, and prize stakes.

## Data Needs

- Reusable participant records and avatars.
- Per-sweep allocation records.
- Per-entry status with active/eliminated/final result.
- Prize-event attribution.
- Event metadata: sweep name, date, type, prize rules, and result source.
- Archived outcome snapshots for completed sweeps so export rendering does not depend on historical match feeds.

## Implementation Notes

- Prefer HTML/SVG templates rendered server-side to keep visual output deterministic.
- Keep templates event-type aware: tournament-team sweeps use flag cards; player sweeps use player/team labels.
- Add authenticated admin export actions before public export endpoints.
