---
layout: post
title:  "Error from floating-point arithmetic in area computations on the Earth’s surface"
date:   2021-12-22 00:00:00 +0000
categories: geoscience
usemathjax: true
---

[geo][lib-geo] is a Rust library that provides primitives and algorithms for two dimensional geometric operations on a plane or on the Earth’s surface. It forms the core of the [Rust ecosystem for Geospatial analysis][georust-org]. In this post, I explore how a very simple algorithm – computation of the area of a polygon – can incur large errors due to floating-point arithmetic, and how a simple tweak of the algorithm in the library avoids this error.

The imprecise nature of floating-point arithmetic sometimes leads to surprisingly large errors in computations. I find it fascinating that the scale of errors introduced depends on the precise order of floating-point arithmetic operations and also on the _input values_ in the computation. The canonical introduction to this topic is a 1991 paper by David Goldberg - [What Every Computer Scientist Should Know About Floating-Point Arithmetic][acm-goldberg]. Beyond that, I’d recommend a series of in-depth discussions on [Bruce Dawson’s RandomASCII blog][randomascii-fp].

## Area algorithm

In Rust's geo, an $$N$$-edged polygon is represented by enumerating the cartesian coordinates of consecutive vertices: $$[(x_1, y_1), (x_2, y_2), … (x_N, y_N)]$$. Because the vertices are stored in order, the end-points of the N edges can be read off by taking consecutive pairs of points (and wrapping around the list for the last edge) –  $$[(x_1, y_1), (x_2, y_2)], [(x_2, y_2), (x_3, y_3)], … [(x_N, y_N), (x_1, y_1)]$$. With this representation of a polygon, the area can be computed using the [shoelace formula][mathworld-polygonarea] –

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

## Imprecise computations

Because geo stores the cartesian coordinates as floating-point numbers, the area computation described above can sometimes return a highly incorrect result. When the vertices represent a polygon that is small and far from the origin, all the coordinates have large, and similar, values. In this case, the terms $$x_1y_2$$ and $$x_2y_1$$ are almost equal, but much larger than the computed area. Thus, their difference, $$x_1y_2 - x_2y_1$$, falls prey to the problem of [catastrophic cancellation][wiki-catastrophic-cancellation], introducing a large error in the computation. Each determinant in the computation introduces similar errors.

## Mitigation

geo mitigates this loss of precision by translating the polygon to be closer to the origin before computing its area. The modified formula subtracts $$(x_1, y_1)$$ from each vertex to obtain the translated polygon with vertices $$[(0, 0), (x_2 - x_1, y_2 - y_1), \ldots, (x_N - x_1, y_N - y_1)]$$ and then computes the area as

$$Area = \frac{1}{2} \left(\begin{align*}
                  &0  \nonumber \\
                +\;&((x_2 - x_1)(y_3 - y_1) - (x_3 - x_1)(y_2 - y_1)) \nonumber \\
                +\;&\ldots \nonumber \\
                +\;&((x_{N-1} - x_1)(y_N - y_1) - (x_N - x_1)(y_{N-1} - y_1)) \nonumber \\
                +\;&0 \nonumber
        \end{align*} \right)
$$

Vertices in the translated polygon have coordinates with absolute values comparable to diagonals of the polygon -- $$(x_2 - x_1), (y_2 - y_1)$$ etc. Thus, the two expressions $$(x_2 - x_1)(y_3 - y_1)$$ and $$(x_3 - x_1)(y_2 - y_1)$$ and their difference $$(x_2 - x_1)(y_3 - y_1) - (x_3 - x_1)(y_2 - y_1)$$ are all comparable to the area of the polygon. This avoids catastrophic cancellation in the difference.

## Quantifying loss of precision in naive computation

I quantified this loss of precision by implementing the naive algorithm for area computation described earlier and comparing the results with those from geo. First, I compared the area for a polygon surrounding the origin. As expected, the area computed by the naive algorithm matched the one from geo (area: $$\approx 293$$, error in naive computation (relative to geo) $$\lt 10^{-14}\%$$). Next, I translated the polygon away from the origin in different directions in the first quadrant –- along the x-axis (translation angle $$0$$), along the y-axis (translation angle $$\frac{\pi}{2}$$), and in three directions between those extremes (translation angles of $$\frac{\pi}{8}$$, $$\frac{\pi}{4}$$ and $$\frac{3\pi}{8}$$ from the x-axis). The following graph shows the error in naive area computation (relative to geo) as the polygon shifts away from the origin in those directions:

{:refdef: style="text-align: center;"}
![](/assets/article_images/naive_area_error.png)
{: refdef}

The graph clearly demonstrates the loss of precision I anticipated earlier – the error starts out small and grows as the polygon shifts away from the origin. But the graph holds an additional insight – the error varies widely by the angle of translation – while it stays $$\lt 10\%$$ for translations along the x- or y-axes, it fluctuates between $$100\%$$ and $$10^{16}\%$$ in the other directions! An error of $$10\%$$ is arguably bad, depending on the application, but an error over $$100\%$$ surely makes the entire computation meaningless. The large difference in the magnitude of the error along one of the axes compared to intermediate angles highlights the effect of the multiplication in the area formula – the loss of precision in the computation of $$x_1y_2$$ is much higher when $$x_1$$ and $$y_2$$ are _both_ large.

I close by noting a particular quirk of my experimental setup. Above, I compared the area computed via the naive algorithm with that computed by geo as the polygon is translated. But the area computed by geo as the polygon is translated does not stay constant either. The following graph shows the error in the area computed by geo, relative to the original area of the polygon:

{:refdef: style="text-align: center;"}
![](/assets/article_images/geo_area_error.png)
{: refdef}

Once again, the error grows as the polygon shifts away from the origin. But the error is relatively the same in all angles of translation and approaches $$100\%$$ as the polygon is translated by $$\approx 10^{17}$$. This error is a result of an unavoidable loss in precision in specifying the vertices of the polygon as it is translated – as the absolute numerical value of a cartesian coordinate grows, floating-point representation of the number drifts away from the actual value. Effectively, the polygon morphs as it shifts. Eventually, at $$\approx 10^{17}$$, the floating-point representations of the vertices are so imprecise that it results in a polygon with the area $$0$$!

This problem is unavoidable as long as vertices are represented using floating-point numbers. Fortunately, the relative error introduced in this way for any practical application in Geospatial sciences is limited. Assuming that the smallest polygon of interest on the Earth’s surface has an area of $$1 \mathrm{m}^2$$, and approximating the Earth’s surface as a sphere with radius $$10^8 \mathrm{m}$$, the maximum possible translation of the polygon on the surface is $$\lt 10^9 \mathrm{m}$$. The error in geo's area computation for this maximally translated polygon is tiny ($$\lt 10^{-6}\%$$). In comparison, the error in the naive area computation for this polygon can be up to $$\approx 10\%$$.


[acm-goldberg]: https://dl.acm.org/doi/10.1145/103162.103163
[georust-org]: https://georust.org/
[lib-geo]: https://lib.rs/crates/geo
[mathworld-polygonarea]: https://mathworld.wolfram.com/PolygonArea.html
[randomascii-fp]: https://randomascii.wordpress.com/2012/02/25/comparing-floating-point-numbers-2012-edition/
[wiki-catastrophic-cancellation]: https://en.wikipedia.org/wiki/Catastrophic_cancellation