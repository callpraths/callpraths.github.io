---
layout: post
title:  "Performance comparison of four simple geospatial algorithms"
date:   2022-02-01 00:00:00 +0000
categories: geoscience
style: geo-perf-comparison
---

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