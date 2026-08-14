# Product

## Register

brand

## Users

Local patients in Kharghar, Navi Mumbai (families, working adults, parents booking for kids), mostly on mobile, arriving from the Google Business Profile or Instagram. Job to be done: judge trust in under a minute, see which treatments are offered, and book with the least friction (WhatsApp or a call, never email).

## Product Purpose

Single-page marketing site for Evara Dental Clinic, run by Dr. Kshitija P Pervi, B.D.S (MUHS), Reg No. A-44613. Success = an appointment request sent (WhatsApp form or tap-to-call). No backend: the form composes a pre-filled WhatsApp message.

## Brand Personality

Calm, precise, plain-spoken. Layout and section grammar follow a client-approved "Lumina Dental" reference comp. Color and type come from the client's style guide.

## Design tokens

| Role | Value | Notes |
|---|---|---|
| Neutral (page) | `#F8F9F8` | guide, verbatim |
| Primary sage (fills) | `#8FBAB6` | guide, verbatim: buttons, pills, icon chips |
| Primary sage (ink) | `#4F7873` | **darkened** so icons/stars clear 3:1 |
| Secondary (body text) | `#595959` | **darkened from guide's `#7A7A7A`**, which failed 4.5:1 on all four backgrounds |
| Tertiary (bands) | `#EAE4DA` | guide, verbatim |
| Dark (buttons/text on sage) | `#2C3937` | guide |

Type: Noto Serif headlines, Hanken Grotesk body (both from the guide).

**The guide's own values could not meet WCAG AA where the color had to carry contrast.** Guide values are kept verbatim wherever they are used as *fills* with dark content on top; they are darkened only where the color itself is the text or the meaningful icon. If the client insists on literal fidelity, revert `--gray` and `--sage-ink` in `styles.css` and accept the AA failures.

## Anti-references

- Blue-and-white template dental sites with toothy stock grins and gradient buttons.
- Corporate hospital-chain coldness (Apollo/Clove-style directory pages).
- Luxury-spa voice ("sanctuary", "curated", "elevate", "world-class"). The audience is local families judging trust quickly, not a wellness resort.
- Generic AI landing-page grammar: eyebrow labels over every section, hero metrics.

## Design Principles

1. **Real photography only.** The clinic's own interiors and community dental camps carry the page. No stock.
2. **One tap to a human.** Every fold offers WhatsApp or a call; tap targets meet 44px.
3. **Credentials carry trust.** Real registration number and qualification; review placeholders stay clearly marked until real GBP reviews are supplied.
4. **Plain language.** Prices in writing, options explained, no upselling. The copy should sound like the doctor, not a brochure.

## Imagery

Section photography is the clinic's own (`images/`): four interior shots of the Kharghar practice and three from the team's free community dental camps. Served as WebP via `<picture>` with 600w/960w `srcset`, with JPEG fallbacks. Treatment cards use SVG icons rather than photos by design.

The hero uses a full-bleed background video (`videos/hero-smile.mp4`, muted/looping/inline, with `images/hero-poster.jpg` as poster and reduced-motion fallback). NOTE: this clip is AI-generated stock of a generic person, not the clinic or Dr. Pervi, and the subject does not match the local patient demographic. It was added at the client's request and is the one exception to the real-photography principle; swap for genuine clinic footage when available.

## Accessibility & Inclusion

WCAG 2.2 AA. Verified: all 21 text/background and non-text pairs pass contrast; no tap target below 24px; skip link; `role="img"` on star ratings; `aria-invalid` + `aria-describedby` on form errors; reduced-motion alternatives for every animation; no horizontal scroll from 320px up.

## Known gaps

- Clinic address is read off the camp banner: "Shop No. 07, Sector 18, Kharghar, Navi Mumbai". **The building name was illegible and is still missing.**
- The three patient reviews are representative samples, not real Google reviews.
- No photo of Dr. Pervi yet; the monogram placeholder shows until `images/dr-kshitija.jpg` is added (see comment in `index.html`).
- Camp photos show identifiable patients; confirm consent before the site goes public.
