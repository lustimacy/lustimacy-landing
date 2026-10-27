# Venues to list / partner with

> **Rewritten 2026-10-26.** The previous version of this file mixed three
> incompatible categories, including a brothel. Read §1 before adding anything.
> Full context in `WEB_REVAMP_PLAN.md` §2.

## 1. Category rules — not negotiable

| Category | Dutch / German term | List it? |
|---|---|---|
| Lifestyle / swinger club | *swingersclub*, *parenclub*, *Pärchenclub* | ✅ Core |
| Lifestyle party, incl. pop-ups | *parenparty*, Lifestyle-Party | ✅ Core |
| Kink / fetish club night | *fetishparty*, Fetisch-Abend | ⚠️ Events section only, never as a "club" |
| Sauna / wellness | *wellness*, *sauna*, FKK | ⚠️ Case by case — see note |
| **Prostitution venue** | *sexclub*, *privéhuis*, *bordeel*, Bordell, raamprostitutie | ❌ **Never** |
| **Escort** | *escortbureau* | ❌ **Never** |

**Why this matters.** Google Play and Apple both remove apps that facilitate or
promote prostitution or sexual services. Lustimacy was delisted once already
(2026-05-07). A single *privéhuis* in a directory the app links to is a direct
policy hit on an app with a history — and it repels the lifestyle couples who
are the kernel audience.

**The permit does not tell you the category.** In most Dutch municipalities a
swingersclub needs a *seksinrichting* exploitation permit under the local APV
**even with no prostitution on the premises**. "Licensed" therefore proves
nothing either way. The only test that matters:

> **Are paid sexual services offered on the premises? If yes, or if you cannot
> establish that the answer is no, do not list it.**

**Careful with "FKK" and "erotic centre".** In Germany, FKK-*clubs* are usually
paid-services venues, not lifestyle clubs — the name is not a reliable signal.
In the Netherlands, "erotic centre" frequently implies paid services too. Both
need an explicit check, never an assumption from the name.

### Legal note (current as of 2026-10-26)
The **Wet regulering sekswerk** was dropped by the cabinet on **3 April 2026**.
The advertising duties it would have imposed never came into force. What
replaced it is in some ways more relevant: since **1 April 2026**, new
advertisements on sex-work advertising platforms require an identity check on
the poster. Staying entirely out of paid-services listings keeps us outside
that regime. The **Wet gemeentelijk toezicht op seksbedrijven** is heading to
Parliament and may eventually make municipal permit registers a usable,
legitimate data source for this directory — worth tracking.

Confirm all of the above with a Dutch lawyer before launch rather than relying
on this file.

---

## 2. Removed from the previous list

| Entry | Why removed |
|---|---|
| **Pascha Munich** | Pascha is a brothel chain. Prostitution — category ❌. Must never be listed. |
| **KitKat Club** (Berlin) | Fetish/techno nightclub, not a lifestyle club. Different audience and etiquette. Events section at most. |
| **Lab.oratory** (Berlin) | Men-only fetish/cruising venue attached to Berghain. Not lifestyle, not our audience. |
| **Pornceptual** (Berlin) | Art/queer sex-positive party series. Event-based, not a venue. Events section at most. |

---

## 3. Netherlands — the launch focus

Nothing below is verified yet. **Every entry needs §4 completed before it can
move past `draft`.**

### Amsterdam
| Venue | Suspected category | Status | Needs |
|---|---|---|---|
| Same Same | lifestyle / sex-positive party | unverified | category check, format, contact |
| FunHouse Amsterdam | swingersclub | unverified | category check, nights, single-men policy |
| Club Bellini | parenclub (couples-only?) | unverified | category check, couples-only confirmation |

### Utrecht
| Venue | Suspected category | Status | Needs |
|---|---|---|---|
| ~~Erotic Center Wellness~~ | **unclear — "erotic centre" may mean paid services** | **blocked** | Must establish no paid services before any listing. Default to excluding. |

### Rotterdam / Den Haag / Eindhoven
Not researched. NL has a real parenclub scene outside Amsterdam and this is
where the directory can be genuinely better than what exists — start here once
Amsterdam is done.

---

## 4. Required research per venue

Fields map directly onto the `venues` table in `WEB_REVAMP_PLAN.md` §4, so
research should be entered straight into the DB, not into prose.

**Category gate (do this first — stop if it fails):**
1. Paid sexual services on the premises? → if yes or unclear, **stop**.
2. Which category from §1?

**Then:**
3. Legal name + KvK number (existence check via Open KvK)
4. Address, lat/lng, `google_place_id`
5. Website, Instagram, contact email, phone
6. `couples_only`, `single_men_policy`, `dress_code`
7. `entry_price_min` / `max`, `booking_required`
8. Recurring nights → an RRULE, not 52 hand-made events
9. Amenities: lockers, bar, smoking area, condoms provided, parking
10. **`vibe_summary`** — one honest paragraph answering *"will I feel out of
    place?"*. This is the field that makes the directory worth reading.
11. Owner / manager name if findable — materially better cold outreach

**Provenance, for every field:** where it came from and when
(`venue_sources`). A fact read off a website is not the same as a fact the
venue confirmed, and the page must not render them alike.

**Google Places:** `place_id` may be stored indefinitely; ratings, reviews,
photos and most other fields may not. Live enrichment only — never a cached
Places mirror.

---

## 5. Outreach

Unchanged in substance: draft the page first, then email the venue asking them
to correct it. Lowest-friction opener there is, and it doubles as the
claim-your-venue funnel.

Templates: `template-nl.md`, `template-de.md`.

**Target:** 12–20 verified NL venues before the directory goes public. Show
twelve well rather than padding a grid — see `WEB_REVAMP_PLAN.md` §6.
