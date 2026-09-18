---
title: "Counting Points on an Elliptic Curve"
description: "Pick a prime and a curve, and count its points mod p. Then watch Hasse's bound hold for every prime at once."
weight: 10
widget: "elliptic-curves"
script: "js/elliptic-curves.js"
sitemap:
  priority : 0.5
---
An elliptic curve over the integers mod a prime *p* is the set of solutions (x, y) to
y² = x³ + ax + b, taken mod *p*, plus one extra point at infinity. Counting those
points is the raw material of a lot of number theory, including the method my
[master's thesis]({{< ref "on-modular-curves" >}}) describes for modular curves.
