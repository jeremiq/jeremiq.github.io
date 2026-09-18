---
title: "Counting Points on an Elliptic Curve"
description: "Pick a prime and a curve, and count its points mod p. Then watch Hasse's bound hold for every prime at once."
weight: 10
math: true
script: "js/elliptic-curves.js"
sitemap:
  priority : 0.5
---
Under the appropriate conditions, an [elliptic curve](https://en.wikipedia.org/wiki/Elliptic_curve)
[modulo](https://en.wikipedia.org/wiki/Modular_arithmetic) a prime \(p\) is the set of solutions
\((x, y)\) of \(y^2 \equiv x^3 + ax + b \pmod{p}\), together with one extra point at infinity.
(For the curious, those conditions are that \(p > 3\) and that the curve is
[nonsingular](https://en.wikipedia.org/wiki/Singular_point_of_a_curve), which means
\(4a^3 + 27b^2 \not\equiv 0 \pmod{p}\).)

Counting those points is an important problem in number theory and
[cryptography](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography), where curves like these
are widely used in key-exchange and digital signature schemes. It's also closely related to the work in my
[master's thesis]({{< ref "on-modular-curves" >}}), which counts points \(\pmod{p}\) on
[modular curves](https://en.wikipedia.org/wiki/Modular_curve), the curves that parametrize elliptic curves.

### How many points? Hasse's bound

Write \(\#E(\mathbb{F}_p)\) for the number of points on the curve \(\pmod{p}\), counting the point at
infinity. Each \(x\) has two, one or zero matching values of \(y\), and on average one, so you'd expect
about \(p\) points plus the point at infinity, or \(p + 1\) in all.
[Hasse's theorem](https://en.wikipedia.org/wiki/Hasse%27s_theorem_on_elliptic_curves) says that's
essentially right: the count can never stray far from \(p + 1\).

$$\left|\,\#E(\mathbb{F}_p) - (p + 1)\,\right| \le 2\sqrt{p}.$$

The difference \(a_p = p + 1 - \#E(\mathbb{F}_p)\) is called the *trace of Frobenius*, because it is the
trace of the [Frobenius endomorphism](https://en.wikipedia.org/wiki/Frobenius_endomorphism)
\((x, y) \mapsto (x^p, y^p)\) of the curve. In these terms, Hasse's theorem says
\(|a_p| \le 2\sqrt{p}\).

### Try it

Pick a prime and a curve. The plot shows every point \(\pmod{p}\), and the results show the count sitting
inside Hasse's interval.

{{< ec-curve >}}

### Every prime at once

Now take \(a\) and \(b\) from the sliders above as ordinary integers and count points \(\pmod{p}\) for *every* prime \(p\)
from 5 up to 4000. (The few primes with \(4a^3 + 27b^2 \equiv 0 \pmod{p}\) get skipped, because the curve is singular
there and isn't an elliptic curve.) Dividing each \(a_p\) by \(2\sqrt{p}\) squeezes them all into \([-1, 1]\), which is Hasse's
bound again. The histogram shows how those numbers are spread out. The black curve is the semicircle
\(\tfrac{2}{\pi}\sqrt{1 - t^2}\) that most curves follow, known as the
[Sato–Tate distribution](https://en.wikipedia.org/wiki/Sato%E2%80%93Tate_conjecture). Try \(a = 0\) or
\(b = 0\): those curves have [complex multiplication](https://en.wikipedia.org/wiki/Complex_multiplication),
and half of their \(a_p\) are exactly zero.

{{< ec-histogram >}}

### Learn more

- [Elliptic curve](https://en.wikipedia.org/wiki/Elliptic_curve): the basics, including the group law on the points.
- [Hasse's theorem on elliptic curves](https://en.wikipedia.org/wiki/Hasse%27s_theorem_on_elliptic_curves): the bound above.
- [Frobenius endomorphism](https://en.wikipedia.org/wiki/Frobenius_endomorphism): where the trace of Frobenius comes from.
- [Sato–Tate conjecture](https://en.wikipedia.org/wiki/Sato%E2%80%93Tate_conjecture): why the histogram looks like a semicircle.
- [Complex multiplication](https://en.wikipedia.org/wiki/Complex_multiplication): the special curves with \(a = 0\) or \(b = 0\).
- [Schoof's algorithm](https://en.wikipedia.org/wiki/Schoof%27s_algorithm): how to count points when \(p\) is far too big for brute force, as in cryptography.
- [Elliptic-curve cryptography](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography): what all this is used for.
- [Modular curve](https://en.wikipedia.org/wiki/Modular_curve) and the [modularity theorem](https://en.wikipedia.org/wiki/Modularity_theorem): where the \(a_p\) reappear as coefficients of modular forms.
- [Elliptic curves over the rationals in the LMFDB](https://www.lmfdb.org/EllipticCurve/Q/): a database of elliptic curves and their invariants.
- Silverman and Tate, [*Rational Points on Elliptic Curves*](https://link.springer.com/book/10.1007/978-3-319-18588-0): a friendly undergraduate textbook.
