---
layout: post
title:  "Error from floating-point arithmetic in area computations on the Earth’s surface"
date:   2021-12-22 00:00:00 +0000
categories: geoscience
usemathjax: true
---

[geo][lib-geo] is a Rust library that provides primitives and algorithms for 2D geometric operations on a plane or on the Earth’s surface. It forms the core of the [Rust ecosystem for geospatial analysis][georust-org]. In this post, I explore how a very simple algorithm – computation of the area of a polygon – can incur large errors due to floating-point arithmetic, and how a simple tweak of the algorithm in the library avoids this error.

The imprecise nature of floating-point arithmetic leads to sometimes surprisingly large errors in computations. I find it fascinating that the scale of errors introduced depends on the precise order of floating-point arithmetic operations in the computational algorithm and the input values to the computation. The canonical introduction to this topic is a 1991 paper by David Goldberg - [What Every Computer Scientist Should Know About Floating-Point Arithmetic][acm-goldberg]. Beyond that, I’d recommend a [series of in-depth discussions][randomascii-fp] on Bruce Dawson’s RandomASCII blog.

## Area algorithm

In geo, a polygon is represented by enumerating the cartesian coordinates of $$N$$ consecutive vertices: $$[(x_1, y_1), (x_2, y_2), … (x_N, y_N)]$$. Because the vertices are stored in order, the end-points of the N edges can be read off by taking pairs of points (and wrapping around the list for the last edge) –  $$[(x_1, y_1), (x_2, y_2)], [(x_2, y_2), (x_3, y_3)], … [(x_N, y_N), (x_1, y_1)]$$. With this representation of a polygon, the area can be computed using the [shoelace formula][mathworld-polygonarea] –

$$
 Area = \frac{1}{2}
 \left(
    \begin{vmatrix}
    x_1 & x_2 \\
    y_1 & y_2
    \end{vmatrix}
    +
    \begin{vmatrix}
    x_2 & x_3 \\
    y_2 & y_3
    \end{vmatrix}
    +
    \ldots
    +
    \begin{vmatrix}
    x_N & x_1 \\
    y_N & y_1
    \end{vmatrix}
\right)
$$

Expanding out the formula for the determinant of the edges, this becomes:

$$Area = \frac{1}{2}((x_1y_2 - x_2y_1) + (x_2y_3 - x_3y_2) + \ldots + (x_Ny_1 - x_1y_N))$$

[acm-goldberg]: https://dl.acm.org/doi/10.1145/103162.103163
[georust-org]: https://georust.org/
[lib-geo]: https://lib.rs/crates/geo
[mathworld-polygonarea]: https://mathworld.wolfram.com/PolygonArea.html
[randomascii-fp]: https://randomascii.wordpress.com/2012/02/25/comparing-floating-point-numbers-2012-edition/