# Module 3: S3 — design

Date: 2026-11-09. Status: approved by the learner on 2026-11-09. Builder check done; its questions are answered in the text.

## Intent and why

AWS Atlas is a local interactive course the learner uses to teach themself AWS. Module 1 used long text, which the learner skipped. Module 2 swung the other way (one-line captions only), and the learner said: *"the whole thing is only single-line text, so I am not understanding that much. Add a little explanation too, easy explanation."*

Module 3 teaches **Amazon S3** in Module 2's visual-first style, **plus a short, easy explanation above each visual**. The visual still does the teaching. The explanation makes sure the learner knows what they're looking at and why it matters before they play with it.

Modules 1 and 2 stay as they are. The learner chose not to add explanations to Module 2.

## Decisions the learner made

| Topic | Decision |
|---|---|
| Topic | Amazon S3 (file storage) |
| Style | The same as Module 2: big visuals, challenges inside the visuals, simulations only |
| Explanations | **Short text above each visual**: 3–4 easy sentences with an everyday comparison, **always visible**, then the "Try it" line, then the visual |
| Story | Keep **Mealhop**, the food delivery app from Module 2, in the Mumbai Region |
| Length | **6 lessons, about 10 minutes each** |
| Lessons | 1 Buckets and objects (with copies in 3 zones in 3D) · 2 Who can see a file · 3 Storage classes · 4 Versioning · 5 Lifecycle rules · 6 Final challenge |
| Website hosting | Not included (the learner chose the plan without it) |

## Goals

1. A learner who reads each explanation once and plays with every visual understands every idea in the module.
2. Every idea is taught by something the learner **does** (drags, toggles, uploads, deletes, breaks, runs time forward) and **sees change**.
3. Each lesson has **at least one challenge** using the shared `Challenge` panel: a goal, live status, a success moment with a one-line "why it worked", Hint after 2 failed tries, Show me after 3, Reset.
4. Facts are correct against docs.aws.amazon.com (same standard as Modules 1 and 2).
5. The module feels like part of the same site: same tokens, fonts, components and diagram language.

## Non-goals

- Adding explanations to Module 1 or 2.
- Real AWS console tasks, CLI exercises, or anything that needs an AWS account.
- Static website hosting, CloudFront, S3 event notifications and Lambda triggers.
- Replication (same- or cross-Region), Object Lock, MFA delete, access points, ACLs, S3 Express One Zone, S3 Tables, S3 Vectors, Transfer Acceleration, Requester Pays, Storage Lens and inventory. Replication, Object Lock and MFA delete may appear as tappable terms only.
- KMS key management. "Encrypted by default" is shown, but key types are not taught.
- Exact live AWS prices (see "Prices").

## Anti-goals (fails even if it "works")

- **Walls of text.** An explanation longer than 4 sentences, or a paragraph that tries to replace the visual.
- **Explanations full of jargon.** If an explanation needs a term, the term is wrapped in `<Term>`, and the sentence still makes sense to someone who doesn't tap it.
- **Teaching an unsafe pattern as the answer.** For example, making the bucket public to let customers see photos. The sim may let the learner try it, but it must show the consequence (a leak) and never count it as success.
- **3D as decoration**, a **challenge the learner can get stuck on**, **wrong AWS facts**, and **ambient motion**, all as in Module 2.

## Text rules (hard limits)

| Piece | Limit | Where |
|---|---|---|
| Lesson intro | 1–2 sentences, ≤ 40 words, sets up the story problem | the single `Prose` block at the top |
| Explanation | 2–4 sentences, ≤ 70 words, always visible | directly above each teaching visual; **at most 2 per lesson** |
| "Try it" line | 1 sentence, ≤ 22 words: what to do and what to notice | `Bench` `intro` (the existing caption) |
| Labels inside visuals | short; buttons, readouts, tags, tooltips | anywhere in the visual |
| Challenge feedback | 1 sentence: what happened and why | the `Challenge` success/fail line |
| "In real AWS" | at most 1 per lesson, 1–2 sentences | `Callout kind="real-aws"` |

