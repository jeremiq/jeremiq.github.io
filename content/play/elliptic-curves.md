---
title: "Counting Points on an Elliptic Curve"
description: "Pick a prime and a curve, and count its points mod p. Then watch Hasse's bound hold for every prime at once."
weight: 10
widget: "elliptic-curves"
script: "js/elliptic-curves.js"
sitemap:
  priority : 0.5
---
For most primes *p* (any prime above 3, as long as 4*a*³ + 27*b*² isn't a multiple of *p*), the solutions
(x, y) mod *p* of y² = x³ + ax + b, together with one extra point at infinity, form an elliptic curve.
This simple form of the equation doesn't work for *p* = 2 or 3, so the sliders below only use primes
from 5 up. Counting those points is an important problem in number theory and in cryptography, where
curves like these underlie widely used key-exchange and signature schemes. It's also closely related
to the work in my [master's thesis]({{< ref "on-modular-curves" >}}), which counts points mod *p* on
modular curves, the curves that parametrize elliptic curves.
