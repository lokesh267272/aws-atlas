# Module 2: EC2 — design

Date: 2026-10-22. Status: draft, waiting for the learner's approval.

## Intent and why

AWS Atlas is a local interactive course the learner uses to teach themself AWS. They finished Module 1 lessons 1 and 2 properly. For lessons 3 to 8 they **skipped all the text and learned only from the visuals and interactive parts**. Long explanations are hard for them to read.

Module 2 teaches **Amazon EC2** in a new style: **the visual teaches the idea, and text is only a short caption.** If a learner reads only the captions and plays with every visual, they should still learn everything in the module.

Module 1 stays exactly as it is. The learner said not to rewrite it.

## Decisions the learner made

| Topic | Decision |
|---|---|
| Topic | EC2 (virtual servers), including EBS disks, security groups, pricing, load balancing and auto scaling |
| Text | **One short line** next to each visual. No paragraphs. |
| 3D | **Only where it helps:** physical things such as servers, data centers and Availability Zones. Ideas such as permissions and pricing use animated flat diagrams. |
| Hands-on | **Simulations only.** No real AWS account, no cost. |
| Checks | **Challenges inside the visuals** (e.g. "keep the app online for under $X"), not multiple-choice questions |
| Length | **6 short lessons**, about 10 minutes each |
| Story | A new running story: a **food delivery app**. Lunch and dinner rush every day, quiet at night, orders must never get lost. |
| Orders data | In lesson 6 the orders move off the servers into a **shared, ready-made database** that keeps a copy in a second AZ (Amazon RDS Multi-AZ, taught in a later module). The lesson: never keep orders on servers that can be replaced. |

## Goals

1. Every lesson idea is taught by something the learner **does** (clicks, drags, toggles, launches, breaks) and **sees change**.
2. Each lesson has **at least one challenge**: a goal, a live status showing how close they are, and a clear success moment.
3. A learner who reads only captions and labels can pass every challenge.
4. Facts are correct against docs.aws.amazon.com (same standard as Module 1).
5. The module feels like part of the same site: same tokens, fonts, components and diagram language ([[aws-atlas-design-rules]] memory, `src/components/*`).

## Non-goals

- Rewriting or trimming Module 1.
- Real AWS console tasks, CLI exercises or anything that needs an AWS account.
- A deep VPC lesson (subnets, route tables, gateways). The VPC boundary may appear in diagrams, with a tappable term, but isn't taught here.
- Teaching databases. Amazon RDS appears only in lesson 6 as a ready-made "orders database" tile, with a tappable term and a "later module" tag. The learner doesn't configure it. `covers` stays without `rds`.
- Containers, Lambda, burstable CPU credits (T instances), Dedicated Hosts, Elastic IPs, placement groups, hibernation.
- Exact live AWS prices (see "Prices" below).

## Anti-goals (fails even if it "works")

- **Paragraphs creeping back.** A visual that needs a paragraph to be understood is a broken visual. Fix the visual, not the text.
- **3D as decoration.** 3D that doesn't teach a physical idea better than 2D would.
- **A challenge the learner can get stuck on** with no way forward.
- **Wrong AWS facts** dressed up nicely.
- **Ambient motion:** decorative loops that run on their own. Animation should happen because the learner did something, such as pressing Launch or Start the day.

## Text rules (hard limits)

- **Caption:** one sentence of at most about 20 words. It says what to try and what to notice. It goes in the `Bench` `intro`.
- **Lesson intro:** one sentence at the top of the lesson, setting up the story problem.
- **Labels inside visuals** (buttons, readouts, tags, tooltips on hover or tap) are fine and encouraged. Keep each one short.
- **"In real AWS" note:** at most one per lesson, one sentence, using `Callout kind="real-aws"`.
- **No `Prose` blocks** apart from the one-line intro. No `Takeaways` lists. They are replaced by "Your setup so far" (below).
- **Jargon:** every AWS term is wrapped in `<Term>` so the learner can tap it for the plain meaning. Reuse existing glossary keys (e.g. `ec2`, `instance`, `security-group`, `instance-profile`) and don't redefine them. Add new keys in each lesson's `terms.ts`.
- **Plain words** pitched for a beginner. Spell out what an abbreviation means the first time, inside the term definition, not in body text.

