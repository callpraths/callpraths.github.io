---
layout: post
title:  "Performance comparison of four simple geospatial algorithms"
date:   2022-02-01 00:00:00 +0000
categories: geoscience
style: geo-perf-comparison
---

Rust is a relatively new programming language and many problems being tackled in Rust have existing solutions in C/C++. As a Rust developer in need of some non-trivial functionality, you must often choose between a Rust wrapper of an existing C/C++ library and a pure Rust alternative. In this post, I compare the runtime performance of simple operations from [_geo_], a crate that provides algorithms for two dimensional geometric operations, with the most prominent alternative, [_geos_], a wrapper of the C++ [_libgeos_] library. I had previously compared the features offered by these crates in another post [on this blog][geo-geos-feature-study].

The primary question I seek to answer: Is there a marked performance benefit in using the pure-Rust _geo_ crate over _geos_ because of its use of Rust? Or conversely, is there a marked performance benefit in using the _geos_ crate because of its use of C++? This is an instance of C++ vs Rust performance comparison, but specially interesting for applications written in Rust. The conventional wisdom is that [Rust is competitive with (bare, not wrapped in Rust) C][rust-benchmark-games], and though it is possible to point-out [specific][why-fast-1] [reasons][why-fast-2] programs written in one language might be faster, modern compilers and hardware are too complex for these reasons to apply broadly.

To provide an answer, I compare the performance of three algorithmically simple geospatial computations from the two crates - minimum bounding rectangle, area and centroid. I choose these simple computations for two reasons. First, it makes it more likely that any performance difference is due to the use of Rust or C++. In a more complex computation, the largest performance optimization opportunities are most likely algorithmic. Second, it makes it easier to analyze the root causes of the observed performance differences. As you will see below, the root cause analysis is at the core of the insights to be gained from this exercise.

[_geo_]: https://lib.rs/crates/geo
[_geos_]: https://lib.rs/crates/geos
[_libgeos_]: https://libgeos.org/
[geo-geos-feature-study]: https://callpraths.github.io/geoscience/2022/01/21/geo-feature-study.html
[rust-benchmark-games]: https://benchmarksgame-team.pages.debian.net/benchmarksgame/fastest/rust.html
[why-fast-1]: https://pvs-studio.com/en/blog/posts/0733/
[why-fast-2]: https://kornel.ski/rust-c-speed


## What this performance comparison is not

Application performance evaluation [is hard][perf-mistakes] - you risk measuring the wrong thing, in the wrong way, and making the wrong inferences from observations.

**What**: An application’s performance depends heavily on operational context – the application may perform differently for different inputs, in executing different operations, and when used in the context of other larger software. Thus, you should benchmark an application in an environment that is [faithful to the target context][brendangregg-methodology]. My performance evaluation below is not a broadly applicable comparison of Rust and C++, or even _geo_ and _geos_. Instead, it is an exercise in understanding the root causes of observed differences in performance of simple algorithms in isolation. I use realistic inputs so that I observe performance differences on meaningful operations, but side-step the issue of scale and software context. A more contextual evaluation would use real-world inputs at scale and a real-world problem with a sequence of operations, like [this study][modern-spatial-libraries-benchmark] of geospatial libraries used by many of the gig-economy technology companies.

**How**: Application performance is also very sensitive to the execution context - hardware characteristics (CPU architecture, memory cache sizes), software characteristics (kernel scheduler, memory allocator), and other concurrent processes on the system greatly affect performance. Conventional wisdom in application performance evaluation is to [control as many of these variables as possible][sled-perf-blog-exp-design]. I take a different approach with fewer controls that works well for comparing the performance of two alternatives, but isn’t valid for reporting absolute performance of an application. I describe this methodology in its own section below.

**Why**: In this exercise, comparing the performance of the two crates is only the starting point. I arrive at my key insights by digging into the root causes of the observed difference. A performance evaluation exercise is incomplete, and of [questionable validity][brendangregg-bonnie], without a detailed understanding of the performance bottlenecks that explain the observations.


[brendangregg-bonnie]: https://www.brendangregg.com/ActiveBenchmarking/bonnie++.html
[brendangregg-methodology]: https://www.brendangregg.com/methodology.html
[modern-spatial-libraries-benchmark]: https://doi.org/10.1007/s41019-020-00147-9
[perf-mistakes]: https://www.cs.utexas.edu/~bornholt/post/performance-evaluation.html
[sled-perf-blog-exp-design]: http://sled.rs/perf.html#experimental-design


## Methodology