- **Layout of a lesson:** intro → for each teaching visual (1 or 2): explanation, then its `Bench` → the challenge → "Your file store so far". A challenge may sit inside the last visual's `Bench` or in its own `Bench`; **a challenge `Bench` gets no explanation** (its goal line and "Try it" line are enough). The file-store diagram has only its caption. So a lesson shows at most about 40 + 2 × 70 words of explanation text, plus short captions and labels.
- Each lesson has **at least one everyday comparison** in an explanation (a cupboard, a shelf, a locked door, an "undo" button, a filing clerk).
- Plain words, pitched for a beginner. Every AWS term is wrapped in `<Term>`. Reuse existing glossary keys and never redefine them. Some S3 keys already exist from Module 1: `s3`, `bucket`, `object`, `object-key`, `encryption`, `identity-based-policy`, `resource-based-policy`, `explicit-deny`. Others to reuse include `instance`, `iam-role`, `instance-profile`, `ebs`, `ebs-snapshot`, `availability-zone`. Add new keys in each lesson's `terms.ts`.
- No `Takeaways` lists and no "Check yourself" quizzes. "Your file store so far" replaces them.
- Build a small shared explanation component (e.g. `Explain` in `src/components/lesson.tsx`, marked with a `data-explain` attribute). Extend `src/test/textBudget.ts` so Module 3 lessons are checked against the limits above (including at most 2 explanation blocks per lesson), and add a module test that runs it on every Module 3 lesson, like `src/modules/ec2/module.test.tsx` does. Module 2's limits stay unchanged.

## Story: Mealhop's files

Mealhop runs on the servers built in Module 2. In Module 3 it needs one place for all its files. The file types below drive every lesson, so define them once (e.g. `src/modules/s3/story.ts`, reusing the app name and Region from `src/modules/ec2/story.ts`):

| Prefix | What | How it's used |
|---|---|---|
| `menu/` | photos of each dish | read all day by the app's servers; can't be re-created without a photo shoot |
| `receipts/` | a PDF per order | the customer may download theirs; rarely read after a month; Mealhop's accountant wants them kept 7 years (a story rule, not a legal claim) |
| `delivery/` | "delivered" photos taken by riders | needed only if a customer complains, within 30 days; then useless |
| `backups/` | nightly database exports | almost never read, but needed fast if something breaks; keep 30 days |
| `reports/` | daily sales reports | made each night from the database, so they can be re-made at any time; managers open them a few times a month |

Customers see menu photos **through Mealhop's servers**, which read the bucket with their IAM role (the role from Module 2, lesson 4). The bucket itself is never public. Serving files straight to customers worldwide (CloudFront) is a later module.

## Shared pieces (build before the lessons)