## Challenge pattern (shared)

Every challenge has:

1. **A goal line**, e.g. "Get the menu page online".
2. **Live status** that updates as the learner plays: checklist ticks, gauges, a cost meter, "orders lost: 0".
3. **A success moment:** a clear visual change and a one-line "why it worked".
4. **Never stuck:** after 2 failed tries a **Hint** button appears. After 3, **Show me** solves it with an animation.
5. **Reset**, through `Bench onReset`.

Build this once as a shared component (e.g. `src/components/Challenge.tsx`) before the lessons, so all challenges look and behave the same. Lessons keep the existing "Mark lesson complete" button. Changing how completion works is out of scope.

## "Your setup so far" (shared)

Each lesson ends with a small architecture diagram of the delivery app, drawn with the existing AWS-style boundaries (`Boundary`, `ServiceTile` in `src/components/diagram.tsx`). Each lesson adds the piece it taught, which is highlighted:

1. One EC2 instance in one AZ
2. …with a right-sized instance type
3. …plus an EBS volume and a snapshot
4. …plus a security group and an IAM role
5. …with a pricing label per part (Savings Plan / On-Demand / Spot)
6. …across 3 AZs behind a load balancer, inside an Auto Scaling group, with the orders now in a shared database (primary in one AZ, standby copy in another)

This replaces the end-of-lesson takeaway text. Build it once in the module folder, with a `step` prop. It's the same for every learner. It doesn't reflect their own choices in the sims.

## The six lessons

Lesson ids are the builder's call. Each lesson is about 10 minutes long. Facts listed here are the ones to teach; the fact auditor checks each one.

### 1. Rent and launch a server *(3D)*

- **Visual A (3D):** a physical server in a data-center rack. The hypervisor (the AWS Nitro System) splits it into several isolated **instances** belonging to different customers. The learner rents one and it lights up as theirs, sitting in one Availability Zone (a link back to Module 1).
- **Visual B:** a launch builder. Snap together the parts of a launch: **AMI** (operating-system image), **instance type**, **key pair**, **security group**, **storage** (root EBS volume). A missing part blocks Launch and shows a one-line reason. On Launch, the instance animates through **pending → running**, gets an address, and the app's menu page opens.
- **Challenge:** "Get the menu page online." Success means the instance is running and web traffic is allowed in.

### 2. Pick the right size

- **Visual A:** an instance-type name decoder. Tap the parts of a name such as `m7g.large`: the **family** (m), **generation** (7), **extra feature** (g = AWS Graviton processor) and **size** (large). Each step up in size roughly doubles vCPUs and memory.
- **Visual B:** families as shapes: general purpose (t, m), compute optimized (c), memory optimized (r, x), storage optimized (i), accelerated computing (g, p).
- **Challenge:** run three jobs from the app, choosing a type for each. The jobs are the **website** (balanced), **route planning** (CPU-heavy) and **live order cache** (memory-heavy). CPU and memory gauges show red when overloaded and grey when wasted, and a cost meter runs. Goal: everything fits and the total stays under budget.

### 3. Disks that remember

- **Visual:** an instance with an **EBS volume** (a separate box connected over the network) and **instance store** (disks inside the host). Buttons: **Reboot, Stop, Start, Terminate, Host hardware fails**. Data blocks on each disk survive or vanish with an animation.
  - Instance store keeps its data on reboot and loses it on stop, terminate or host failure.
  - EBS keeps its data on stop and start. By default the **root** volume is deleted on terminate and extra volumes are kept.
  - An EBS volume lives in **one AZ**. A **snapshot** is a backup stored outside that AZ (in S3, managed by AWS) and can be restored as a new volume in another AZ in the same Region.
