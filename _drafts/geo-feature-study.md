---
layout: post
title:  "Geo feature study"
date:   2022-01-16 00:00:00 +0000
categories: geoscience
style: geo-feature-study
---

Rust is a relatively new programming language and many problems being tackled in Rust have existing solutions in C/C++.
As a Rust developer in need of some non-trivial functionality, you often must choose between using a Rust wrapper of an
existing C/C++ library or a pure Rust alternative. In this article, I compare [_geo_](https://lib.rs/crates/geo), a
crate that provides primitives and algorithms for two dimensional geometric operations on a plane or on the earth’s
surface, with the most prominent alternative –  [_geos_](https://lib.rs/crates/geos), a wrapper of the C++
[_libgeos_](https://libgeos.org/) library. These crates can interoperate via the Rust
[ecosystem for Geospatial analysis](https://georust.org/).

As is frequently the case, _libgeos_ is more mature than the Rust upstart. It has a longer history of development[^1], a
more formalized [project steering committee](https://libgeos.org/development/psc/), and illustrious clients including
[PostGIS](https://postgis.net/), [QGIS](https://qgis.org/en/site/), [GDAL](https://gdal.org/) and
[Shapely](https://shapely.readthedocs.io/en/stable/). _geo_ potentially has better memory safety because it is written
in (safe) Rust. In the rest of this article, I address a single point of comparison between these alternatives for a
prospective Rust client – feature parity.

_libgeos_ is implemented in C++ but it exports a [C API](https://libgeos.org/doxygen/geos__c_8h.html). _geos_ wraps
(most of) this C API in two steps – The _geos-sys_ crate provides FFI bindings for the C API, and _geos_ wraps it in a
more idiomatic Rust API. _libgeos_ itself is a port of the [Java _JTS_ library](https://locationtech.github.io/jts/),
so you could add another conceptual step in the porting / wrapping chain:

    TODO: Insert image.

As a rust developer, the relevant API for you is the one exported finally by the _geos_ crate so I mostly reference that
in my comparison. I call out cases where C/C++ API exists but isn’t (yet) exposed by _geos_.

_libgeos_’ feature set is more extensive than _geo_, and it also uses
[more complex namespaces](https://libgeos.org/doxygen/namespaces.html) for organization of the functionality. For my comparison, I choose a different option for organizing the functionality –  I classify _geo_’s functions into the
[PostGIS reference documentation](https://postgis.net/docs/reference.html) sections. I map these functions to those from _geos_, and call out features that are missing in _geo_. _PostGIS_ is a widely used, extensive implementation of the
[OGC Simple Feature Access-SQL standard](https://www.ogc.org/standards/sfs) so it is useful to map the features to
_PostGIS_. I also think that _PostGIS_ has the most intuitive organization of this feature set and the best in-depth documentation of each feature.

Finally, all of these projects are actively being developed. This comparison (and links below) apply best to
[_geo_ 0.18.0](https://docs.rs/geo/0.18.0/geo/), [_geos_ 8.0.3](https://docs.rs/geos/8.0.3/geos/) and
[_PostGIS_ 3.2](https://postgis.net/docs/manual-3.2/reference.html). Let’s jump in then!


[^1]: I couldn’t find the first commit for _libgeos_. The oldest reference I have is from [this commit-hook post to the
      osgeo mailing list](https://lists.osgeo.org/pipermail/geos-commits/2007-November/000000.html) dated Nov 22, 2007.
      For _geo_, the [first commit](https://github.com/georust/geo/pull/1) was on Jan 16, 2015.


## Measurement Functions

_geo_ provides 8 of the 27 functions in this
[section of _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#Measurement_Functions).

Missing features includes:

- 3D geometry operations. <span class="hl-not-available">Not available in _geos_</span>.
- [Hausdorff distance](https://postgis.net/docs/manual-3.2/ST_HausdorffDistance.html) between geometries.
  <span class="hl-available">Available in _geos_</span>.
- [Maximum distance](https://postgis.net/docs/manual-3.2/ST_MaxDistance.html) between geometries, converse of
  [ST_ClosestPoint](https://postgis.net/docs/manual-3.2/ST_ClosestPoint.html).
  <span class="hl-not-available">Not available in _geos_</span>.
- A [measure of robustness](https://postgis.net/docs/manual-3.2/ST_MinimumClearance.html) (to loss of precision) of
  geometry specification. <span class="hl-not-available">Not available in _geos_</span>.

Beyond these, _PostGIS_ provides some convenience functions that are easy to implement using those available in _geo_
and _geos_.

Next, I map the functions available in _geo_ to those from _geos_ and _PostGIS_.


<table class="comparison-table">
  <col style="width:15%">
  <col style="width:15%">
  <col style="width:15%">
  <col style="width:55%">
  <tr>
    <th>geo</th>
    <th>geos</th>
    <th>PostGIS</th>
    <th>Description / Remarks</th>
  </tr>
  <tr>
    <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/area/trait.Area.html">[algorithm::area::Area]</a></td>
    <td>1</td>
    <td>1</td>
    <td>1</td>
</tr>
</table>

