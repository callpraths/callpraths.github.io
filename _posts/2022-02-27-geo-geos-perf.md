---
layout: post
title:  "Performance comparison of three simple geospatial algorithms"
date:   2022-02-27 00:00:00 +0000
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

**What**: An application’s performance depends heavily on operational context – the application may perform differently for different inputs, in executing different operations, and when used in the context of other larger software. Thus, you should benchmark an application in an environment that is [faithful to the target context][brendangregg-methodology]. My performance evaluation below is not a broadly applicable comparison of Rust and C++, or even _geo_ and _geos_. Instead, it is an exercise in understanding the root causes of observed differences in performance of simple algorithms in isolation. I use realistic inputs so that I observe performance differences on meaningful operations, but side-step the issue of scale and software context. A more contextual evaluation would use real-world inputs at scale and a real-world problem with a sequence of operations. A good example is [this study comparing several modern spatial libraries][modern-spatial-libraries-benchmark].

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

A final methodological note on _what_ is being measured - even though I evaluate simple operations in isolation, I use realistic inputs so that the benchmark is indicative of how the operations would perform in a real-world application. I use as input a set of polygons that represent the [boundaries of all the administrative districts of India][india-districts-shp][^3]. These computations could reasonably arise as a small step in a larger geo-statistical study.

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

_geo_ performed better than _geos_ for all operations I benchmarked. The QPS ratio ranged from 1 to 40 for the operations. This difference in QPS stems from one of two sources:

- _geo_’s implementation provides better optimization opportunities to the compiler. The Rust compiler avoids memory allocations more aggressively and generates more efficient machine code than C++. But, as with many compiler optimization benchmarks, [your mileage may vary](#a-note-on-compiler-optimization-settings).
- _geo_’s algorithms are simpler. _geo_ avoids costly computations that _geos_ incurs.

Ultimately, algorithmic differences lead to larger performance gains, and amplify the performance improvements from compiler optimizations. Thus, my analysis supports the guidance that it is [better to concentrate on algorithmic and data-structure driven performance improvements][rust-perf-tips] in your programs over manual micro-tuning – a program that avoids a computation entirely always performs better than one that computes it efficiently.

[rust-perf-tips]: https://nnethercote.github.io/perf-book/general-tips.html


### Minimum Bounding Rectangle

The first operation I compare is also the simplest – the computation of the [minimum bounding rectangle][wiki-mbr] of a set of polygons. I found that _geo_ and _geos_ perform similarly. On average, _geo_ computes 1.4 times as many queries per second as _geos_ (mean from 150 observations with standard deviation of 0.2).

A visual representation of all 150 observations provides further insight into the observed difference:

{:refdef: style="text-align: center;"}
![](/assets/article_images/geo-geos-perf/mbr-qps-ratio.svg)
{: refdef}

Observe how the QPS ratio stays mostly above 1.0 but it varies to a much larger degree after the first 60 observations. The increased variance in latter observations is surprising. It is useful to graph the raw observations to understand this increase in variance:

{:refdef: style="text-align: center;"}
![](/assets/article_images/geo-geos-perf/mbr-qps.svg)
{: refdef}

This graph reveals that not only does the runtime vary more after the first 60 observations, it drops significantly for both crates. This is an example of observational drift I mentioned earlier – an uncontrolled environmental factor affected performance of both _geo_ and _geos_ significantly during this benchmark run, but the QPS ratio remained unaffected. The variance in the ratio jumps for the latter observations because the QPS for _geo_ varies to a larger degree around its mean than _geos_ for these observations.

[wiki-mbr]: https://en.wikipedia.org/wiki/Minimum_bounding_rectangle


#### Root-cause analysis

To understand the reasons behind the observed performance difference, I profiled both implementations using [linux `perf`][linux-perf][^4] to estimate the CPU cycles spent in various functions.

The following (vastly) simplified `perf` report for _geo_’s computation shows what you would expect:

<pre>
- 83.42% geo_types::private_utils::get_min_max (inlined)
- 16.58% &lt;core::iter::adapters::flatten::FlatMap&lt;I,U,F&gt; as core::iter::traits::iterator::Iterator&gt;::next (inlined)
</pre>

Most of the CPU cycles are spent inside `geo_types::private_utils::get_min_max`, computing the minimum (and maximum) values of the x- and y-coordinates of all the vertices in the geometry. The remaining CPU cycles are spent iterating over the vertices.

Contrast this simple report with that for _geos_:

<pre>
- 89.69% &lt;geos::geometry::Geometry as geos::geometry::Geom&gt;::envelope
   - <b>84.02% geos::geom::GeometryFactory::toGeometry</b>
      - 21.57% geos::geom::GeometryFactory::createLinearRing
      - 17.81% geos::geom::GeometryFactory::createPolygon
      - 13.58% geos::geom::DefaultCoordinateSequenceFactory::create
      - 9.42% std::unique_ptr&lt;geos::geom::Geometry, std::default_delete&lt;geos::geom::Geometry&gt; &gt;::unique_ptr&lt;geos::geom::Polygon, std::default_delete&lt;geos::geom::Polygon&gt;, void&gt;
         <b>3.7% geos::geom::Envelope::getMinY</b>
- 10.30% core::ptr::drop_in_place&lt;geos::geometry::Geometry&gt; (inlined)
      - 9.4% geos::geom::Polygon::~Polygon
</pre>

Like all `perf` report snippets in this post, this is a simplified view of a report that shows a tree of call stacks. Stack frames deeper in the call graph are indented further to the right. Each stack frame is labeled with the fraction of total CPU cycles spent inside the subtree rooted at that node. For example, the report above states that 89.69% of the total CPU cycles are spent inside `<geos::geometry::Geometry as geos::geometry::Geom>::envelope` or its children, 84.02% of total CPU cycles are spent in `geos::geom::GeometryFactory::toGeometry` and its children, when called by `<geos::geometry::Geometry as geos::geometry::Geom>::envelope`, and so on.

The report indicates that very little time is spent in a computation similar to `geo_types::private_utils::get_min_max` from above (3.7% in `geos::geom::Envelope::getMinY`). Most of the time is instead spent in creating new geometry objects via `geos::geom::GeometryFactory::toGeometry`, and the rest is spent destroying those objects.

Another look at the input geometry in my experimental setup helps shed light on why memory allocation is the bottleneck in _geos_ computation. The input geometry consists of a collection of polygons. The minimum bounding rectangle of the entire geometry is the minimum bounding rectangle of the individual polygons’ minimum bounding rectangles. _geos_ allocates polygons to represent the minimum bounding rectangle of each polygon in the input, uses those to compute the overall minimum bounding rectangle, and then destroys the intermediate polygons. The allocation and deallocation of these temporary polygons easily outweighs the cost of computing the minimum and maximum of a few coordinates. What is surprising is that _geo_ avoids a similar cost. A look at the disassembled machine code for _geo_’s implementation indicates how:

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

This is a snippet of the relevant function in _geo_. The source code annotation shows the anticipated allocation of a new rectangle to represent the minimum bounding rectangle for each input polygon. But the corresponding assembly consists only of `movsd`, an [x86 instruction to move double precision floating point values][x86-movsd], and no calls to memory allocation subroutines. The compiler is able to entirely optimize away memory allocation, instead recycling freed memory to store the individual minimum bounding rectangles! My guess here is that Rust's explicit memory lifetimes make such optimizations easier for the compiler.

In the end, even though (or, partly because) the evaluated computations are very simple, this is not an apples-to-oranges comparison - the performance bottleneck for _geo_ is computation of minimum and maximum coordinates of the input polygons, while for _geos_ it is memory allocations.


[^4]: Recorded with some variation of the command `perf record -F 300 -g --call-graph dwarf` and reported with some variation of `perf report -g`.

[linux-perf]: https://www.brendangregg.com/perf.html
[x86-movsd]: https://c9x.me/x86/html/file_module_x86_id_204.html


### Area

The second operation I compare is computation of (2-dimensional, planar) area. I found that _geo_ outperforms _geos_ with a larger margin than for minimum bounding rectangle. On average, _geo_ computes 8.1 times as many area queries per second as _geos_ (mean from 98 observations (after outlier removal) with standard deviation of 0.1).

{:refdef: style="text-align: center;"}
![](/assets/article_images/geo-geos-perf/area-qps-ratio.svg)
{: refdef}


#### Root-cause analysis

Here is a simplified `perf` report for a profiled _geo_ area computation.

<pre>
- geo::algorithm::area::twice_signed_ring_area (inlined)
  - 53.37% &lt;core::iter::adapters::map::Map&lt;I,F&gt; as core::iter::traits::iterator::Iterator&gt;::next (inlined)
  - 27.31% geo_types::line::Line&lt;T&gt;::determinant (inlined)
  - 19.31% &lt;geo_types::line::Line&lt;T&gt; as geo::algorithm::map_coords::MapCoords&lt;T,NT&gt;&gt;::map_coords (inlined)
</pre>

This report shows that half the CPU cycles are spent in iterators (over polygons and coordinates of polygons) and the remaining are spent in the individual polygons’ area computation.

A report for profiled _geos_ computation shows similar CPU cycle distribution:

<pre>
- 98.45% geos::algorithm::Area::ofRingSigned
   - 24.41% geos::geom::CoordinateArraySequence::getAt
      13.24% std::vector&lt;geos::geom::Coordinate, std::allocator&lt;geos::geom::Coordinate&gt; &gt;::operator[]
</pre>

A quarter of the CPU cycles are spent in iteration, and the rest are spent in the body of `geos::algorithm::Area::ofRingSigned` computing the area of individual polygons.

Unlike minimum bounding rectangle, the two implementations for area have similar performance profiles and performance bottleneck - area computation for the individual polygons. Both _geo_ and _geos_ use the [shoelace formula][shoelace-formula] for computing area of individual polygons[^5]. This computation in _geo_ is about 12 times faster than that in _geos_ (_geo_ overall area computation is 8 times faster; individual polygon area computation accounts for 50% of time in _geo_, but 75% in _geos_). The following snippets of disassembled machine code of the relevant functions reveal the reason behind this difference:

_geo_:

<pre class="assembly">
geo::algorithm::area::get_linestring_area()
Event: cpu-clock
Percent

[ … SNIP … ]

               mulpd  %xmm2,%xmm4
              _ZN45_$LT$f64$u20$as$u20$core..ops..arith..Sub$GT$3sub17h7b8b1be7ea3e7a7aE():
  <b>1.86</b>         <b>movapd</b> %xmm4,%xmm2
               unpckhpd %xmm4,%xmm2
               subsd  %xmm2,%xmm4

[ … SNIP …]
</pre>

_geos_:

<pre class="assembly">
geos::algorithm::Area::ofRingSigned()
Event: cpu-clock
Percent

[... SNIP
 <b>10.18</b>         <b>movsd</b>  %xmm0,-0x80(%rbp)
              sum += p1.x * (p0.y - p2.y);
  2.63         movsd  -0x60(%rbp),%xmm1
               movsd  -0x38(%rbp),%xmm0
               movsd  -0x78(%rbp),%xmm2
               subsd  %xmm2,%xmm0
  2.52         mulsd  %xmm1,%xmm0
  6.46         movsd  -0x8(%rbp),%xmm1
               addsd  %xmm1,%xmm0
 <b>11.71</b>         <b>movsd</b>  %xmm0,-0x8(%rbp)

[ ...SNIP… ]
</pre>

_geos_ spends a large fraction of CPU cycles moving scalar double-precision floating-point values between memory locations via the [`movsd`][x86-movsd] instruction. _geo_ instead uses the [`movapd`][x86-movapd] instruction to move two double-precision floating-point values for far fewer CPU cycles. The Rust compiler vectorizes the area computation and delivers a significant speed up!

_geo_ achieves another small speed up via faster iteration. Iteration in _geo_ is 4 times faster than in _geos_. I have not analyzed the root cause of this speed up, but the machine code generated for iteration by the Rust compiler was significantly simpler than that for C++, with more aggressive inlining and consistent performance gain, for all the operations that I benchmarked.

[^5]: In an [earlier post on this blog][area-numerical-stability-post], I discuss some numerical stability concerns in computing area of a polygon using the shoelace formula.

[area-numerical-stability-post]: https://callpraths.github.io/geoscience/2021/12/23/geo-area-error-analysis.html
[shoelace-formula]: https://mathworld.wolfram.com/PolygonArea.html
[x86-movapd]: https://c9x.me/x86/html/file_module_x86_id_179.html


### Centroid

Among the operations I benchmarked, I found the largest performance difference in computation of the centroid. On average, _geo_ computes 47.6 times as many centroid queries per second as _geos_ (mean from 100 observations (after outlier removal) with standard deviation of 1.39).

{:refdef: style="text-align: center;"}
![](/assets/article_images/geo-geos-perf/centroid-qps-ratio.svg)
{: refdef}


#### Root-cause analysis

Centroid computation is a more complex operation than the two I described above. The key sources of speed up in _geo_ are the same – more aggressive function inlining and vectorization of hot computations – but their effect is amplified by algorithmic differences in the two implementations. _geos_’ algorithm iterates over polygons (and their coordinates) many more times than _geo_, and requires more numerical computations than _geo_.

The following simplified `perf` report for _geo_ indicates a more complex algorithm than any of the reports above:

<pre>
- geo::algorithm::centroid::CentroidOperation&lt;T&gt;::add_ring
   - 54.68% <b>(inlined)</b> &lt;core::iter::adapters::map::Map&lt;I,F&gt; as core::iter::traits::iterator::Iterator&gt;::fold
      - 31.77% <b>(inlined)</b> core::iter::adapters::map::map_fold::_$u7b$$u7b$closure$u7d$$u7d$::h852ff4143359a141
         - 22.91% <b>(inlined)</b> geo::algorithm::centroid::CentroidOperation$LT$T$GT$::add_ring::_$u7b$$u7b$closure$u7d$$u7d$::hba507e9435c4b508
            - 8.85% <b>(inlined)</b> &lt;geo_types::coordinate::Coordinate&lt;T&gt; as core::ops::arith::Mul&lt;T&gt;&gt;::mul
            - 8.85% <b>(inlined)</b> &lt;geo_types::coordinate::Coordinate&lt;T&gt; as core::ops::arith::Add&gt;::add
            8.85% <b>(inlined)</b> geo_types::line_string::LineString$LT$T$GT$::lines::_$u7b$$u7b$closure$u7d$$u7d$::ha94da3e3994f7f24
         22.91% <b>(inlined)</b> &lt;core::slice::iter::Windows&lt;T&gt; as core::iter::traits::iterator::Iterator&gt;::next
   - 45.31% geo::algorithm::area::get_linestring_area
      - 31.77% <b>(inlined)</b> &lt;core::iter::adapters::map::Map&lt;I,F&gt; as core::iter::traits::iterator::Iterator&gt;::next
         - 18.23% <b>(inlined)</b> core::option::Option&lt;T&gt;::map
      - 8.85% <b>(inlined)</b> &lt;geo_types::line::Line&lt;T&gt; as geo::algorithm::map_coords::MapCoords&lt;T,NT&gt;&gt;::map_coords
            <b>(inlined)</b> &lt;f64 as core::ops::arith::Sub&gt;::sub
</pre>

Note how all significant operations within `add_ring` are inlined by the compiler. The following snippet from disassembled machine code for `add_ring` shows that these inlined computations are also successfully vectorized (as before, the costliest instructions uses packed double-precision floating-point operands):

<pre class="assembly">
geo::algorithm::centroid::CentroidOperation&lt;T&gt;::add_ring()
Event: cpu-clock

Percent

[ ...SNIP... ]
             _ZN9geo_types11line_string19LineString$LT$T$GT$5lines28_$u7b$$u7b$closure$u7d$$u7d$17ha94da3e3994f7f24E():
                 /// assert!(lines.next().is_none());
                 /// ```
                 pub fn lines(&'_ self) -&gt; impl ExactSizeIterator + Iterator&lt;Item = Line&lt;T&gt;&gt; + '_ {
                     self.0.windows(2).map(|w| {
                         // slice::windows(N) is guaranteed to yield a slice with exactly N elements
                         unsafe { Line::new(*w.get_unchecked(0), *w.get_unchecked(1)) }
        1b0:  movapd %xmm3,%xmm4
 <b>16.67</b>        <b>movapd</b> %xmm2,%xmm5
              movupd (%rcx),%xmm3
             _ZN45_$LT$f64$u20$as$u20$core..ops..arith..Sub$GT$3sub17h7b8b1be7ea3e7a7aE():
              subpd  %xmm1,%xmm4
              movapd %xmm3,%xmm6
  <b>8.33</b>        <b>subpd</b>  %xmm1,%xmm6
             _ZN45_$LT$f64$u20$as$u20$core..ops..arith..Mul$GT$3mul17h6535908bdf049e14E():
              movapd %xmm6,%xmm2
              shufpd $0x1,%xmm6,%xmm2
              mulpd  %xmm4,%xmm2
             _ZN45_$LT$f64$u20$as$u20$core..ops..arith..Add$GT$3add17hc97f37a33d9f3bdcE():
 <b>16.67</b>        <b>addpd</b>  %xmm4,%xmm6
             _ZN45_$LT$f64$u20$as$u20$core..ops..arith..Mul$GT$3mul17h6535908bdf049e14E():
              movapd %xmm2,%xmm4
              unpckhpd %xmm2,%xmm4
              subsd  %xmm4,%xmm2
 <b>16.67</b>        <b>unpcklpd</b> %xmm2,%xmm2
              mulpd  %xmm6,%xmm2
             _ZN45_$LT$f64$u20$as$u20$core..ops..arith..Add$GT$3add17hc97f37a33d9f3bdcE():
              addpd  %xmm5,%xmm2
             _ZN94_$LT$core..slice..iter..Windows$LT$T$GT$$u20$as$u20$core..iter..traits..iterator..Iterator$GT$4next17h9d7ae68615430372E():
  8.33        cmp    $0x2,%rax
            ↑ jb     96
 <b>33.33</b>        add    $0x10,%rcx
              add    $0xffffffffffffffff,%rax

[ ...SNIP... ]
</pre>

Contrast the `perf` report for _geo_ with the following report for _geos_. The call graph is deeper (less inlining) and there are multiple instances of iteration and costly computations in `geos::geom::Coordinate::distance`, `geos::algorithm::Centroid::centroid3` and `geos::algorithm::Centroid::area2`.

<pre>
- &lt;geos::geometry::Geometry as geos::geometry::Geom&gt;::get_centroid
   - 99.79% geos::geom::Geometry::getCentroid
      - 99.60% geos::geom::Geometry::getCentroid
         - 99.30% geos::algorithm::Centroid::getCentroid
            - 99.10% geos::algorithm::Centroid::Centroid
               - 99.00% geos::algorithm::Centroid::add
                  - 98.81% geos::algorithm::Centroid::add
                     - 98.60% geos::algorithm::Centroid::add
                        - 98.41% geos::algorithm::Centroid::addShell
                           - 47.47% geos::algorithm::Centroid::addLineSegments
                              - 17.73% <b>geos::geom::CoordinateSequence::operator[]</b>
                              - 13.27% <b>geos::geom::Coordinate::distance</b>
                           - 17.73% geos::algorithm::Centroid::addTriangle
                              5.74% <b>geos::algorithm::Centroid::centroid3</b>
                              2.87% <b>geos::algorithm::Centroid::area2</b>
                           - 15.75% geos::algorithm::Orientation::isCCW
                              - 5.94% geos::geom::CoordinateSequence::getY
                           - 8.22% std::unique_ptr&lt;geos::geom::Coordinate, std::default_delete&lt;geos::geom::Coordinate&gt; &gt;::operator*
                           - <b>6.14% geos::geom::CoordinateSequence::operator[]</b>
</pre>

A look at the machine code for the particularly costly `geos::geom::Coordinate::distance` function shows that the compiler is unable to vectorize the computations. The costliest instructions are the non-vectorized double precision floating-point instructions (`movsd`, `addsd`, ...):

<pre class="assembly">
geos::geom::Coordinate::distance()
Event: cpu-clock

Percent

[ ...SNIP... ]

  <b>9.64</b>        <b>movsd</b>  %xmm0,-0x8(%rbp)
             double dy = y - p.y;
  3.61        mov    -0x18(%rbp),%rax
              movsd  0x8(%rax),%xmm0
              mov    -0x20(%rbp),%rax
  4.82        movsd  0x8(%rax),%xmm1
              subsd  %xmm1,%xmm0
  1.20        movsd  %xmm0,-0x10(%rbp)
             return std::sqrt(dx * dx + dy * dy);
  3.61        movsd  -0x8(%rbp),%xmm0
  4.82        movapd %xmm0,%xmm1
              mulsd  -0x8(%rbp),%xmm1
 <b>19.28</b>        <b>movsd</b>  -0x10(%rbp),%xmm0
              mulsd  -0x10(%rbp),%xmm0
 <b>10.84</b>        <b>addsd</b>  %xmm1,%xmm0
 <b>10.84</b>      → callq  sqrt@plt

[ ...SNIP... ]
</pre>


## Conclusion

The three operations I benchmarked have increasingly complex algorithms, and an increasing gap in performance between _geo_ and _geos_. Analysis shows that the root cause of the performance gap is compiler optimization - function inlining, vectorization and skipped memory allocations - and the more complex algorithms amplify the effects of these optimizations. The answer to my question of Rust vs C++ performance might come down to the ability of each language, and it ecosystem, to nudge developers into writing programs that are more efficient and easier to optimize for the compiler. Rust's explicit memory lifetimes and traits-based polymorphism (instead of OO-style classes) are foundational innovations that might explain the edge in performance that _geo_ has over _geos_.


## Appendix

### Reproducing these results

The harness and Jupyter notebooks used in this analysis are [available on github][gh-harness]. The _geo_ crate used was version [0.18.0][geo-version]. The _geos_ crate used was version [8.0.3][geos-version] with _libgeos_ version [3.10.1][libgeos-version].

_geo_, _geos_ and _libgeos_ were all compiled from source. _geo_ and _geos_ were compiled with `rustc` 1.56.1 using [cargo’s release profile][cargo-release-profile]. _libgeos_ was compiled with `gcc` 8.3.0 using `cmake`’s [`RelWithDebInfo` `CMAKE_BUILD_TYPE`][cmake-relwithdebinfo].

The benchmarks were run on a Google Cloud Project [e2-medium][gcp-e2-medium] VM instance, often repeatedly over the course of many days. I expect that a variety of physical nodes were used for the benchmark runs and there were uncontrolled effects from throttling and resource sharing. The Operating System was a GCP-optimized variant of [Debian 4.19 linux][linux-version].

[gh-harness]: https://github.com/callpraths/explore-georust
[geo-version]: https://crates.io/crates/geo/0.18.0
[geos-version]: https://crates.io/crates/geos/8.0.3
[libgeos-version]: https://crates.io/crates/geos/8.0.3
[cargo-release-profile]: https://doc.rust-lang.org/cargo/reference/profiles.html#release
[cmake-relwithdebinfo]: https://cmake.org/cmake/help/latest/variable/CMAKE_BUILD_TYPE.html
[gcp-e2-medium]: https://cloud.google.com/compute/docs/general-purpose-machines#e2_machine_types
[linux-version]: https://packages.debian.org/buster/linux-source-4.19

### A note on compiler optimization settings

Compiler optimization settings have a large impact on performance. I compiled all Rust code for this post with the highest optimization level available in `rustc`: `-O3` but compiled C++ code for _libgeos_ with `gcc`'s optimization flag set to `-O2` instead of the highest available `-O3`. This difference is the result of the default compiler flags used by the relevant tooling. `cargo`'s release profile enables the highest level of optimization, but `cmake`'s `RelWithDebInfo` setting [only enables `-O2`][llvm-opt-flags].

I could have set `CMAKE_BUILD_TYPE` to `Release`, which enables `-O3` level of optimization, but it also disables symbol table generation needed for debugging and profiling tools (in particular for my use of `perf`). I could enable debugging symbols explicitly with `Release` (by setting `gcc`'s `-g` flag), but `gcc`'s documentation notes that call graphs may not be accurate with this level of optimization. Also, `gcc`'s documentation [does not recommend using `-O3` optimization level][gcc-no-o3] by default as it can sometimes have the opposite effect of slowing programs down.

For completeness, I compared the operations once again with `gcc`’s optimization level set to `-O3`. The following table shows the average (and standard deviation of) ratio of observed QPS for _geo_ compared to _geos_ for each of the three operations when _libgeos_ is compiled with `-O2` and `-O3`:

|                            | _geo_ `-O3` / _geos_ `-O2` | _geo_ `-O3` / _geos_ `-O3` |
| -------------------------- | -------------------------- | -------------------------- |
| Minimum Bounding Rectangle | 1.45 (std 0.21)            | 0.09 (std 0.004)           |
| Area                       | 8.13 (std 0.10)            | 2.27 (std 0.02)            |
| Centroid                   | 47.61 (std 1.39)           | 11.70 (std 0.27)           |

`-O3` uniformly improves the performance of _geos_. In the case of minimum bounding rectangle, _geos_ even performs better than _geo_. But profiling with `perf` shows that my root cause analyses still hold - the effect of function inlining is limited and memory allocations are not entirely removed, although `gcc` finds more opportunities to vectorize loops. Thus, the analysis in this post is still (mostly) applicable with the increased optimization level, though it is harder to follow due to missing symbol information.

[llvm-opt-flags]: https://llvm.org/docs/CMake.html#frequently-used-cmake-variables
[gcc-no-o3]: https://wiki.gentoo.org/wiki/GCC_optimization#-O