- **Challenge:** keep the orders database safe through a scripted run of events: maintenance stop, replacing the server, trouble in its AZ. The learner chooses where data lives and when to take a snapshot.
- **Story framing:** with one server, keeping the orders on its EBS volume is reasonable. Lesson 3 must not present it as the final answer. A single label or tag is enough (e.g. "fine for one server; lesson 6 moves orders off the servers"). Don't use a paragraph.
- **Snapshot honesty:** a snapshot restores data as it was when the snapshot was taken. Orders placed after the last snapshot are lost if the volume is lost. The challenge's scripted events and success rule must respect this, e.g. "lose no orders older than your last snapshot" or timing events so a well-placed snapshot covers them.

### 4. Who can reach it

- **Visual A:** the **security group** as a gate around the instance. The learner presses Start traffic and requests fly in as dots: customers on HTTPS (443), a bot trying SSH (22) from the internet, the owner on SSH from the office IP, and someone probing the database port. The learner adds inbound rules (port + source), and dots pass or bounce. Teach these points:
  - Rules **only allow**; anything without a matching rule is blocked.
  - A new security group allows **no inbound** traffic and **all outbound** traffic.
  - Security groups are **stateful**: replies to allowed traffic go back out automatically.
- **Visual B:** the **key pair**. AWS puts the public key on the server and you keep the private key, which you need to log in over SSH. Keep this to one small interaction.
- **Visual C:** an **IAM role** for the instance (instance profile). The app needs to read menu photos from S3. Compare pasting an access key onto the server with attaching a role, which hands out short-lived credentials automatically. This links back to Module 1's roles lesson.
- **Challenge:** customers get in on HTTPS, SSH works only from the office IP, nothing else gets in, and the app reaches the photos without a stored key.

### 5. Pay less

- **Visual A:** a lifecycle meter. **Running** is billed per second (for Linux, with a 60-second minimum). **Stopped** has no instance charge, but the EBS volume is still billed.
- **Visual B:** a 24-hour demand curve for the app: lunch and dinner peaks, quiet nights. The learner covers it with capacity blocks:
  - **Savings Plan** for the always-on baseline (1- or 3-year commitment, big discount)
  - **On-Demand** for the peaks
  - **Spot** for the nightly batch job (spare AWS capacity at a large discount, interruptible with a 2-minute warning)
  - Putting live orders on Spot triggers an interruption and dropped orders, so the learner sees the risk.
- Reserved Instances can appear as a tappable term ("the older way to commit"). They don't need their own interaction.
- **Challenge:** run a month of the app under budget with **zero lost orders**.

### 6. Survive and scale *(3D)* + final challenge

- **Visual (3D):** a Region with **3 AZs** as platforms. An **Application Load Balancer** spreads incoming requests across instances in all AZs and skips unhealthy ones (health checks). An **Auto Scaling group** has **min / desired / max** settings and a target-tracking policy (e.g. "keep average CPU near 50%"). A **launch template** is the recipe new instances are built from.
- **Events** the learner triggers: lunch rush, an instance crashes, one AZ goes down. They watch Auto Scaling add or replace instances and the load balancer route around the failed AZ.
- **Orders database:** a ready-made tile for Amazon RDS in a Multi-AZ setup, with a primary in one AZ and a standby copy in another. If the primary's AZ fails, the database fails over to the standby automatically. The sim shows a short pause while this happens, and the app retries, so orders wait and then go through. The servers keep **no orders** of their own, so Auto Scaling can throw them away and replace them freely.
- **Final challenge, "Build it all":** combine lessons 1 to 5. The learner chooses the AMI and type, security group, pricing mix, an ASG across AZs, and **where orders are saved**, then runs a simulated day with a lunch rush plus an AZ outage. Goal: **no lost orders, under budget**.
  - "Where orders are saved": **each server's own disk** loses those orders when Auto Scaling replaces a server or an AZ goes down. **The shared database** keeps them safe.
  - "Lost orders" counts both orders saved on a server that disappeared and customers turned away because there was no healthy capacity.
  - Spot here is consistent with lesson 5. Behind a load balancer with an ASG, a Spot interruption means lost **capacity**, not lost orders, as long as orders are in the database and enough instances remain.

