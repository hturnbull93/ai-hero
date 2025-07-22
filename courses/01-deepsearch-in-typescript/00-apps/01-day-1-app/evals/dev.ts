import type { Message } from "ai";

export const devData: { input: Message[]; expected: string }[] = [
  {
    input: [
      {
        id: "basic-regurgitation",
        role: "user",
        content:
          "What is the latest version of TypeScript?",
      },
    ],
    expected:
      "The latest version of TypeScript is 5.8.3. TypeScript 5.8 was released in March 2025.",
  },
  {
    input: [
      {
        id: "basic-regurgitation",
        role: "user",
        content:
          "What are the main features of Next.js 15?",
      },
    ],
    expected: `
@next/codemod CLI: Easily upgrade to the latest Next.js and React versions.
Async Request APIs (Breaking): Incremental step towards a simplified rendering and caching model.
Caching Semantics (Breaking): fetch requests, GET Route Handlers, and client navigations are no longer cached by default.
React 19 Support: Support for React 19, React Compiler (Experimental), and hydration error improvements.
Turbopack Dev (Stable): Performance and stability improvements.
Static Indicator: New visual indicator shows static routes during development.
unstable_after API (Experimental): Execute code after a response finishes streaming.
instrumentation.js API (Stable): New API for server lifecycle observability.
Enhanced Forms (next/form): Enhance HTML forms with client-side navigation.
next.config: TypeScript support for next.config.ts.
Self-hosting Improvements: More control over Cache-Control headers.
Server Actions Security: Unguessable endpoints and removal of unused actions.
Bundling External Packages (Stable): New config options for App and Pages Router.
ESLint 9 Support: Added support for ESLint 9.
Development and Build Performance: Improved build times and Faster Fast Refresh.
`,
  },
  {
    input: [
      {
        id: "multi-hop-reasoning",
        role: "user",
        content: "What is the rough savings of buying a Combat Patrol: Blood Angels compared to buying the models within individually, in the UK?",
      },
    ],
    expected: `
The Combat Patrol: Blood Angels costs £100.

The set contains:

- 1x Blood Angels Captain
- 6x Sanguinary Guard
- 10x Assault Intercessors
- 2x Blood Angels Upgrades

The individual costs are:

- A Blood Angels Captain costs £26.
- A Sanguinary Guard box set contains 3 models and costs £37. 2 boxes are required, so the total cost is £74.
- An Assault Intercessors box set contains 10 models and costs £40.
- A Blood Angels Upgrades and Transfers set costs £21.50. 2 boxes are required, so the total cost is £43.

The total cost of buying boxes individually is £183, therefore the saving is £83.

These prices are taken from the Warhammer.com website, other retailers may have different prices.
`
  },
  {
    input: [
      {
        id: "multi-hop-reasoning",
        role: "user",
        content: "What is the rough savings of buying a Bolt Action French Army Infantry Bundle compared to buying the models within individually, from warlordgames.com?",
      },
    ],
    expected: `
The French Army Infantry Bundle costs £177.50.

The set contains:

- 3x boxes of the French Army Infantry
- 1x Somua S35
- 1x Lorraine 38L Armoured Carrier
- 1x French Army 75mm Light Artillery

The individual costs are:

- A box of the French Army Infantry costs £37.00. 3 boxes are required, so the total cost is £111.00.
- A Somua S35 costs £30.00.
- A Lorraine 38L Armoured Carrier costs £24.50.
- A French Army 75mm Light Artillery costs £22.50.

The total cost of buying boxes individually is £188.00, therefore the saving is £10.50.

These prices are taken from the warlordgames.com website, other retailers may have different prices.
`
  },
  {
    input: [
      {
        id: "multi-hop-reasoning",
        role: "user",
        content: "What is the rough savings of buying a Bolt Action Soviet Naval Brigade Platoon with Bronekator compared to buying the models within individually, from warlordgames.com?",
      },
    ],
    expected: `
The Soviet Naval Brigade Platoon with Bronekator costs £149.50.

The set contains:

- 3x Soviet Naval Brigade box set
- 1x Soviet Naval Brigade Command
- 1x Soviet Bronekater Armoured Patrol Boat

The individual costs are:

- A Soviet Naval Brigade box set costs £26.50. 3 boxes are required, so the total cost is £79.50.
- A Soviet Naval Brigade Command costs £9.00.
- A Soviet Bronekater Armoured Patrol Boat costs £70.00.

The total cost of buying boxes individually is £158.50, therefore the saving is £9.

These prices are taken from the warlordgames.com website, other retailers may have different prices.
`
  },
  {
    input: [
      {
        id: "multi-hop-reasoning",
        role: "user",
        content: "What is the rough savings of buying a Minas Tirith Battlehost compared to buying the box sets individually, in the UK?",
      },
    ],
    expected: `
The Minas Tirith Battlehost costs £57.

The set contains:

1x Gandalf the White and Peregrin Took Mounted
1x Gandalf the White on Foot
1x Peregrin Took on Foot
24x Warriors of Minas Tirith
6x Knights of Minas Tirith

A Warriors of Minas Tirith box set costs £31.50 and contains 32 box sets
A Knights of Minas Tirith box set costs £28 and contains 6 models.
A Gandalf the White and Peregrin Took box set costs £28 and contains both mounted and on foot models.

The total cost of buying boxes individually is £87.50, therefore the saving is £30.50.

These prices are taken from the Warhammer.com website, other retailers may have different prices.
`
  },
  {
    input: [
      {
        id: "multi-hop-reasoning",
        role: "user",
        content: "What is the cheapest cost of subscribing to Incident.io's plan for 50 users, with On-call, for a year?",
      },
    ],
    expected: `
The cheapest plan is the Team plan, at $15 per user per month.

On-call is an additional $10 per user per month.

The total cost per user per month is $15 + $10 = $25.

The total cost per user per year is $25 * 12 = $300.

The total cost for 50 users is $300 * 50 = $15,000.
`,
  },
]; 