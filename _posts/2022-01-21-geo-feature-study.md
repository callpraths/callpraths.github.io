---
layout: post
title:  "Feature set study: geo vs geos"
date:   2022-01-21 00:00:00 +0000
categories: geoscience
style: geo-feature-study
---

Rust is a relatively new programming language and many problems being tackled in Rust have existing solutions in C/C++.
As a Rust developer in need of some non-trivial functionality, you often must choose between using a Rust wrapper of an
existing C/C++ library and a pure Rust alternative. In this article, I compare [_geo_](https://lib.rs/crates/geo), a
crate that provides primitives and algorithms for two dimensional geometric operations, with the most prominent
alternative, [_geos_](https://lib.rs/crates/geos), a wrapper of the C++ [_libgeos_](https://libgeos.org/) library.
You can use these crates together because they interoperate via the Rust [ecosystem for Geospatial analysis](https://georust.org/).

As is frequently the case, _libgeos_ is more mature than the Rust upstart. It has a longer history of development[^1], a
more formalized [project steering committee](https://libgeos.org/development/psc/), and illustrious clients including
[PostGIS](https://postgis.net/), [QGIS](https://qgis.org/en/site/), [GDAL](https://gdal.org/) and
[Shapely](https://shapely.readthedocs.io/en/stable/). _geo_ potentially has better memory safety because it is written
in (safe) Rust.

_libgeos_ is implemented in C++ and exports a [C API](https://libgeos.org/doxygen/geos__c_8h.html). _geos_ wraps
(most of) this C API in two steps – The [_geos-sys_](https://lib.rs/crates/geos-sys) crate provides raw
[FFI](https://doc.rust-lang.org/nomicon/ffi.html) bindings for the C API, and _geos_ wraps it in a
more idiomatic Rust API. _libgeos_ itself is a port of the [Java JTS library](https://locationtech.github.io/jts/),
so you could add another conceptual step in the porting / wrapping chain.

In the rest of this article, I address a single point of comparison between these alternatives – feature parity.
As a rust developer, the relevant API for you is the one exported finally by the _geos_ crate so I mostly reference that
in my comparison.

_libgeos_’ feature set is more extensive than _geo_'s, and it uses
[more complex namespaces](https://libgeos.org/doxygen/namespaces.html) for organization of the functionality.
For my comparison, I choose a different option for organizing the functionality –  I classify _geo_’s functions using
[PostGIS reference documentation](https://postgis.net/docs/reference.html) sections. _PostGIS_ is a widely used and
extensive implementation of the [OGC Simple Feature Access-SQL standard](https://www.ogc.org/standards/sfs) so it is
useful to map the features to _PostGIS_. I also think that _PostGIS_ has the most intuitive organization of the feature
set and the best in-depth documentation of each function. For each section, I map _geo_'s functionality to _geos_, and
call out features that are missing in _geo_.

Finally, all of these projects are actively being developed. This comparison (and links below) apply best to
[_geo_ 0.18.0](https://docs.rs/geo/0.18.0/geo/), [_geos_ 8.0.3](https://docs.rs/geos/8.0.3/geos/) and
[_PostGIS_ 3.2](https://postgis.net/docs/manual-3.2/reference.html). Let’s jump right in!


[^1]: I couldn’t find the first commit for _libgeos_. The oldest reference I have is from [this commit-hook post to the
      osgeo mailing list](https://lists.osgeo.org/pipermail/geos-commits/2007-November/000000.html) dated Nov 22, 2007.
      For _geo_, the [first commit](https://github.com/georust/geo/pull/1) was on Jan 16, 2015.


## Measurement Functions

_geo_ provides 8 of 27 functions in this
[section of the _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#Measurement_Functions).

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

Let's now map features available in _geo_ to those from _PostGIS_ and _geos_.

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute area of a planar polygon. <br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Area.html">ST_Area</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/area/trait.Area.html">algorithm::area::Area</a></td>
 </tr>
 <tr>
   <th>geos</th>
   <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.area">Geom::area</a></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the azimuthal angle between two geometries.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Azimuth.html">ST_Azimuth</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/bearing/trait.Bearing.html">algorithm::bearing::Bearing</a></td>
 </tr>
 <tr>
   <th>geos</th>
   <td><span class="hl-not-available">Not available</span></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Find a point on a geometry closest to another geometry.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_ClosestPoint.html">ST_ClosestPoint</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/closest_point/trait.ClosestPoint.html">algorithm::closest_point::ClosestPoint</a></td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.nearest_points">Geom::nearest_points</a></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Find the Euclidean distance between geometries. All three packages have support for optimized computation of the
       distance using an index. Additionally, PostGIS provides
       <a href= "https://postgis.net/docs/manual-3.2/reference.html#operators-distance">an algebra</a> based on this function.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Distance.html">ST_Distance</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/euclidean_distance/trait.EuclideanDistance.html">algorithm::euclidean_distance::EuclideanDistance</a>,
       <a href="https://docs.rs/geo/0.18.0/geo/algorithm/euclidean_distance/fn.nearest_neighbour_distance.html">algorithm::euclidean_distance::nearest_neighbour_distance</a></td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.distance">Geom::distance</a>,
        <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.distance_indexed">Geom::distance_indexed</a></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the Cartesian length of a geometry. Only applicable to lines and multi-lines.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Length.html">ST_Length</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/euclidean_length/trait.EuclideanLength.html">algorithm::euclidean_length::EuclideanLength</a></td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.length">Geom::length</a></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute a <a href="https://en.wikipedia.org/wiki/Fr%C3%A9chet_distance">measure of similarity of two geometries</a>, due to Maurice Frechet.
       PostGIS and geos provide a way to densify the geometries beforehand, which can improve the distance estimate.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_FrechetDistance.html">ST_FrechetDistance</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/frechet_distance/trait.FrechetDistance.html">algorithm::frechet_distance::FrechetDistance</a></td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.frechet_distance">Geom::frechet_distance</a>,
        <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.frechet_distance_densify">Geom::frechet_distance_densify</a></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the great-arc distance between two geometries on a geodetic model. geo provides two algorithms for this computation based on a spheroidal model of the earth. PostGIS provides one algorithm each based on spherical and spheroidal models.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_DistanceSphere.html">ST_DistanceSphere</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_Distance_Spheroid.html">ST_DistanceSpheroid</a>
       (based on <a href="https://en.wikipedia.org/wiki/Vincenty%27s_formulae">Vincenty's method</a>)
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/vincenty_distance/trait.VincentyDistance.html">algorithm::vincenty_distance::VincentyDistance</a>,
       <a href="https://docs.rs/geo/0.18.0/geo/algorithm/geodesic_distance/trait.GeodesicDistance.html">algorithm::geodesic_distance::GeodesicDistance</a> (improvement over Vincenty's method)</td>
 </tr>
 <tr>
   <th>geos</th>
    <td><span class="hl-not-available">Not available</span></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the great-arc length of a geometry. Implementations follow great-arc distance computations closely.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Length_Spheroid.html">ST_LengthSpheroid</a>
       (based on <a href="https://en.wikipedia.org/wiki/Vincenty%27s_formulae">Vincenty's method</a>)
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/vincenty_length/trait.VincentyLength.html">algorithm::vincenty_length::VincentyLength</a>,
       <a href="https://docs.rs/geo/0.18.0/geo/algorithm/geodesic_length/trait.GeodesicLength.html">algorithm::geodesic_length::GeodesicLength</a>
       (improvement over Vincenty's method)</td>
 </tr>
 <tr>
   <th>geos</th>
    <td><span class="hl-not-available">Not available</span></td>
 </tr>
</table>


## Geometry Accessors

_geo_ effectively provides 15 of 42 functions in this
[section of the _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#Geometry_Accessors) . While
there is a large gap in the feature set in this section, many of the missing functions have easy and idiomatic
implementations using available accessors and iterators. Also, some of the functions are not applicable to _geo_ because
of limitations of the types of geometries supported.

Missing features includes:

- Functions related to 3D and 4D geometries. The extra coordinates are used to specify the height (z) and/or a
  measure (m) at the given point. These are not applicable to _geo_ as _geo_ only supports 2D geometries. _geos_
  supports 3D geometries (with a z-dimension) but has no notion of a measure.
- Functions related to curves (with non-linear interpolation between points) and surfaces (3D non-linear surfaces).
  These are not applicable to _geo_ and _geos_ as neither library supports non-linear geometries.
- A method to obtain the amount of memory consumed by a geometry. Not available in _geo_ and _geos_.

Beyond these, _PostGIS_ provides some convenience functions that are easy to implement using those available in _geo_
and _geos_.

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the bounding rectangle for a geometry.
       Additionally, PostGIS has
       <a href="https://postgis.net/docs/manual-3.2/reference.html#operators-bbox">an algebra</a> relating the bounding
       rectangles of two geometries.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Envelope.html">ST_Envelope</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/bounding_rect/trait.BoundingRect.html">algorithm::bounding_rect::BoundingRect</a></td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.envelope">Geom::envelope</a></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the dimensionality of a geometry. Only geo properly handles collinear points.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Dimension.html">ST_Dimension</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/dimensions/trait.HasDimensions.html">algorithm::dimensions::HasDimensions</a></td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_num_dimensions">Geom::get_num_dimensions</a></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Access specific points on a line or multi-line.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_NumPoints.html">ST_NumPoints</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_PointN.html">ST_PointN</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_StartPoint.html">ST_StartPoint</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_EndPoint.html">ST_EndPoint</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/struct.LineString.html#method.points_iter">LineString::points_iter</a>,
   <a href="https://docs.rs/geo/0.18.0/geo/struct.Line.html#method.start_point">Line::start_point</a>,
   <a href="https://docs.rs/geo/0.18.0/geo/struct.Line.html#method.end_point">Line::end_point</a> etc.
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_num_points">Geom::get_num_points</a>,
    <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_point_n">Geom::get_point_n</a>,
    <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_start_point">Geom::get_start_point</a>,
    <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_end_point">Geom::get_end_point</a>
    </td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Destructure a point. geo only supports 2D geometries. geos supports the z dimension. PostGIS supports the z
       and m dimensions.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_X.html">ST_X</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_Y.html">ST_Y</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_Z.html">ST_Z</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_Zmflag.html">ST_Zmflag</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/struct.Point.html#method.x">Point::x</a>,
   <a href="https://docs.rs/geo/0.18.0/geo/struct.Point.html#method.y">Point::y</a>,
   <a href="https://docs.rs/geo/0.18.0/geo/struct.Point.html#method.x_y">Point::x_y</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_x">Geom::get_x</a>,
    <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_y">Geom::get_y</a>,
    <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_z">Geom::get_z</a>
    </td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Get the boundaries of a polygon.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_ExteriorRing.html">ST_ExteriorRing</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_NumInteriorRings.html">ST_NumInteriorRings</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_InteriorRingN.html">ST_InteriorRingN</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/struct.Polygon.html#method.exterior">Polygon::exterior</a>
   (<a href="https://docs.rs/geo/0.18.0/geo/struct.Polygon.html#method.exterior_mut">Polygon::exterior_mut</a>),
   <a href="https://docs.rs/geo/0.18.0/geo/struct.Polygon.html#method.interiors">Polygon::interiors</a>
   (<a href="https://docs.rs/geo/0.18.0/geo/struct.Polygon.html#method.interiors_mut">Polygon::interiors_mut</a>)
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_exterior_ring">Geom::get_exterior_ring</a>,
    <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_num_interior_rings">Geom::get_num_interior_rings</a>,
    <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_interior_ring_n">Geom::get_interior_ring_n</a>
    </td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Get the winding order (clockwise / counter-clockwise) of the exterior ring of a polygon. geo provides a larger
       variety of associated functions.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_IsPolygonCW.html">ST_IsPolygonCW</a>,
       <a href="https://postgis.net/docs/manual-3.2/ST_IsPolygonCCW.html">ST_IsPolygonCCW</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/winding_order/trait.Winding.html">algorithm::winding_order::Winding</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/struct.CoordSeq.html#method.is_ccw">CoordSeq::is_ccw</a>
    </td>
 </tr>
</table>

## Geometry Processing

Geo provides 6 of 26 functions in this
[section of the _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#Geometry_Processing).
There are significant gaps in the feature set between _geo_ and _geos_ in this section.

Missing features include:

- [Buffering](https://postgis.net/docs/manual-3.2/ST_Buffer.html)
  (related: [offset curves](https://postgis.net/docs/manual-3.2/ST_OffsetCurve.html)).
  <span class="hl-available">Available in _geos_</span>.
- [Delaunay triangulation](https://postgis.net/docs/manual-3.2/ST_DelaunayTriangles.html).
  <span class="hl-available">Available in _geos_</span>.
- [Inscribed](https://postgis.net/docs/manual-3.2/ST_MaximumInscribedCircle.html) and
  [bounding circle](https://postgis.net/docs/manual-3.2/ST_MinimumBoundingCircle.html).
  <span class="hl-not-available">Not available in _geos_</span>.
- [Rotated bounding box](https://postgis.net/docs/manual-3.2/ST_OrientedEnvelope.html).
  <span class="hl-available">Available in _geos_</span>.
- Generation of points [on a surface](https://postgis.net/docs/manual-3.2/ST_PointOnSurface.html)
  or at [random](https://postgis.net/docs/manual-3.2/ST_GeneratePoints.html).
  <span class="hl-available">Available in _geos_</span>.
- Generation of [polygons](https://postgis.net/docs/manual-3.2/ST_Polygonize.html) or
  [lines](https://postgis.net/docs/manual-3.2/ST_Polygonize.html) formed by intersections of a collection.
  <span class="hl-available">Available in _geos_</span>.
- [Polygon simplification](https://postgis.net/docs/manual-3.2/ST_ChaikinSmoothing.html) using Chaikin’s method.
  <span class="hl-not-available">Not available in _geos_</span>.
- Generation of [Voronoi diagrams](https://postgis.net/docs/manual-3.2/ST_VoronoiPolygons.html).
  <span class="hl-available">Available in _geos_</span>.

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the geometric center of mass of a geometry.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Centroid.html">ST_Centroid</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/centroid/trait.Centroid.html">algorithm::centroid::Centroid</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.get_centroid">Geom::get_centroid</a>
    </td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute a
       <a href="http://www.bostongis.com/postgis_concavehull.snippet">potentially concave polygon bounding a geometry</a>.
       There is no formal definition of a concave hull and the results from PostGIS and geo may disagree.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_ConcaveHull.html">ST_ConcaveHull</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/concave_hull/trait.ConcaveHull.html">algorithm::concave_hull::ConcaveHull</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><span class="hl-not-available">Not available in _geos_</span></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the convex hull of a geometry. geo allows an additional, slower, algorithm that properly handles
       geometries with collinear points.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_ConvexHull.html">ST_ConvexHull</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/convex_hull/qhull/fn.quick_hull.html">algorithm::convex_hull::quick_hull</a>,
       <a href="https://docs.rs/geo/0.18.0/geo/algorithm/convex_hull/graham/fn.graham_hull.html">algorithm::convex_hull::graham_hull</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.convex_hull">Geom::convex_hull</a>
    </td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Simplify a geometry using <a href="https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm">Ramer-Douglas-Peuker (RDP) algorithm</a>.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Simplify.html">ST_Simplify</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/simplify/trait.Simplify.html">algorithm::simplify::Simplify</a>,
       <a href="https://docs.rs/geo/0.18.0/geo/algorithm/simplify/trait.SimplifyIdx.html">algorithm::simplify::SimplifyIdx</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/struct.Geometry.html#method.simplify">Geom::simplify</a>
    </td>
 </tr>
</table>


<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Simplify a geometry using the <a href="https://bost.ocks.org/mike/simplify/">Visvalingam–Whyatt (VW) algorithm</a>.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_SimplifyVW.html">ST_SimplifyVW</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/simplifyvw/trait.SimplifyVW.html">algorithm::simplifyvw::SimplifyVW</a>,
       <a href="https://docs.rs/geo/0.18.0/geo/algorithm/simplifyvw/trait.SimplifyVwIdx.html">algorithm::simplifyvw::SimplifyVwIdx</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><span class="hl-not-available">Not available in _geos_</span></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Simplify a geometry preserving topological relationships. PostGIS and geos use the RDP algorithm described above.
       geo uses the VW algorithm.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_SimplifyPreserveTopology.html">ST_SimplifyPreserveTopology</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/simplifyvw/trait.SimplifyVWPreserve.html">algorithm::simplifyvw::SimplifyVWPreserve</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/struct.Geometry.html#method.topology_preserve_simplify">Geom::topology_preserve_simplify</a>
    </td>
 </tr>
</table>


# Overlay Functions

This [section of the _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#Overlay_Functions)
documents functions that compute results arising from the overlay of two geometries. _geo_ only provides 1 of 10
functions in this section, with a significant feature gap between _geo_ and _geos_.

Missing features include:

- Several [CPU](https://postgis.net/docs/manual-3.2/ST_Union.html) or [memory](https://postgis.net/docs/manual-3.2/ST_MemUnion.html)
  efficient implementations of the union operation, and it’s converse. <span class="hl-available">Partially available in _geos_</span>.
- A [special case of union](https://postgis.net/docs/manual-3.2/ST_Node.html) used to dissolve collections of lines into a single line.
  <span class="hl-available">Available in _geos_</span>.
- [Difference](https://postgis.net/docs/manual-3.2/ST_Difference.html) and
  [symmetric difference](https://postgis.net/docs/manual-3.2/ST_SymDifference.html) of geometries.
  <span class="hl-available">Available in _geos_</span>.
- A [subdivision](https://postgis.net/docs/manual-3.2/ST_Subdivide.html) operation to speed up indexed queries on a
  large geometry.
  <span class="hl-not-available">Not available in _geos_</span>.

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the point-set intersection of two geometries. geo only provides a limited implementation for lines.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Intersection.html">ST_Intersection</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/line_intersection/enum.LineIntersection.html">algorithm::line_intersection::LineIntersection</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.intersection">Geom::intersection</a>
    </td>
 </tr>
</table>


## Topological Relationships

There are 16 functions in [this section of the _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#idm11890),
but most are special cases of the most general [ST_Relate](https://postgis.net/docs/manual-3.2/ST_Relate.html)
function that determines the [DE-9IM](https://en.wikipedia.org/wiki/DE-9IM) relationship matrix between two geometries.
_geo_ provides this general function. _libgeos_ also provides this function, but it is not exposed by _geos_.

For the more specific functions, _geos_ provides an optional preprocessing step that can speed up repeated relationship
queries against a large geometry. _geo_ does not provide a similar optimization.

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Determine if a geometry is contained completely inside another.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Contains.html">ST_Contains</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/contains/trait.Contains.html">algorithm::contains::Contains</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.contains">Geom::contains</a>
    </td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Determine if two geometries have any points in common.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Intersects.html">ST_Intersects</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/intersects/trait.Intersects.html">algorithm::intersects::Intersects</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.intersects">Geom::intersects</a>
    </td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Evaluate the DE-9IM relationship matrix between two geometries. Although geos does not provide this function, it
       provides many more methods like the two above to check specific relationships between geometries.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Relate.html">ST_Relate</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/relate/trait.Relate.html">algorithm::relate::Relate</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><span class="hl-not-available">Not available in _geos_</span></td>
 </tr>
</table>


## Affine Transformations

There are 8 functions in [this section of the _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#Affine_Transformation),
but all of them are specific cases of the most general [ST_Affine](https://postgis.net/docs/manual-3.2/ST_Affine.html) function.
_geo_ provides 2 functions that cover all transformations except scaling. _geos_ does not support any features in this
section directly. In either case, this feature set can be implemented using mutable iterators on points in the geometry.

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Rotate a geometry about a point. geo also provides a convenience method to rotate about the centroid of the
       geometry.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Rotate.html">ST_Rotate</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/rotate/trait.RotatePoint.html">algorithm::rotate::RotatePoint</a>,
       <a href="https://docs.rs/geo/0.18.0/geo/algorithm/rotate/trait.Rotate.html">algorithm::rotate::Rotate</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><span class="hl-not-available">Not available in _geos_</span></td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Translate a geometry.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_Translate.html">ST_Translate</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/translate/trait.Translate.html">algorithm::translate::Translate</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><span class="hl-not-available">Not available in _geos_</span></td>
 </tr>
</table>


## Linear Referencing

_geo_ provides 2 of 10 functions in [this section of the _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#Linear_Referencing).
Of the remaining, 6 are not applicable to _geo_ because they are related to 3D or 4D geometries, and others are
convenience methods easily implemented using the 2 available functions.

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Find a point on a line at a distance a given fraction of the length from the start.<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_LineInterpolatePoint.html">ST_LineInterpolatePoint</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/line_interpolate_point/trait.LineInterpolatePoint.html">
        algorithm::line_interpolate_point::LineInterpolatePoint</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.interpolate">Geom::interpolate</a>,
        <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.interpolate_normalized">Geom::interpolate_normalized</a>
    </td>
 </tr>
</table>

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Find the point on a line closest to a given point (potentially off the line).<br/>
       <a href="https://postgis.net/docs/manual-3.2/ST_LineLocatePoint.html">ST_LineLocatePoint</a>
   </td>
 </tr>
 <tr>
   <th>geo</th>
   <td><a href="https://docs.rs/geo/0.18.0/geo/algorithm/line_locate_point/trait.LineLocatePoint.html">
        algorithm::line_locate_point::LineLocatePoint</a>
   </td>
 </tr>
 <tr>
   <th>geos</th>
    <td><a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.project">Geom::project</a>,
        <a href="https://docs.rs/geos/8.0.3/geos/trait.Geom.html#tymethod.project_normalized">Geom::project_normalized</a>
    </td>
 </tr>
</table>


## Missing classes of features

There are several sections of features in the _PostGIS_ reference not available in _geo_ at all:

- [Geometry Editors](https://postgis.net/docs/manual-3.2/reference.html#Geometry_Editors) provide methods to mutate
  geometries. These can be implemented using mutable references to the coordinates in the geometry.
  <span class="hl-not-available">Not available in _geos_</span>.
- [Bounding Box Operators](https://postgis.net/docs/manual-3.2/reference.html#operators-bbox) and
  [Distance Operators](https://postgis.net/docs/manual-3.2/reference.html#operators-distance) provide syntactic sugar
  for an algebra using available methods to relate geometries.
  <span class="hl-not-available">Not available in _geos_</span>.
- [Clustering Functions](https://postgis.net/docs/manual-3.2/reference.html#Clustering_Functions) include widely used
  algorithms for clustering of geometries using distance metrics. I would expect a separate crate to provide
  higher-order features like clustering, built using the foundational features available in _geo_ or _geos_.
  <span class="hl-not-available">Not available in _geos_</span>.

Some other features from _PostGIS_ that are not applicable to _geo_ include
[computation of trends in the measure dimension](https://postgis.net/docs/manual-3.2/reference.html#Temporal),
[specification of a spatial reference system](https://postgis.net/docs/manual-3.2/reference.html#SRS_Functions) and
[specific functions exported from CGAL](https://postgis.net/docs/manual-3.2/reference.html#reference_sfcgal).


## Beyond PostGIS

Conversely, _geo_ provides some features beyond those documented in the _PostGIS_ reference.

- Geodetic computations.
  - Computation of area of a geometry using an
    [algorithm due to Chamberlain Duquette](https://docs.rs/geo/0.18.0/geo/algorithm/chamberlain_duquette_area/trait.ChamberlainDuquetteArea.html).
    Both _PostGIS_ and _geos_ project the geometry into planar coordinates for area computations.
    <span class="hl-not-available">Not available in _geos_</span>.
  - Computation of points on a great-arc of a
    [sphere](https://docs.rs/geo/0.18.0/geo/algorithm/geodesic_intermediate/trait.GeodesicIntermediate.html) or
    [spheroid](https://docs.rs/geo/0.18.0/geo/algorithm/haversine_intermediate/trait.HaversineIntermediate.html).
    These computations can be implemented in _PostGIS_ using [ST_Length](https://postgis.net/docs/manual-3.2/ST_Length.html).
    <span class="hl-not-available">Not available in _geos_</span>.
- A [trait](https://docs.rs/geo/0.18.0/geo/algorithm/kernels/trait.Kernel.html) to enable robust geometric calculations
  based on [CGAL-style computational kernels](https://www.cgal.org/exact.html).
  <span class="hl-not-available">Not available in _geos_</span>.


# Conclusion

I hope that my systematic comparison of the features in _geo_ and _geos_ will help you make an informed choice between
the two alternatives as you start building your geospatial application in Rust. I invite you to also benefit from the
original reason for this comparison – to inspire my contributions to the _geo_ crate!