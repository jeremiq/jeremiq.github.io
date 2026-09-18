---
title: "Break the Assistant"
description: "Five levels of a scripted AI assistant with better and better defenses. Can you get it to leak its secret?"
weight: 20
widget: "prompt-injection"
script: "js/prompt-injection.js"
sitemap:
  priority : 0.5
---
Prompt injection is what happens when text an AI system reads gets treated as instructions.
It's a big part of what I talked about in [my DEF CON talk]({{< ref "defcon-beyond-assistants" >}}),
so here's a small puzzle version. Each level adds a defense that people really deploy,
and each one falls to a different trick, until the last level, which is built the way it should be.
