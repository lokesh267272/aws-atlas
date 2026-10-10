# AWS Atlas

A local, interactive course for learning AWS visually. Every service is placed on one map, drawn the way AWS architecture diagrams are drawn (AWS Cloud > Region > VPC > Availability Zone). Each module lights up part of the map and has hands-on simulations.

Everything runs on your machine. No CDNs, remote fonts or online services are used.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

To build a static copy you can open without a server:

```bash
npm run build
```

The site is written to `dist/`. It uses relative paths and hash URLs, so you can serve the folder from anywhere (for example `npm run preview`).

## What is in Module 1: Foundations

| Lesson | Simulations |
| --- | --- |
| What the cloud really is | Capacity planner (buy vs rent), who-manages-what stack (IaaS/PaaS/SaaS), shared-responsibility sorter |
| The AWS world map | 3D globe of AWS Regions and edge locations, zoom from planet to data center |
| Choosing a Region and surviving failures | Region picker with latency estimates, break-the-data-center failure simulator |
| Your account, and three ways to talk to AWS | First-day safety checklist, same action via console / CLI / SDK, practice terminal |
| IAM: who can do what | Team permissions builder with missions, authentication vs authorization walkthrough |
| Reading and testing policies | Interactive policy anatomy, ARN explorer, policy simulator, policy challenges |
| Roles and temporary credentials | Key-in-code vs role, who-can-assume-this-role |
| Module checkpoint | Rebuild the map, 12-question quiz, flashcards |

Progress is saved in your browser's local storage.

## Project layout

```
src/
  components/      shared UI kit: Section, Prose, Bench, Callout, ServiceCard,
                   Checkpoint, Boundary, ServiceTile, CodeBlock, Term, AwsMap
  course/          types, glossary, the AWS map data, module registry
  modules/
    foundations/   Module 1: index.ts (module definition) + lessons/<id>/
  pages/           home (course map), module, lesson, glossary
  lib/             hash router, progress storage
```

## Adding the next module

1. Create `src/modules/<id>/index.ts` exporting a `CourseModule`. Give it lessons with lazy `load` functions, and list the map items it teaches in `covers` (ids from `src/course/awsMap.ts`).
2. Put each lesson in `src/modules/<id>/lessons/<lesson-id>/Lesson.tsx`, built from the shared components, with new glossary words in a `terms.ts` next to it.
3. Append the module to `modules` in `src/course/registry.ts`. Its services light up on the course map automatically.

AWS Atlas is an independent study project and is not affiliated with Amazon Web Services.