1. **`Explain` component and text-budget limits** (see Text rules).
2. **Storage-class table**: one data file in the module folder with each class's example price per GB-month, retrieval fee, time to first byte, minimum storage duration and how many AZs hold the data. Lessons 3, 5 and 6 all read from it so numbers never disagree.
3. **"Your file store so far" diagram** (replaces Module 2's `SetupDiagram` for this module; built once with a `step` prop, the same for every learner). Drawn with `Boundary` and `ServiceTile`:
   - The **S3 bucket is regional**: it sits inside the Mumbai Region boundary but **outside the VPC**, drawn as spanning the AZs.
   - Mealhop's servers (one grouped tile, "from Module 2") sit inside the VPC.
   - The server role (IAM, global) sits outside the Region, as in Module 2's diagram.
   - Steps: (1) bucket with its prefixes · (2) Block Public Access shield, server role reading `menu/`, a time-limited link to a customer · (3) a storage class badge per prefix · (4) versioning on · (5) lifecycle arrows per prefix · (6) everything together. The piece each step adds is highlighted.
4. **Module skeleton**: `src/modules/s3/index.ts` (`id: 's3'`, `number: 3`, `covers: ['s3']`, six 10-minute lessons), appended to `modules` in `src/course/registry.ts`.

## The six lessons

Lesson ids are the builder's call. Each lesson has 1–2 visuals, each with its explanation above it, and at least one challenge. Facts listed are the ones to teach; the fact auditor checks each one.

### 1. Buckets and objects *(3D in visual B)*

- **Explanation idea:** S3 is like a huge cupboard AWS looks after. A **bucket** is a named cupboard in one Region; each file you put in it is an **object**, found by its name, the **key**.
- **Visual A: make a bucket and fill it.** Name a bucket and pick the Region (Mumbai). Facts: bucket names are **globally unique** (another account may already own `mealhop`), 3–63 characters, lowercase letters, numbers, dots and hyphens. Drag Mealhop's files in; each gets a key such as `menu/dosa.jpg`. A toggle shows that "folders" are just the start of the key (a **prefix**): the bucket is flat.
  - Facts to show as labels: an object is the file's data + its key + metadata; a bucket holds any number of objects; one object can be up to **50 TB**; you pay for the storage you use (no disk size to pick, unlike EBS).
- **Visual B (3D): where your file really lives.** Upload a photo and watch S3 Standard store it on devices in **at least 3 AZs** in the Region. The learner can break a data center or a whole AZ, and the photo still loads. Contrast with Module 2: an EBS volume lives in **one** AZ. Durability, as a label or tag: S3 is designed for 99.999999999% ("11 nines") durability. In AWS's own example, if you store 10,000,000 objects you can expect to lose one about once every 10,000 years. Reuse the 3D Region look from Module 2 lesson 6 where it fits, and follow the same 3D rules (lazy load, WebGL fallback, controls outside the canvas, `Bench tone="screen"`).
- **Challenge: "Stock the menu."** The app asks for specific keys (e.g. `menu/dosa.jpg`, `menu/biryani.jpg`). The learner creates a bucket with a valid, unused name and uploads each photo under the key the app expects. Success: the app's menu shows every photo.

### 2. Who can see a file

- **Explanation idea:** A new bucket is like a locked room only you have the key to. You let others in on purpose: a pass for your servers, or a ticket that expires for a customer.
- Facts:
  - New buckets and objects are **private**. **Block Public Access** is on by default for new buckets.
  - Access is given by **IAM policies** on users and roles (e.g. Mealhop's server role) and by **bucket policies** on the bucket itself. An explicit deny beats any allow (link to Module 1's policies lesson).
  - A **presigned URL** lets whoever has the link do one thing, such as download one file, until it expires. It works only if whoever signed it is allowed to do that thing, and it stops working early if the credentials that signed it expire first.
  - In the story, **Mealhop's servers sign the link with their IAM role** (Module 2 taught: a role on the server, never a stored key). So the role needs read access to `receipts/` as well as `menu/`. A link signed with a server role's temporary credentials lasts **at most 6 hours** (check the exact limit in the S3 docs on presigned URLs). The 7-day maximum, which applies only to links signed with a long-term user key, can appear as a short tag but is not something the learner sets.
  - S3 **encrypts every new object at rest by default**. Show it as a small padlock on each object; don't teach key types.
- **Visual A: requests at the door.** As in Module 2's security group lesson, requests fly at the bucket as dots: the server role reading `menu/`, customer #1042 asking for their receipt, a stranger trying to list the bucket, a bot trying to read `receipts/`. The learner grants access (role policy, bucket policy, presigned link) and dots pass or bounce. A tempting "Make public" switch is blocked by Block Public Access. If the learner turns Block Public Access off and makes the bucket public, the bot reads receipts and a "files leaked" counter goes up.
- **Visual B: a link that expires.** The server makes a presigned link for `receipts/order-1042.pdf`. The learner picks how long it lasts (minutes up to the role's limit), then moves a clock forward and clicks the link before and after it expires.
- **Challenge: "Right people only."** The servers can read `menu/` and `receipts/` through their role, customer #1042 downloads only their own receipt through a link the server signed, nobody else reads or lists anything, Block Public Access stays on, and files leaked = 0.

### 3. Storage classes

- **Explanation idea:** Like a restaurant's storage: the front counter is quick but costly, the basement is cheap but slow to fetch from. S3 has "shelves" (**storage classes**) that trade the price of keeping a file against the time and fee to get it back.
- Facts (classes to include, with their trade-offs):
  - **S3 Standard**: frequently used data, milliseconds, ≥ 3 AZs.
  - **S3 Intelligent-Tiering**: moves objects between access tiers automatically based on use; small per-object monitoring fee; no retrieval fees.
  - **S3 Standard-IA** (infrequent access): milliseconds, lower storage price, a per-GB retrieval fee, 30-day minimum storage charge.
  - **S3 One Zone-IA**: like Standard-IA but stored in **one AZ**, so data is lost if that AZ is destroyed. Only for data you can re-create. Be exact in the sim: an AZ that is **destroyed** loses One Zone data; an AZ that is only **down for a while** makes it unreachable until the AZ is back, not lost.
  - **S3 Glacier Instant Retrieval**: milliseconds, for data read about once a quarter, 90-day minimum.
  - **S3 Glacier Flexible Retrieval**: minutes to hours, 90-day minimum.
  - **S3 Glacier Deep Archive**: the cheapest; standard retrieval within 12 hours; 180-day minimum.
  - Check every number against current AWS docs; if a retrieval time or minimum shown differs, the docs win.
- **Visual A: the shelves.** Drag one file between classes and watch four readouts change: monthly storage cost, fetch fee, time to get it back, and how many AZs hold it.
- **Visual B: the month.** Mealhop's five file types (see Story) each sit on a shelf. Running a month plays scripted fetches (the app reading menu photos all day, one complaint needing a delivery photo within a minute, a restore needing last night's backup, a manager opening a few reports) and an event where one AZ is destroyed (a fire or flood).
- **Challenge: "Cheapest month that still works."** Bill under budget, every fetch served within its deadline, and no file lost when an AZ is destroyed. One Zone-IA is the right choice only for `reports/` (rarely read and re-made from the database), so it is a real option, not just a trap.

### 4. Versioning

- **Explanation idea:** Versioning is an "undo history" for every file. Without it, overwriting or deleting a file is permanent. With it, S3 keeps every older version, and a delete just hides the file.
- Facts:
  - Versioning is **off by default**. Once turned on, it can be **suspended** but never fully turned off again.
  - With versioning on, an overwrite keeps the old version (each version has its own version ID).
  - A normal delete adds a **delete marker**: the file looks gone, but older versions remain. Remove the marker, or copy an older version back, to restore it.
  - Deleting a specific version is permanent.
  - You pay for **every stored version**. Lesson 5 shows how to clean old ones up.
- **Visual: a file's history.** For `menu/biryani.jpg`, buttons: Upload, Overwrite, Delete, Restore. With versioning off, the file is replaced or vanishes. With it on, a stack of versions grows and a delete marker lands on top.
- **Challenge: "The intern's bad script."** A scripted run overwrites a dish photo with a blank image and deletes two others. If versioning was off when the script ran, those files are gone: the learner resets and turns it on first (the Hint says so). With it on, the learner restores the right version of every file. Success: the menu looks exactly as it did before the script.

### 5. Lifecycle rules

- **Explanation idea:** A lifecycle rule is like a filing clerk with a calendar: after 30 days move these files to a cheaper shelf, after a year archive them, after 7 years throw them out. S3 does it for you.
- Facts:
  - A rule applies to objects matching a filter (a **prefix** such as `receipts/`, or tags).
  - **Transition actions** move objects to a cheaper class after a number of days. **Expiration actions** delete them.
  - A rule can also delete **noncurrent versions** after a number of days (ties back to lesson 4).
  - *(Updated 2026-11-10.)* AWS removed the "30 days before moving to Standard-IA / One Zone-IA" rule on 16 July 2026. The current rule: a single lifecycle rule can't move an object out of a class before that class's minimum storage duration (e.g. Glacier IR at day 4 → Deep Archive at least day 94).
  - **Minimum storage duration charges** still apply (unchanged): moving or deleting an object early is billed as if it stayed the minimum time.
- **Visual: the calendar.** A timeline (day 0 → 30 → 90 → 1 year → 7 years). The learner builds rules (prefix + steps) and drags time forward; files slide down the shelves or disappear, and the monthly bill drops.
- **Challenge: "Tidy for 7 years."** Write rules for `receipts/` (cheaper over time, deleted after 7 years), `delivery/` (deleted after 30 days), `backups/` (deleted after 30 days) and old menu-photo versions. Run 7 years. Goals: total cost under budget, no file deleted before it's allowed, no rule that moves a file out of a class before its minimum storage duration, or breaks the minimum-duration charges, without the learner seeing the cost.

### 6. Final challenge: "Build Mealhop's file store"

- **Explanation:** a short recap of what each piece does (what the bucket, access, classes, versioning and lifecycle each protect against). It must still stay within the 4-sentence limit.
- The learner sets everything for Mealhop's bucket: per prefix, the storage class and lifecycle rule; for the bucket, versioning and Block Public Access; for access, the server role and presigned links for receipts.
- Running a simulated year plays these events: the intern's script deletes menu photos, an AZ goes down, a customer asks for last month's receipt (needed within a minute), the accountant asks for 5-year-old receipts (fine within 2 days), a manager re-opens old reports, the bot probes the bucket, and a busy month of traffic. The AZ event follows the same destroyed-vs-down rule as lesson 3.
- **Goals:** 0 lost files, 0 leaked files, every request on time, under budget.
- This lesson teaches nothing new. It reuses the models from lessons 1–5.

## Module page content

- `id: 's3'`, `number: 3`. The title is the builder's call; keep it short (e.g. "Files that never get lost").
- `tagline`: one short phrase. `description`: at most two short sentences. `outcomes`: at most 5 items, each one short line.
- `covers: ['s3']` (map id in `src/course/awsMap.ts`).

## Constraints (from the existing project)

- Stack: Vite + React 19 + TypeScript + Tailwind v4 + `motion` + react-three-fiber/drei. **Local resources only:** no CDNs, fonts via @fontsource.
- Layout: `src/modules/s3/index.ts` exports a `CourseModule` with lazy `load` per lesson. Each lesson has its own folder `src/modules/s3/lessons/<id>/` with `Lesson.tsx`, `terms.ts` and its visuals.
- Reuse the UI kit: `Section`, `Prose`, `Bench`, `Callout` (`components/lesson.tsx`); `Challenge` (`components/Challenge.tsx`); `Scene3D` (`components/Scene3D.tsx`); `Button`, `Segmented`, `Slider`, `Switch`, `Readout`, `Pill` (`components/controls.tsx`); `Boundary`, `ServiceTile` (`components/diagram.tsx`); `Term`.
- Visual language: colour carries meaning only. Region teal dashed, AZ blue dashed, VPC purple. S3 uses the storage category colour from `categories.ts`. No new palettes, no ALL-CAPS eyebrows, no "→" on buttons, no decorative gradients.
- 3D (lesson 1 visual B only): follow Module 2's pattern (lazy-loaded scene, WebGL check with a 2D fallback, error boundary, paused when off-screen, controls outside the canvas, drei `<Html>` labels with a fixed `portal`).
- Motion only on user action; respect `prefers-reduced-motion`.
- Works at phone width (16px side gutter, no horizontal scroll) and with keyboard only.
- `npm run typecheck`, `npm run build` and `npm test` must pass.

## Prices

Don't use live AWS prices. Use **example prices** with **realistic ratios** between classes (Standard most expensive to store; Deep Archive by far the cheapest; IA and Glacier classes add retrieval fees). Label them clearly as example prices with a short tag. Any percentage or ratio stated as a fact must match AWS docs.

## How it gets built (what worked in Module 2)

1. Work on a branch, `module-3-s3`.
2. Build the shared pieces first (see "Shared pieces").
3. Build lessons 1–5 in parallel, one builder agent per lesson folder in its own git worktree (`node_modules` junctioned; use `tsc -p`, not `tsc -b`). Agents edit only their own lesson folder; shared-file changes are collected and applied centrally. Build lesson 6 last so it reuses lessons 1–5's models.
4. For each lesson, run an **AWS-fact auditor** (against docs.aws.amazon.com) and a **UX/code auditor** that also checks the text rules. Then run a fixer.
5. Verify in the browser: every lesson, every challenge solved, at desktop and phone width, with reduced motion, and with zero console errors.
6. **Don't push to `main` without asking.** Every push redeploys the public site.

## Calls made on the learner's behalf (not discussed with them)

- Only one 3D scene (lesson 1, copies in 3 AZs). Everything else is flat and animated.
- Customers see menu photos through Mealhop's servers, never from a public bucket.
- The 7-year receipt rule is presented as Mealhop's accountant's request, not as a law.
- Lesson 6 adds no new idea; it's a capstone.
- A "failed try" means pressing the challenge's main action (Run, Start, Run the month or year) without reaching the goal, as in Module 2.
- Module 3 gets its own "Your file store so far" diagram rather than extending Module 2's.
- Receipt links are signed by the servers' IAM role (consistent with Module 2), so they last hours, not days.
- At most 2 explanations per lesson; challenges don't get their own explanation.
- `reports/` (re-creatable, rarely read) replaces thumbnails as the one prefix where One Zone-IA is the right choice.
- An AZ that is destroyed loses One Zone-IA data; an AZ that is only down makes it unreachable for a while.

## Left to the builder

- Lesson ids, module title wording, the exact explanation and caption wording within the limits.
- Exact interactions, layouts and animations within the rules above.
- Exact example prices and budgets, as long as every challenge is solvable and not trivial.
- Which glossary terms each lesson adds.
