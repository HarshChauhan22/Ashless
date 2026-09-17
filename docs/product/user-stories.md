# User Stories — Digital Smoking Room

Companion to [PRD.md](./PRD.md). Grouped by epic; screen references (SCR-xx) match the PRD. Each story follows "As a [user], I want [capability], so that [outcome]," with acceptance notes only where they add something beyond the PRD's own Acceptance Criteria (§X) — the full acceptance criteria for the major features live there, not duplicated per-story here.

---

## Epic: Authentication & Onboarding

- **US-01** As a new user, I want to sign up with just my phone number and an OTP, so that I can start using the app without creating and remembering a password.
- **US-02** As a returning user, I want to stay logged in across sessions, so that I don't have to re-authenticate every time a craving hits (re-authenticating is friction at exactly the wrong moment).
- **US-03** As a new user, I want to set up my usual cigarette brand, price, and daily quantity once, so that the Smoking Room can mirror my real spending without me re-entering it every time.
- **US-04** As a user who smokes more than one brand, I want to save multiple smoking profiles, so that the Smoking Room reflects what I actually smoke, not an oversimplified average.
- **US-05** As a new user, I want to state why I'm trying to quit or cut down, so that the app's tone and coaching feel relevant to my actual reason.
- **US-06** As a new user, I want to choose "cut down" or "quit completely" as my goal, so that the app doesn't assume abstinence is the only valid outcome I'm working toward.
- **US-07** As a new user, I want to set up where my savings should go, so that I trust the app before I ever make a real payment through it.
- **US-08** As a new user, I want to be able to skip the savings-destination setup during onboarding, so that I can get to the app quickly and set it up later when I actually need it.
- **US-09** As a new user, I want to understand why the app is asking for notification permission before the OS dialog appears, so that I can make an informed choice instead of reflexively denying it.

## Epic: Home & Progress

- **US-10** As a returning user, I want to see my smoke-free streak, money saved, and cigarettes avoided the moment I open the app, so that I feel my progress without hunting for it.
- **US-11** As a user having a craving, I want one obvious, thumb-reachable button to tell the app "I WANT TO SMOKE," so that I don't have to think about where to go in the app while I'm already struggling.
- **US-12** As a user who already knows I want to save money right now, I want a direct shortcut to the Smoking Room that skips the check-in, so that the app doesn't slow me down when I've already made up my mind.
- **US-13** As a user, I want to see a breakdown of how my "cigarettes avoided" number is calculated, so that I trust it's a real figure and not a marketing number.
- **US-14** As a user, I want to see my progress as a calendar/streak view, so that I can see patterns (good days, hard days) over time, not just a single number.

## Epic: Craving Intervention

- **US-15** As a user with a craving, I want to quickly note how strong it is and what triggered it, without it feeling like a form, so that I can move on to getting help in seconds, not minutes.
- **US-16** As a user with a craving, I want to be offered a real choice between riding it out (breathing/coach) and going straight to the Smoking Room, so that the app respects that sometimes I just want to log the save, not be coached.
- **US-17** As a user with a craving, I want a guided breathing exercise, so that I have a concrete, quick action to take that doesn't involve spending money or smoking.
- **US-18** As a user talking to the AI craving coach, I want it to remember what I just told it in the check-in (intensity, trigger), so that I don't have to repeat myself.
- **US-19** As a user in the AI coach chat, I want a clear way out to either the Smoking Room or a relapse log at any point, so that the chat never traps me when what I actually need is one of those two things.
- **US-20** As a user, I want to know the AI coach isn't a medical service, so that I have accurate expectations about what kind of help I'm getting.

## Epic: Digital Smoking Room