## Module page content

- `id: 'ec2'`, `number: 2`. The title is the builder's call; keep it short (e.g. "Servers on demand").
- `tagline`: one short phrase. `description`: at most two short sentences. `outcomes`: at most 5 items, each one short line.
- `covers: ['ec2', 'ebs', 'elb']` (map ids in `src/course/awsMap.ts`).
- Register the module by appending it to `modules` in `src/course/registry.ts`.

## Constraints (from the existing project)

- Stack: Vite + React 19 + TypeScript + Tailwind v4 + `motion` + react-three-fiber/drei. **Local resources only:** no CDNs, fonts via @fontsource.
- Layout: `src/modules/ec2/index.ts` exports a `CourseModule` (see `src/course/types.ts`) with lazy `load` per lesson. Each lesson has its own folder `src/modules/ec2/lessons/<id>/` with `Lesson.tsx`, `terms.ts` and its visuals.
- Reuse the UI kit: `Section`, `Bench`, `Callout` (`components/lesson.tsx`); `Button`, `Segmented`, `Slider`, `Switch`, `Readout`, `Pill` (`components/controls.tsx`); `Boundary`, `ServiceTile` (`components/diagram.tsx`); `Term`.
- Visual language: colour carries meaning only. Region boundaries are teal dashed, AZ blue dashed, VPC purple. Service colours come from the AWS category palette in `categories.ts`. No new palettes. No ALL-CAPS eyebrows, no "→" on buttons, no decorative gradients.
- 3D (lessons 1 and 6 only): follow the globe's pattern in `foundations/lessons/global-infrastructure/GlobeExplorer.tsx`. Lazy-load the scene, use a WebGL check with a working 2D or list fallback and an error boundary, pause rendering when off-screen, and put all controls **outside** the canvas so keyboards and screen readers can use them. Use the dark `Bench tone="screen"` panel.
- Motion: respect `prefers-reduced-motion` (jump to the end state instead of animating).
- Works at phone width (16px side gutter, no horizontal scroll) and with keyboard only.
- `npm run typecheck` and `npm run build` must pass.

## Prices

Don't use live AWS prices, because they change. Use **example prices** with **realistic ratios** (e.g. Spot much cheaper than On-Demand, bigger sizes about double the price). Label them clearly as example prices in the UI with a short tag, not a paragraph. Discount percentages that are stated as facts ("up to 90% off" for Spot, etc.) must match AWS docs.

## How it gets built (from what worked in Module 1)

1. Build the shared pieces first: `Challenge`, "Your setup so far", the story constants (app name, order numbers, budget) in `src/modules/ec2/story.ts`, and the module `index.ts` and registry entry.
2. Use **one builder agent per lesson folder**, in parallel. Agents edit only their own lesson folder. Requests to change shared files are collected and applied centrally.
3. For each lesson, run an **AWS-fact auditor** (checked against docs.aws.amazon.com) and a **UX/code auditor** that also checks the text rules above. Then run a fixer.
4. Verify in the browser: click through every lesson and solve every challenge at desktop and phone width, check reduced motion and the console for errors.
5. **Don't push to `main` without asking.** Every push redeploys the public site.

## Calls made on the learner's behalf (not discussed with them)

- A "failed try" means pressing the challenge's main action (Launch, Start traffic, Run the day) without reaching the goal.
- The lesson 2 challenge leaves out the `t` family so burstable CPU credits never come up. The `t` family can still appear in the family visual.
- Lesson 6 is built last, after lessons 1 to 5, so it can reuse their controls and models.
- Example prices instead of live prices (see "Prices").
- Lesson 5's Spot risk is shown in a single-server setting (an interruption drops orders). Lesson 6 shows the same interruption absorbed by the load balancer and ASG.

## Left to the builder

- Lesson ids, module title wording, and the delivery app's name. Invent one, and check it isn't a well-known real brand.
- Exact interaction details, layouts and animation choices within the rules above.
- Exact example prices and budgets, as long as every challenge is solvable and not trivial.
- Which glossary terms each lesson adds.
