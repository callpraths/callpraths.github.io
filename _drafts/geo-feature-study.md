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
       <a href= "https://postgis.net/docs/manual-3.2/reference.html#operators-distance">operator syntax</a> based on this function.<br/>
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
       <a href="https://docs.rs/geo/0.18.0/geo/algorithm/geodesic_distance/trait.GeodesicDistance.html">algorithm::geodesic_distance::GeodesicDistance</a> (Improvement over Vincenty's method)</td>
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
       (Improvement over Vincenty's method)</td>
 </tr>
 <tr>
   <th>geos</th>
    <td><span class="hl-not-available">Not available</span></td>
 </tr>
</table>


## Geometry Accessors

_geo_ effectively provides 15 of the 42 functions in this
[section of the _PostGIS_ reference](https://postgis.net/docs/manual-3.2/reference.html#Geometry_Accessors) . While
there is a large gap in the feature set in this section, many of the missing functions have easy and idiomatic
implementations using available accessors and iterators. Also, some of the functions are not applicable to _geo_ because
of limitations of the types of geometries supported.

Missing features includes:

- Functions related to 3D and 4D geometries. The extra coordinates are used to specify the height (z) and/or a
  measure (m) at the given point. These are not applicable to _geo_ as _geo_ only supports 2D geometries. _geos_
  supports 3D geometries (with a z-dimension) but has no notion of a measure.
- Functions related to curves (with non-linear interpolation between points) and surfaces (3D non-linear surfaces).
  These are not applicable to _geo_ and _geos_ as neither library implements non-linear geometries.
- A method to obtain the amount of memory consumed by a geometry. Not available in _geo_ and _geos_.

Beyond these, _PostGIS_ provides some convenience functions that are easy to implement using those available in _geo_
and _geos_.

<table class="one-comparison">
 <tr>
   <th>description</th>
   <td>Compute the bounding rectangle for a geometry.
       Additionally, PostGIS has an
       <a href="https://postgis.net/docs/manual-3.2/reference.html#operators-bbox">algebra</a> relating the bounding
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
   <td>Compute the dimensionality of a geometry. Only geo correctly handles collinear points.<br/>
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
   <td>Access specific points on a line or multi-line<br/>
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