I ran my benchmarks on a Google Cloud Platform virtual machine (*gasp!*). A cloud virtual machine is a bad environment for performance evaluation - it allows little visibility and no control over the hardware, virtualization setup and resource sharing. But, [the best camera is the one that’s with you][best-camera-quote], so I set out to develop an experimental design to counter this inconvenience.

The trick is to realize that my experiment only needs to compare the relative performance of two alternatives. Since I can not control the environmental factors, I ensure that the factors affect both crates similarly and measure the ratio of the performance between the two.

- **Measure**: The primary quantity I measure is the [elapsed real time][wiki-elapsed-time] measured using a [monotonic wall-clock][rust-monotonic-clock] for each operation. I repeat the operation a large number of times so that measured runtime is at least a few milliseconds, because [robust nanosecond-precision measurement is hard][nanos-are-hard].

- **Repeat**:
  - I measure each operation over a 100 times to counter the inevitable random measurement noise.
  - I interleave the measurements for the two crates  – in each iteration, I measure each crate once in order. This way, any drift in measurement due to changes in the execution environment equally affects both crates[^1].
  - I pair the measurements for the two crates in each iteration, and use their ratio in computing the primary metric.

- **Report**: Runtime comparison, especially in the millisecond range, is unintuitive. I invert the measured time to compute the rate at which operations are performed - queries per second (QPS). For each iteration, I compute the ratio of the QPS observed for the two crates and report the mean and variance of this ratio across all iterations as my primary metric.

This way, instead of seeking to control the execution environment, I account for random noise (via repeated measurements) and drift (via interleaved measurements) and work with ratios of measured quantities[^2]. I report both the mean and variance of the observed QPS ratio to provide confidence in the reported metric. In my opinion, the results from this experimental setup are more trustworthy than [single-shot][polygon-clipping-bench] or [best-of-N-runs][legacy-geo-bench] comparisons, even though I have no control on the execution environment.

A final methodological note on _what_ is being measured - even though I evaluate simple operations in isolation, I use realistic inputs so that the benchmark is indicative of how the operations would perform in a real-world application. I use as input a set of polygons that represent the [boundaries of all the administrative districts of India][india-districts-shp][^3]. These computations could reasonably arise as a small step in a larger geo statistical study.


[^1]: A stark example of measurement drift is [CPU throttling][gcp-cpu-burst] – I found the measured runtime frequently jumps by ~30% after the benchmark has been running for about a minute. I also found that this drift does not affect runtime ratios (and hence the reported metrics) significantly. In my analyses, I remove the observations from the first few iterations to (mostly) avoid this jump.
[^2]: My methodology does not account for the possibility of systematic error. In the [study I linked earlier][modern-spatial-libraries-benchmark], the authors found a large performance difference stemming from differences in cache behavior of the list data type in Java and C. This difference was dependent on JVM configuration and CPU cache sizes. Such errors aren’t easy to anticipate (and hence correct) even in methodologies that seek to control the execution environment.
[^3]: I chose to use districts of India as the inputs primarily because the [TIGER/Line Shapefiles][tiger-shp] by no means have a monopoly on experimental design.

[best-camera-quote]: http://www.worldcat.org/oclc/501191335
[gcp-cpu-burst]: https://cloud.google.com/compute/docs/general-purpose-machines#cpu-bursting
[india-districts-shp]: https://purl.stanford.edu/sh819zz8121
[legacy-geo-bench]: https://svn.osgeo.org/osgeo/foss4g/benchmarking/geometry_libraries/doc/main.txt
[nanos-are-hard]: http://btorpey.github.io/blog/2014/02/18/clock-sources-in-linux/
[polygon-clipping-bench]: https://rogue-modron.blogspot.com/2011/04/polygon-clipping-wrapper-benchmark.html
[rust-monotonic-clock]: https://doc.rust-lang.org/std/time/struct.Instant.html
[tiger-shp]: https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html
[wiki-elapsed-time]: https://en.wikipedia.org/wiki/Elapsed_real_time

## Comparisons

I found that _geo_ performs better than _geos_ for all operations I benchmarked. The QPS ratio ranges from nearly 1 to 40 for the operations, though whether this difference is practically significant would depend on the application context. This difference in QPS stems from one of two sources:

- _geo_’s implementation provides better optimization opportunities to the compiler. The Rust compiler avoids memory allocations more aggressively and generates more efficient machine code than C++.
- _geo_’s algorithms are simpler. They entirely avoid costly computations that _geos_ incurs.

My analysis supports the [guidance][rust-perf-tips] that it is better to concentrate on algorithmic and data-structure driven performance improvements in your programs over manual micro-tuning – a program that avoids a computation entirely always performs better than one that computes it efficiently. It also supports the argument that Rust’s language model provides for better optimization opportunities for the compiler, leading to more efficient machine code than C/C++.

