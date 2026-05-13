---
title: Why private photos matter (and why most dating apps get it wrong)
description: Public-by-default photos are a liability for lifestyle daters. Paywalled photos are a bad compromise. Here's what a real solution looks like, and how Lustimacy built it.
slug: private-photos-dating-apps
locale: en
published: 2026-05-12
updated: 2026-05-12
author: Abed
tags: [Privacy, Product]
---

If you're using a dating app and you're not entirely monogamous, photos are a problem.

Public-by-default photos mean your face is indexable by Google. Reverse-image-search tools can connect your dating profile to your LinkedIn in seconds. That's fine on Hinge, where the whole community is mainstream-dating-mainstream. It's a real problem on any lifestyle app, where the user base includes teachers, doctors, lawyers, executives, and parents who have very legitimate reasons to not be findable.

The standard solutions are bad. Let's walk through them.

## Solution 1: just don't upload photos

This works for exactly zero apps. No photos = no matches. Dating apps are visual. Pretending they aren't loses you 95% of your potential matches.

## Solution 2: upload heavily filtered / cropped / face-blurred photos

The honest workaround that most lifestyle users do. It works, but barely. You sacrifice match quality (your matches see less of you) for privacy (Google sees less of you). The trade-off is real.

## Solution 3: "Premium feature — pay to unlock private photos"

Most lifestyle apps with a private-photo feature paywall it. Joyclub did this for years. Some smaller apps still do.

The problem: paywalling private photos creates the wrong incentive. The app benefits when people *don't* feel safe enough to use it without paying. That's a perverse outcome.

It also means private photos accumulate access requests. *"Please can I see your private gallery?"* becomes a thing you say or hear 50 times a week. It's exhausting, and it shifts the burden of trust to the user — you have to decide, for each new person who asks, whether they're "trustworthy enough." That's not a feature; that's a moderation queue you didn't sign up to run.

## Solution 4: "Private albums you share manually"

A small step better — you maintain a private album and *send* it to specific matches. Removes the "anyone can request" problem, replaces it with "I have to remember who I sent to and revoke when I change my mind."

Still way too much friction. Not built for the way conversations actually move.

## What we built at Lustimacy

After watching every solution fail, we landed on this:

**Public profile photos** are the only photos visible before a match. They can be face-blurred, cropped, edited to your comfort level — that's your call. Their job is to be *enough* for someone to decide whether to swipe right. Not maximum information; minimum-viable identity.

**Private photos** are stored encrypted, with metadata stripped. They are *never* visible to anyone — including Lustimacy staff — until a mutual match.

When you and another user both swipe right, the match is created. At that moment:

- The other person's profile is unlocked to you, including their private photos.
- Your profile is unlocked to them, including your private photos.
- Both of you see blurred placeholder cards in the private section before the match completes — *something is there*, but its content is hidden.

This means:

- **You don't get asked.** No "can I see your private album?" requests, because there's nothing to ask for. It's automatic on match.
- **You don't have to decide.** No "do I trust this person enough to send my album?" because the decision is just "do I swipe right?" — the same decision you were already making.
- **It's free.** Every account, free tier or premium. We do not paywall the thing that makes the app safe to use.
- **It's bilateral.** Both sides see, or neither sees. There's no asymmetric reveal where one person flashes a private album to incentivize the other.

This is the kind of feature that's hard to describe but obvious once you've used it. It removes a category of work from your mind. You can have private photos that are actually private, and they show up at the moment they're useful — when there's already mutual interest.

## What "encrypted, metadata stripped" actually means

A few technical details for the curious:

- When you upload a private photo, we strip all EXIF metadata (camera model, GPS coordinates, timestamps) before storing.
- Photos are stored in a private Supabase Storage bucket with row-level security: rows are only readable by users who have a confirmed mutual match with the uploader.
- The photo URLs are signed with short expiration (10 minutes) and rotated. You can't share a link to your private photo with someone you haven't matched with — the URL won't load.
- We never run automated content analysis on private photos. They go into storage, encrypted at rest, and are surfaced only to matched users.
- If you delete a photo, it's purged from storage within 24 hours.
- If we ever need to investigate abuse (reports of an inappropriate image), the only people who can view private photos are the assigned moderator and only via a logged, audited process. There's no admin "browse all private photos" button. There never will be.

We expect to publish a more detailed privacy whitepaper before launch.

## Why this matters more than any other feature

Most dating apps compete on match quality, profile quality, conversation features. Those are real. But for the lifestyle user, the meta-question is always: *is this safe to use at all?*

If the answer is no, no amount of swipe quality matters. The app becomes useless past the curiosity phase.

We think of private-photos-at-match as a *baseline*, not a feature. Verification: baseline. Real moderation: baseline. Private photos at match: baseline. The match quality, the linked-couple-profiles, the travel mode — those are *features*, and we'll keep building them. But the baseline is non-negotiable.

If a lifestyle dating app launched in 2026 doesn't have something like this, it's missing the point of the entire category.

## What's still imperfect

A few things we haven't solved and want to be honest about:

- **Screenshots.** No app can prevent the person you matched with from screenshotting your private photo. We don't pretend to solve this. We do notify the photo's owner if a screenshot is detected on Android (this is a system-level signal). It's a deterrent, not a guarantee.
- **Account compromise.** If someone steals your password and logs in as you, they can see your matches' private photos. Two-factor authentication is on the roadmap for next quarter. In the meantime, use a strong unique password and verify your account email.
- **Re-uploads.** A bad actor could match with you, screenshot your private photo, and reupload it elsewhere. We can't stop this technically. We can prosecute it (community ban + legal recourse if egregious) — but the better defense is selective swiping, not selective tech.

We're not selling magic. We're selling a serious effort at a real problem, with the trade-offs spelled out.

## What this looks like in the app

In the Lustimacy app:

- The "Photos" section of your profile has two tabs: **Public** and **Private**.
- The Public tab is what shows in the swipe deck. Aim for 3–6 photos that represent who you are at the level of "stranger can decide if they're interested."
- The Private tab is everything else. As intimate as you want. We recommend 5–15 photos. These show up to matches only.
- When you match with someone, both private sections unlock simultaneously, with a small "First photo just unlocked" notification.
- You can revoke a match — and the unlock — at any time. If you unmatch, your private photos disappear from their app, and theirs disappear from yours.

This is what we mean when we say private photos are a *baseline*. They work like you'd expect them to work, with as little ceremony as possible.

---

*Written by Abed, founder of [Lustimacy](/). The waitlist is open if this is the kind of design thinking you want in a dating app you trust.*