- **US-21** As a user with a saved smoking profile, I want the Smoking Room to already know what I usually smoke, so that I don't have to re-describe it every single time.
- **US-22** As a user who usually buys single cigarettes, not packs, I want to select a quantity of 1 (or 2, or any small number), so that the amount I save matches what I'd actually have spent right now, not an inflated pack price.
- **US-23** As a user, I want to see the exact rupee amount before I commit to anything, so that there's no ambiguity about what I'm about to pay.
- **US-24** As a user, I want a single tap on the amount to start the payment, so that the moment of commitment is as fast as handing over cash for a cigarette.
- **US-25** As a user without a savings destination set up yet, I want to be prompted to set one right there in the flow (without losing my brand/quantity selection), so that a forgotten setup step doesn't kill my momentum at the moment I actually want to save.
- **US-26** As a user, I want to pay using the UPI app I already use every day, so that I don't have to learn or trust a new payment interface.
- **US-27** As a user, I want clear confirmation once my payment and save have gone through, so that I know it actually worked and my money is safe.
- **US-28** As a user whose payment fails or is cancelled, I want to understand what happened and retry easily, so that a payment hiccup doesn't make me give up on the save (and reach for a real cigarette instead).
- **US-29** As a user whose payment status is genuinely unclear (e.g., bank confirmation delayed), I want to be told honestly that it's still being checked rather than shown a false success or failure, so that I can trust what the app tells me.

## Epic: Quit Wallet & Savings

- **US-30** As a user, I want to see my total money saved in one place, so that I have a single trustworthy number to point to as proof of progress.
- **US-31** As a user, I want to understand that the app isn't holding my money — it's gone straight to my own account — so that I don't mistakenly think I need to "withdraw" it or worry the company controls it.
- **US-32** As a user, I want an itemized history of every save (date, amount, what it represented), so that I can cross-check it against my own bank statement if I want to.
- **US-33** As a user, I want to give my savings a goal (like a purchase I'm saving toward), so that the number means something beyond an abstract total.
- **US-34** As a user, I want to see progress toward a specific savings goal, so that I have a concrete target pulling me forward, not just an open-ended total.
- **US-35** As a user, I want the wallet balance to never appear to drop to zero because of a network glitch, so that I never panic-think my savings disappeared.

## Epic: Relapse Logging

- **US-36** As a user who smoked despite trying not to, I want to log it quickly and without judgment, so that I can be honest with the app instead of avoiding it out of shame.
- **US-37** As a user logging a relapse, I want to record a partial quantity (like half a cigarette or one stick, not just "a pack"), so that the log reflects reality.
- **US-38** As a user, I want my streak to update transparently and honestly after a relapse, so that I trust the number even when it goes down.

## Epic: Settings & Account

- **US-39** As a user, I want to edit my smoking profile (brand, price, quantity) at any time, so that it stays accurate as my habits or the price of cigarettes change.
- **US-40** As a user, I want to change or remove my savings destination at any time, so that I stay in control of where my money goes.
- **US-41** As a user, I want to control which notifications I receive (craving reminders, streak nudges, payment updates) individually, so that I'm not forced into an all-or-nothing choice.
- **US-42** As a user, I want to request export or deletion of my data, so that I have control over sensitive information about my smoking habits.
- **US-43** As a user, I want to find a real support/helpline resource from within the app, so that I have somewhere to go if the app itself isn't enough.
- **US-44** As a user with a payment dispute, I want a clear place to raise it, so that a money problem doesn't leave me stuck with no recourse.

## Epic: Notifications

- **US-45** As a user, I want reminders at likely craving times (based on my own patterns, once available), so that the app can reach me before the craving wins by default.
- **US-46** As a user, I want to be notified when a "pending" payment finally resolves, so that I don't have to keep checking the app manually.
- **US-47** As a user, I want streak/milestone nudges that feel encouraging, not guilt-inducing, so that notifications make me want to open the app, not dread it.

## Epic: Digital Smoking Room — Brand Picker (added 2026-09-16, PRD §I SCR-05/SCR-14)

- **US-48** As a returning user, I want my usual brand pre-selected the moment I open the Smoking Room, so that a normal craving is a near-instant tap, not a search.
- **US-49** As a user who smokes more than one thing, I want my other recently/previously used brands visible without searching, so that my second- or third-most-common cigarette is still fast to log.
- **US-50** As a user looking for a brand I've smoked before but don't see in the short list, I want to search for it by name, so that I don't have to scroll or guess.
- **US-51** As a user whose brand isn't in the app at all (a new brand, a friend's cigarette, something local not on the reference list), I want an obvious "I can't find my brand" option that lets me type it in and keep going, so that an unusual craving doesn't dead-end the flow.
- **US-52** As a user entering a new brand, I want to set its price either as a pack price + cigarettes per pack (so the per-cigarette cost is calculated for me) or as a direct per-cigarette price if I only ever buy loose sticks, so that the price the app uses actually matches how I buy cigarettes.