But, as with many compiler optimization benchmarks, when it comes to performance benefit simply from using Rust, [your mileage may vary](#a-note-on-compiler-optimization-settings).


[rust-perf-tips]: https://nnethercote.github.io/perf-book/general-tips.html

### Minimum Bounding Rectangle

The first operation I compare is also the simplest – the computation of the [minimum bounding rectangle][wiki-mbr] of the input geometry. I found that _geo_ and _geos_ perform similarly. On average, _geo_ computes 1.4 times as many queries per second as _geos_ (mean from 150 observations with standard deviation of 0.2).

A visual representation of all 150 observations provides further insight into the observed difference.

{:refdef: style="text-align: center;"}
![](/assets/article_images/geo-geos-perf/mbr-qps-ratio.svg)
{: refdef}

Observe how the QPS ratio stays above 1.0 for most observations. Also observe how the QPS ratio varies to a much larger degree after the first 80 observations. It is useful to graph the raw observations to understand this increase in variance.

{:refdef: style="text-align: center;"}
![](/assets/article_images/geo-geos-perf/mbr-qps.svg)
{: refdef}

This graph reveals that not only does the runtime vary more after the first 80 observations, it drops significantly for both crates for the latter observations. This is an example of observational drift I had mentioned in the methodology section – an uncontrolled environment factor affected performance of both _geo_ and _geos_ significantly during this benchmark run, but the QPS ratio remains unaffected. The variance in the ratio jumps for the latter observations because the QPS for _geo_ varies to a larger degree around its mean than _geos_ for these observations.


[wiki-mbr]: https://en.wikipedia.org/wiki/Minimum_bounding_rectangle


#### Root-cause analysis

To understand the reasons behind the observed performance difference, I profiled both implementations using [linux perf][linux-perf][^4] to estimate the CPU cycles spent in various functions.

The following (vastly) simplified perf report for geo’s computation shows what you would expect:

<pre>
- 83.42% geo_types::private_utils::get_min_max (inlined)
- 16.58% &lt;core::iter::adapters::flatten::FlatMap&lt;I,U,F&gt; as core::iter::traits::iterator::Iterator&gt;::next (inlined)
</pre>

Most of the CPU cycles are spent inside `geo_types::private_utils::get_min_max`, computing the minimum (and maximum) values of the x- and y-coordinates of all the vertices in the geometry. The remaining time is spent inside the implementation of an iterator over all the vertices.

Contrast the simple perf report for _geo_ with that for _geos_:

<pre>
- 89.69% &lt;geos::geometry::Geometry as geos::geometry::Geom&gt;::envelope
   - 84.02% geos::geom::GeometryFactory::toGeometry
      - 21.57% geos::geom::GeometryFactory::createLinearRing
      - 17.81% geos::geom::GeometryFactory::createPolygon
      - 13.58% geos::geom::DefaultCoordinateSequenceFactory::create
      - 9.42% std::unique_ptr&lt;geos::geom::Geometry, std::default_delete&lt;geos::geom::Geometry&gt; &gt;::unique_ptr&lt;geos::geom::Polygon, std::default_delete&lt;geos::geom::Polygon&gt;, void&gt;
         3.7% geos::geom::Envelope::getMinY
- 10.30% core::ptr::drop_in_place&lt;geos::geometry::Geometry&gt; (inlined)
      - 9.4% geos::geom::Polygon::~Polygon
</pre>

Like all perf report snippets in this post, this is a simplified view of a perf report that shows a tree of call-graphs. Stack frames deeper in the call-graph are indented further to the right. Each stack frame is labeled with the fraction of total CPU cycles spent inside the subtree rooted at that node. For example, the report above states that 89.67% of the total CPU cycles are spent inside `<geos::geometry::Geometry as geos::geometry::Geom>::envelope` or its children, 84.02% of total CPU cycles are spent in `geos::geom::GeometryFactory::toGeometry` and its children, when called by `<geos::geometry::Geometry as geos::geometry::Geom>::envelope`, and so on.

This perf report indicates that very little time is spent in a computation similar to `geo_types::private_utils::get_min_max` from above (3.7% in `geos::geom::Envelope::getMinY`). Most of the time is instead spent in creating new geometry objects via `geos::geom::GeometryFactory::toGeometry`, and the rest is spent destroying those objects.

Another look at the input geometries in my experimental setup helps shed light on why memory allocation is the bottleneck in geos computation. The input geometry consists of a collection of polygons. The minimum bounding rectangle of the entire geometry is the minimum bounding rectangle of the individual polygons’ minimum bounding rectangles. _geos_ allocates polygons to represent the minimum bounding rectangle of all the polygons in the input, uses those to compute the overall minimum bounding rectangle, and then destroys the intermediate polygons. The allocation and deallocation of these temporary polygons easily outweighs the computational cost of computing the minimum and maximum of a few coordinates.

It is not surprising that memory allocation is the costliest step in _goes_’ computation. On the contrary, it is surprising that _geo_ avoids a similar cost. A look at the disassembled machine code for _geo_’s implementation reveals the secret:

<pre class="assembly">
&lt;geo_types::multi_polygon::MultiPolygon&lt;T&gt; as geo::algorithm::bounding_rect::BoundingRect&lt;T&gt;&gt;::bounding_rect()

[ ... SNIP ... ]

             _ZN9geo_types13private_utils17get_bounding_rect17h979dc24cd95606a7E():
                     return Some(Rect::new(
               <b>movsd</b>  %xmm2,0x8(%rax)
               <b>movsd</b>  %xmm1,0x10(%rax)
               <b>movsd</b>  %xmm4,0x18(%rax)
               <b>movsd</b>  %xmm3,0x20(%rax)
               mov    $0x1,%r8d
             _ZN120_$LT$geo_types..multi_polygon..MultiPolygon$LT$T$GT$$u20$as$u20$geo..algorithm..bounding_rect..BoundingRect$LT$T$GT$$GT$13bounding_rect17hcabacac00bf1cedeE():
        148:   mov    %r8,(%rax)

[ ... SNIP ... ]
</pre>

This is a snippet of the relevant function in _geo_. The source code annotation shows the anticipated allocation of a new rectangle to represent the minimum bounding rectangle for each input polygon. But the corresponding assembly consists only of `movsd`, an [x86 instruction to move double precision floating point values][x86-movsd], and no calls to memory allocation subroutines. My guess here is that because of Rust’s explicit memory lifetime semantics, the compiler is able to entirely optimize away memory allocation, instead recycling freed memory to store the individual minimum bounding rectangles!

In the end, even though (or, partly because) the evaluated computations are very simple, this is not an apples-to-oranges comparison. The performance bottleneck for _geo_ is computation of minimum and maximum coordinates of the input polygons, while for _geos_ it is memory allocations. In a way, this is a comparison between numerical computation and memory allocation!


[^4]: Recorded with some variation of the command `perf record -F 300 -g --call-graph dwarf` and reported with some variation of `perf report -g`.

[linux-perf]: https://www.brendangregg.com/perf.html
[x86-movsd]: https://c9x.me/x86/html/file_module_x86_id_204.html

## Appendix

### A note on compiler optimization settings

## Scratchpad

Prior text

<pre>
- 89.69% &lt;geos::geometry::Geometry as geos::geometry::Geom&gt;::envelope
- 84.02% geos::geom::GeometryFactory::toGeometry
    + 21.57% geos::geom::GeometryFactory::createLinearRing
    + 17.81% geos::geom::GeometryFactory::createPolygon
    + 13.58% geos::geom::DefaultCoordinateSequenceFactory::create
    + 9.42% std::unique_ptr&lt;geos::geom::Geometry, std::default_delete&lt;geos::geom::Geometry&gt;&gt;::unique_ptr&lt;geos::geom::Polygon, std::default_delete&lt;geos::geom::Polygon&gt;, void&gt;
    3.7% geos::geom::Envelope::getMinY
- 10.30% core::ptr::drop_in_place&lt;geos::geometry::Geometry&gt; (inlined)
    + 9.4% geos::geom::Polygon::~Polygon
</pre>

Post text

<pre class="assembly">
&lt;geo_types::multi_polygon::MultiPolygon&lt;T&gt; as geo::algorithm::bounding_rect::BoundingRect&lt;T&gt;&gt;::bounding_rect()

[ ... SNIP ... ]

             _ZN9geo_types13private_utils17get_bounding_rect17h979dc24cd95606a7E():
                     return Some(Rect::new(
               <b>movsd  %xmm2,0x8(%rax)</b>
               movsd  %xmm1,0x10(%rax)
               movsd  %xmm4,0x18(%rax)
               movsd  %xmm3,0x20(%rax)
               mov    $0x1,%r8d
             _ZN120_$LT$geo_types..multi_polygon..MultiPolygon$LT$T$GT$$u20$as$u20$geo..algorithm..bounding_rect..BoundingRect$LT$T$GT$$GT$13bounding_rect17hcabacac00bf1cedeE():
        148:   mov    %r8,(%rax)

[ ... SNIP ... ]
</pre>