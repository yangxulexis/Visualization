﻿"use strict";
(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["d3", "../common/SVGWidget", "../common/Palette", "../api/IGraph", "./Vertex", "./Edge", "./GraphData", "./GraphLayouts", "../common/Utility", "css!./Graph"], factory);
    } else {
        root.graph_Graph = factory(root.d3, root.common_SVGWidget, root.common_Palette, root.api_IGraph, root.graph_Vertex, root.graph_Edge, root.graph_GraphData, root.graph_GraphLayouts, root.common_Utility);
    }
}(this, function (d3, SVGWidget, Palette, IGraph, Vertex, Edge, GraphData, GraphLayouts, Utility) {
    function Graph() {
        SVGWidget.call(this);
        IGraph.call(this);

        this.graphData = new GraphData();
        this.highlight = {
            zoom: 1.1,
            opacity: 0.33,
            edge: "1.25px"
        };
        this._selection = new Utility.Selection();
    }
    Graph.prototype = Object.create(SVGWidget.prototype);
    Graph.prototype.constructor = Graph;
    Graph.prototype._class += " graph_Graph";
    Graph.prototype.implements(IGraph.prototype);
    
    Graph.prototype.Vertex = Vertex;
    Graph.prototype.Edge = Edge;

    Graph.prototype.publish("allowDragging", true, "boolean", "Allow Dragging of Vertices", null, { tags: ["Advanced"] });
    Graph.prototype.publish("layout", "Circle", "set", "Default Layout", ["Circle", "ForceDirected", "ForceDirected2", "Hierarchy", "None"], { tags: ["Basic"] });
    Graph.prototype.publish("scale", "100%", "set", "Zoom Level", ["all", "width", "selection", "100%", "90%", "75%", "50%", "25%", "10%"], { tags: ["Basic"] });
    Graph.prototype.publish("applyScaleOnLayout", false, "boolean", "Shrink to fit on Layout", null, { tags: ["Basic"] });
    Graph.prototype.publish("highlightOnMouseOverVertex", false, "boolean", "Highlight Vertex on Mouse Over", null, { tags: ["Basic"] });
    Graph.prototype.publish("highlightOnMouseOverEdge", false, "boolean", "Highlight Edge on Mouse Over", null, { tags: ["Basic"] });
    Graph.prototype.publish("transitionDuration", 250, "number", "Transition Duration", null, { tags: ["Intermediate"] });
    Graph.prototype.publish("showEdges", true, "boolean", "Show Edges", null, { tags: ["Intermediate"] });
    Graph.prototype.publish("snapToGrid", 0, "number", "Snap to Grid", null, { tags: ["Private"] });

    Graph.prototype.publish("hierarchyRankDirection", "TB", "set", "Direction for Rank Nodes", ["TB", "BT", "LR", "RL"], { tags: ["Advanced"] });
    Graph.prototype.publish("hierarchyNodeSeparation", 50, "number", "Number of pixels that separate nodes horizontally in the layout", null, { tags: ["Advanced"] });
    Graph.prototype.publish("hierarchyEdgeSeparation", 10, "number", "Number of pixels that separate edges horizontally in the layout", null, { tags: ["Advanced"] });
    Graph.prototype.publish("hierarchyRankSeparation", 50, "number", "Number of pixels between each rank in the layout", null, { tags: ["Advanced"] });

    Graph.prototype.publish("forceDirectedLinkDistance", 300, "number", "Target distance between linked nodes", null, { tags: ["Advanced"] });
    Graph.prototype.publish("forceDirectedLinkStrength", 1, "number", "Strength (rigidity) of links", null, { tags: ["Advanced"] });
    Graph.prototype.publish("forceDirectedFriction", 0.9, "number", "Friction coefficient", null, { tags: ["Advanced"] });
    Graph.prototype.publish("forceDirectedCharge", -25, "number", "Charge strength ", null, { tags: ["Advanced"] });
    Graph.prototype.publish("forceDirectedChargeDistance", 10000, "number", "Maximum distance over which charge forces are applied", null, { tags: ["Advanced"] });
    Graph.prototype.publish("forceDirectedTheta", 0.8, "number", "Barnes–Hut approximation criterion", null, { tags: ["Advanced"] });
    Graph.prototype.publish("forceDirectedGravity", 0.1, "number", "Gravitational strength", null, { tags: ["Advanced"] });

    //  Properties  ---
    Graph.prototype.getOffsetPos = function () {
        return { x: 0, y: 0 };
    };

    Graph.prototype.size = function (_) {
        var retVal = SVGWidget.prototype.size.apply(this, arguments);
        if (arguments.length && this._svgZoom) {
            this._svgZoom
                .attr("x", -this._size.width / 2)
                .attr("y", -this._size.height / 2)
                .attr("width", this._size.width)
                .attr("height", this._size.height)
            ;
        }
        return retVal;
    };

    Graph.prototype.clear = function () {
        this.data({ vertices: [], edges: [], hierarchy: [], merge: false });
    };

    Graph.prototype.data = function (_) {
        var retVal = SVGWidget.prototype.data.apply(this, arguments);
        if (arguments.length) {
            if (!this.data().merge) {
                this.graphData = new GraphData();
                this._renderCount = 0;
            }
            var data = this.graphData.setData(this.data().vertices || [], this.data().edges || [], this.data().hierarchy || [], this.data().merge || false);

            var context = this;
            data.addedVertices.forEach(function (item) {
                item.pos({
                    x: +Math.random() * 10 / 2 - 5,
                    y: +Math.random() * 10 / 2 - 5
                });
            });
            data.addedEdges.forEach(function (item) {
                item._graphID = context._id;
            });

            //  Recalculate edge arcs  ---
            var dupMap = {};
            this.graphData.edgeValues().forEach(function (item) {
                if (!dupMap[item._sourceVertex._id]) {
                    dupMap[item._sourceVertex._id] = {};
                }
                if (!dupMap[item._sourceVertex._id][item._targetVertex._id]) {
                    dupMap[item._sourceVertex._id][item._targetVertex._id] = 0;
                }
                var dupEdgeCount = ++dupMap[item._sourceVertex._id][item._targetVertex._id];
                item.arcDepth(16 * dupEdgeCount);
            });
        }
        return retVal;
    };

    Graph.prototype.selection = function (_) {
        if (!arguments.length) return this._selection.get();
        this._selection.set(_);
        return this;
    };

    Graph.prototype.setZoom = function (translation, scale, transitionDuration) {
        if (this.zoom) {
            this.zoom.translate(translation);
            this.zoom.scale(scale);
            this.applyZoom(transitionDuration);
        }
    };

    Graph.prototype.applyZoom = function (transitionDuration) {
        if (d3.event && d3.event.sourceEvent && d3.event.sourceEvent.ctrlKey && (d3.event.sourceEvent.type === "wheel" || d3.event.sourceEvent.type === "mousewheel" || d3.event.sourceEvent.type === "DOMMouseScroll")) {
            if (d3.event.sourceEvent.wheelDelta) {
                this.zoom.translate([this.prevTranslate[0], this.prevTranslate[1] + d3.event.sourceEvent.wheelDelta]);
                this.zoom.scale(this.prevScale);
            }
        }
        (transitionDuration ? this.svg.transition().duration(transitionDuration) : this.svg)
            .attr("transform", "translate(" + this.zoom.translate() + ")scale(" + this.zoom.scale() + ")")
        ;
        this.prevTranslate = this.zoom.translate();
        if (this.prevScale !== this.zoom.scale()) {
            this._fixIEMarkers();
            this.prevScale = this.zoom.scale();
        }
        this.brush.x(d3.scale.identity().domain([(-this.prevTranslate[0] - this._size.width / 2) * 1 / this.zoom.scale(), (-this.prevTranslate[0] + this._size.width / 2) * 1 / this.zoom.scale()]));
        this.brush.y(d3.scale.identity().domain([(-this.prevTranslate[1] - this._size.height / 2) * 1 / this.zoom.scale(), (-this.prevTranslate[1] + this._size.height / 2) * 1 / this.zoom.scale()]));
    };

    Graph.prototype.enter = function (domNode, element) {
        SVGWidget.prototype.enter.apply(this, arguments);
        var context = this;

        //  Zoom  ---
        this.prevTranslate = [0, 0];
        this.prevScale = 1;
        this.zoom = d3.behavior.zoom()
            .scaleExtent([0.01, 4])
            .on("zoomstart", function (args) {
                context.prevTranslate = context.zoom.translate();
                context.prevScale = context.zoom.scale();
                if (d3.event.sourceEvent && d3.event.sourceEvent.shiftKey && d3.event.sourceEvent.ctrlKey) {
                    context._zoomMode = "selection";
                } else if (d3.event.sourceEvent && d3.event.sourceEvent.shiftKey) {
                    context._zoomMode = "selection";
                    context._selection.clear();
                } else {
                    context._zoomMode = "zoom";
                }
                switch (context._zoomMode) {
                    case "selection":
                        element.select(".extent")
                            .style("visibility", null)
                        ;
                        break;
                    default:
                        element.select(".extent")
                            .style("visibility", "hidden")
                        ;
                        break;
                }
            })
            .on("zoomend", function (args) {
                switch (context._zoomMode) {
                    case "selection":
                        context.zoom.translate(context.prevTranslate);
                        context.zoom.scale(context.prevScale);
                        break;
                    default:
                        break;
                }
                context._svgBrush.call(context.brush.clear());
            })
            .on("zoom", function (d) {
                switch (context._zoomMode) {
                    case "selection":
                        break;
                    default:
                        context.applyZoom();
                        break;
                }
            })
        ;
        this.brush = d3.svg.brush()
            .x(d3.scale.identity().domain([-context._size.width / 2, context._size.width / 2]))
            .y(d3.scale.identity().domain([-context._size.height / 2, context._size.height / 2]))
            .on("brushstart", function (args) {
                switch (context._zoomMode) {
                    case "selection":
                        break;
                    default:
                        break;
                }
            })
            .on("brushend", function (args) {
                switch (context._zoomMode) {
                    case "selection":
                        var extent = d3.event.target.extent();
                        context.svgV.selectAll(".graphVertex").select("*")
                            .each(function (d) {
                                if (extent[0][0] <= d.x() && d.x() < extent[1][0] && extent[0][1] <= d.y() && d.y() < extent[1][1]) {
                                    context._selection.append(d);
                                }
                            })
                        ;
                        context.graph_selection(context.selection());
                        break;
                    default:
                        break;
                }
            })
            .on("brush", function () {
                switch (context._zoomMode) {
                    case "selection":
                        var zt = context.zoom.translate();
                        console.log(zt[0]);
                        var extent = d3.event.target.extent();
                        context.svgV.selectAll(".graphVertex").select("*")
                            .classed("selected", function (d) {
                                return context._selection.isSelected(d) ||
                                    (extent[0][0] <= d.x() && d.x() < extent[1][0] && extent[0][1] <= d.y() && d.y() < extent[1][1]);
                            })
                        ;
                        break;
                    default:
                        break;
                }
            })
        ;

        //  Drag  ---
        function dragstart(d) {
            if (context.allowDragging()) {
                d3.event.sourceEvent.stopPropagation();
                context._dragging = true;
                if (context.forceLayout) {
                    var forceNode = context.forceLayout.vertexMap[d.id()];
                    forceNode.fixed = true;
                }
                if (context.svgMarkerGlitch) {
                    context.graphData.nodeEdges(d.id()).forEach(function (id) {
                        var edge = context.graphData.edge(id);
                        context._pushMarkers(edge.element(), edge);
                    });
                }
            }
        }
        function drag(d) {
            if (context.allowDragging()) {
                d3.event.sourceEvent.stopPropagation();
                d.move({ x: d3.event.x, y: d3.event.y });
                if (context.forceLayout) {
                    var forceNode = context.forceLayout.vertexMap[d.id()];
                    forceNode.fixed = true;
                    forceNode.x = forceNode.px = d3.event.x;
                    forceNode.y = forceNode.py = d3.event.y;
                }
                context.refreshIncidentEdges(d, true);
            }
        }
        function dragend(d) {
            if (context.allowDragging()) {
                d3.event.sourceEvent.stopPropagation();
                context._dragging = false;
                if (context.snapToGrid()) {
                    var snapLoc = d.calcSnap(context.snapToGrid());
                    d.move(snapLoc[0]);
                    context.refreshIncidentEdges(d, true);
                }
                if (context.forceLayout) {
                    var forceNode = context.forceLayout.vertexMap[d.id()];
                    forceNode.fixed = false;
                }
                if (context.svgMarkerGlitch) {
                    context.graphData.nodeEdges(d.id()).forEach(function (id) {
                        var edge = context.graphData.edge(id);
                        context._popMarkers(edge.element(), edge);
                    });
                }
            }
        }
        this.drag = d3.behavior.drag()
            .origin(function (d) {
                return d.pos();
            })
            .on("dragstart", dragstart)
            .on("dragend", dragend)
            .on("drag", drag)
        ;
        //  SVG  ---
        this._svgZoom = element.append("rect")
            .attr("class", "zoom")
            .attr("x", -this._size.width / 2)
            .attr("y", -this._size.height / 2)
            .attr("width", this._size.width)
            .attr("height", this._size.height)
        ;

        this.defs = element.append("defs");
        this.addMarkers();

        element.call(this.zoom);

        this.svg = element.append("g");
        this._svgBrush = this.svg.append("g").attr("class", "selectionBrush").call(this.brush);
        this._svgBrush.select(".background").style("cursor", null);
        context._svgBrush.call(context.brush.clear());
        this.svgC = this.svg.append("g").attr("id", this._id + "C");
        this.svgE = this.svg.append("g").attr("id", this._id + "E");
        this.svgV = this.svg.append("g").attr("id", this._id + "V");
    };

    Graph.prototype.getBounds = function (items, layoutEngine) {
        var vBounds = [[null, null], [null, null]];
        items.forEach(function (item) {
            var pos = layoutEngine ? layoutEngine.nodePos(item._id) : {x: item.x(), y: item.y(), width: item.width(), height: item.height()};
            var leftX = pos.x - pos.width / 2;
            var rightX = pos.x + pos.width / 2;
            var topY = pos.y - pos.height / 2;
            var bottomY = pos.y + pos.height / 2;
            if (vBounds[0][0] === null || vBounds[0][0] > leftX) {
                vBounds[0][0] = leftX;
            }
            if (vBounds[0][1] === null || vBounds[0][1] > topY) {
                vBounds[0][1] = topY;
            }
            if (vBounds[1][0] === null || vBounds[1][0] < rightX) {
                vBounds[1][0] = rightX;
            }
            if (vBounds[1][1] === null || vBounds[1][1] < bottomY) {
                vBounds[1][1] = bottomY;
            }
        });
        return vBounds;
    };

    Graph.prototype.getVertexBounds = function (layoutEngine) {
        return this.getBounds(this.graphData.nodeValues(), layoutEngine);
    };

    Graph.prototype.getSelectionBounds = function (layoutEngine) {
        return this.getBounds(this._selection.get(), layoutEngine);
    };

    Graph.prototype.shrinkToFit = function (bounds, transitionDuration) {
        var width = this.width();
        var height = this.height();

        var dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2,
            scale = 1.0 / Math.max(dx / width, dy / height);
        if (scale > 1) {
            scale = 1;
        }
        var translate = [-scale * x, -scale * y];
        this.setZoom(translate, scale, transitionDuration);
    };

    Graph.prototype._origScale = Graph.prototype.scale;
    Graph.prototype.scale = function (_, transitionDuration) {
        var retVal = Graph.prototype._origScale.apply(this, arguments);
        if (arguments.length) {
            this.zoomTo(_, transitionDuration);
        }
        return retVal;
    };

    Graph.prototype.zoomTo = function (level, transitionDuration) {
        switch (level) {
            case "all":
                this.shrinkToFit(this.getVertexBounds(), transitionDuration);
                break;
            case "width":
                var bounds = this.getVertexBounds();
                bounds[0][1] = 0;
                bounds[1][1] = 0;
                this.shrinkToFit(bounds, transitionDuration);
                break;
            case "selection":
                this.shrinkToFit(this._selection.isEmpty() ? this.getVertexBounds() : this.getSelectionBounds(), transitionDuration);
                break;
            default:
                var scale = parseInt(level);
                if (isNaN(scale) || scale <= 0 || scale > 200) {
                    scale = 100;
                }
                this.zoom.scale(scale / 100);
                this.applyZoom(transitionDuration);
                break;
        }
    };

    Graph.prototype.centerOn = function (bounds, transitionDuration) {
        var x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2;
        var translate = [x, y];
        this.setZoom(translate, 1, transitionDuration);
    };

    Graph.prototype._origLayout = Graph.prototype.layout;
    Graph.prototype.layout = function (_, transitionDuration) {
        var retVal = Graph.prototype._origLayout.apply(this, arguments);
        if (arguments.length) {
            if (this._renderCount) {
                if (this.forceLayout) {
                    this.forceLayout.force.stop();
                    this.forceLayout = null;
                }

                var context = this;
                var layoutEngine = this.getLayoutEngine();
                if (this.layout() === "ForceDirected2") {
                    this.forceLayout = layoutEngine;
                    this.forceLayout.force.on("tick", function (d) {
                        layoutEngine.vertices.forEach(function (item) {
                            var vertex = context.graphData.node(item.id);
                            if (item.fixed) {
                                item.x = item.px;
                                item.y = item.py;
                            } else {
                                item.px = item.x;
                                item.py = item.y;
                                vertex
                                    .move({ x: item.x, y: item.y })
                                ;
                            }
                        });
                        context.graphData.edgeValues().forEach(function (item) {
                            item
                                .points([], false, false)
                            ;
                        });
                        if (context.applyScaleOnLayout()) {
                            var vBounds = context.getVertexBounds(layoutEngine);
                            context.shrinkToFit(vBounds);
                        }
                    });
                    this.forceLayout.force.start();
                } else if (layoutEngine) {
                    this.forceLayout = null;
                    context._dragging = true;
                    context.graphData.nodeValues().forEach(function (item) {
                        var pos = layoutEngine.nodePos(item._id);
                        item.move({ x: pos.x, y: pos.y }, transitionDuration);
                        if (pos.width && pos.height && !item.width() && !item.height()) {
                            item
                                .width(pos.width)
                                .height(pos.height)
                                .render()
                            ;
                        }
                    });
                    context.graphData.edgeValues().forEach(function (item) {
                        var points = layoutEngine.edgePoints(item);
                        item
                            .points(points, transitionDuration)
                        ;
                    });

                    if (context.applyScaleOnLayout()) {
                        var vBounds = context.getVertexBounds(layoutEngine);
                        context.shrinkToFit(vBounds, transitionDuration);
                    }
                    this._fixIEMarkers();
                    setTimeout(function () {
                        context._dragging = false;
                    }, transitionDuration ? transitionDuration + 50 : 50);  //  Prevents highlighting during morph  ---
                }
            }
        }
        return retVal;
    };

    //  Render  ---
    Graph.prototype.update = function (domNode, element) {
        SVGWidget.prototype.update.apply(this, arguments);
        var context = this;

        //  Create  ---
        var vertexElements = this.svgV.selectAll("#" + this._id + "V > .graphVertex").data(this.graphData.nodeValues(), function (d) { return d.id(); });
        vertexElements.enter().append("g")
            .attr("class", "graphVertex")
            .style("opacity", 1e-6)
             //  TODO:  Events need to be optional  ---
            .on("click.selectionBag", function (d) {
                context._selection.click(d, d3.event);
            })
            .on("click", function (d) {
                var vertexElement = d3.select(this).select(".graph_Vertex");
                var selected = false;
                if (!vertexElement.empty()) {
                    selected = vertexElement.classed("selected");
                }
                context.vertex_click(context.rowToObj(d.data()), "", selected, {
                    vertex:  d
                });
            })
            .on("dblclick", function (d) {
                var vertexElement = d3.select(this).select(".graph_Vertex");
                var selected = false;
                if (!vertexElement.empty()) {
                    selected = vertexElement.classed("selected");
                }
                context.vertex_dblclick(context.rowToObj(d.data()), "", selected, {
                    vertex:  d
                });
            })
            .on("mouseover", function (d) {
                if (context._dragging)
                    return;
                context.vertex_mouseover(d3.select(this), d);
            })
            .on("mouseout", function (d) {
                if (context._dragging)
                    return;
                context.vertex_mouseout(d3.select(this), d);
            })
            .each(createV)
            .transition()
            .duration(750)
            .style("opacity", 1)
        ;
        function createV(d) {
            d
                .target(this)
                .render()
            ;
            d.element()
                .call(context.drag)
            ;
            if (d.dispatch) {
                d.dispatch.on("sizestart", function (d, loc) {
                    d.allowResize(context.allowDragging());
                    if (context.allowDragging()) {
                        context._dragging = true;
                    }
                });
                d.dispatch.on("size", function (d, loc) {
                    context.refreshIncidentEdges(d, false);
                });
                d.dispatch.on("sizeend", function (d, loc) {
                    context._dragging = false;
                    if (context.snapToGrid()) {
                        var snapLoc = d.calcSnap(context.snapToGrid());
                        d
                            .pos(snapLoc[0])
                            .size(snapLoc[1])
                            .render()
                        ;
                        context.refreshIncidentEdges(d, false);
                    }
                });
            }
        }

        var edgeElements = this.svgE.selectAll("#" + this._id + "E > .graphEdge").data(this.showEdges() ? this.graphData.edgeValues() : [], function (d) { return d.id(); });
        edgeElements.enter().append("g")
            .attr("class", "graphEdge")
            .style("opacity", 1e-6)
            .on("click.selectionBag", function (d) {
                context._selection.click(d, d3.event);
            })
            .on("click", function (d) {
                var edgeElement = d3.select(this).select(".graph_Edge");
                var selected = false;
                if (!edgeElement.empty()) {
                    selected = edgeElement.classed("selected");
                }
                context.edge_click(context.rowToObj(d.data()), "", selected, {
                    edge: d
                });
            })
            .on("mouseover", function (d) {
                if (context._dragging)
                    return;
                context.edge_mouseover(d3.select(this), d);
            })
            .on("mouseout", function (d) {
                if (context._dragging)
                    return;
                context.edge_mouseout(d3.select(this), d);
            })
            .each(createE)
            .transition()
            .duration(750)
            .style("opacity", 1)
        ;
        function createE(d) {
            d
                .target(this)
                .render()
            ;
        }

        //  Update  ---
        vertexElements
            .each(updateV)
        ;
        function updateV(d) {
            d
                .render()
            ;
        }

        edgeElements
            .each(updateE)
        ;
        function updateE(d) {
            d
                .render()
            ;
        }

        //  Exit  ---
        vertexElements.exit()
            .each(function (d) { d.target(null); })
            .remove()
        ;
        edgeElements.exit()
            .each(function (d) { d.target(null); })
            .remove()
        ;

        if (!this._renderCount) {
            this._renderCount++;
            this.setZoom([0, 0], 1);
            this.layout(this.layout());
        }
    };

    //  Methods  ---
    Graph.prototype.getLayoutEngine = function () {
        switch (this.layout()) {
            case "Circle":
                return new GraphLayouts.Circle(this.graphData, this._size.width, this._size.height);
            case "ForceDirected":
                return new GraphLayouts.ForceDirected(this.graphData, this._size.width, this._size.height, {
                    oneShot: true,
                    linkDistance: this.forceDirectedLinkDistance(),
                    linkStrength: this.forceDirectedLinkStrength(),
                    friction: this.forceDirectedFriction(),
                    charge: this.forceDirectedCharge(),
                    chargeDistance: this.forceDirectedChargeDistance(),
                    theta: this.forceDirectedTheta(),
                    gravity: this.forceDirectedGravity()
                });
            case "ForceDirected2":
                return new GraphLayouts.ForceDirected(this.graphData, this._size.width, this._size.height, {
                    linkDistance: this.forceDirectedLinkDistance(),
                    linkStrength: this.forceDirectedLinkStrength(),
                    friction: this.forceDirectedFriction(),
                    charge: this.forceDirectedCharge(),
                    chargeDistance: this.forceDirectedChargeDistance(),
                    theta: this.forceDirectedTheta(),
                    gravity: this.forceDirectedGravity()
                });
            case "Hierarchy":
                return new GraphLayouts.Hierarchy(this.graphData, this._size.width, this._size.height, {
                    rankdir: this.hierarchyRankDirection(),
                    nodesep: this.hierarchyNodeSeparation(),
                    edgesep: this.hierarchyEdgeSeparation(),
                    ranksep: this.hierarchyRankSeparation()
                });
        }
        return null;//new GraphLayouts.None(this.graphData, this._size.width, this._size.height);
    };

    Graph.prototype.getNeighborMap = function (vertex) {
        var vertices = {};
        var edges = {};

        if (vertex) {
            var nedges = this.graphData.nodeEdges(vertex.id());
            for (var i = 0; i < nedges.length; ++i) {
                var edge = this.graphData.edge(nedges[i]);
                edges[edge.id()] = edge;
                if (edge._sourceVertex.id() !== vertex.id()) {
                    vertices[edge._sourceVertex.id()] = edge._sourceVertex;
                }
                if (edge._targetVertex.id() !== vertex.id()) {
                    vertices[edge._targetVertex.id()] = edge._targetVertex;
                }
            }
        }

        return {
            vertices: vertices,
            edges: edges
        };
    };

    Graph.prototype.highlightVerticies = function (vertexMap) {
        var context = this;
        var vertexElements = this.svgV.selectAll(".graphVertex");
        vertexElements
            .classed("graphVertex-highlighted", function (d) { return !vertexMap || vertexMap[d.id()]; })
            .transition().duration(this.transitionDuration())
            .each("end", function (d) {
                if (vertexMap && vertexMap[d.id()]) {
                    if (d._parentElement.node() && d._parentElement.node().parentNode) {
                        d._parentElement.node().parentNode.appendChild(d._parentElement.node());
                    }
                }
            })
            .style("opacity", function (d) {
                if (!vertexMap || vertexMap[d.id()]) {
                    return 1;
                }
                return context.highlight.opacity;
            })
        ;
        return this;
    };

    Graph.prototype.highlightEdges = function (edgeMap) {
        var context = this;
        var edgeElements = this.svgE.selectAll(".graphEdge");
        edgeElements
            .classed("graphEdge-highlighted", function (d) { return !edgeMap || edgeMap[d.id()]; })
            .style("stroke-width", function (o) {
                if (edgeMap && edgeMap[o.id()]) {
                    return context.highlight.edge;
                }
                return "1px";
            }).transition().duration(this.transitionDuration())
            .style("opacity", function (o) {
                if (!edgeMap || edgeMap[o.id()]) {
                    return 1;
                }
                return context.highlight.opacity;
            })
        ;
        return this;
    };

    Graph.prototype.highlightVertex = function (element, d) {
        if (this.highlightOnMouseOverVertex()) {
            if (d) {
                var highlight = this.getNeighborMap(d);
                highlight.vertices[d.id()] = d;
                this.highlightVerticies(highlight.vertices);
                this.highlightEdges(highlight.edges);
            } else {
                this.highlightVerticies(null);
                this.highlightEdges(null);
            }
        }
    };

    Graph.prototype.highlightEdge = function (element, d) {
        if (this.highlightOnMouseOverEdge()) {
            if (d) {
                var vertices = {};
                vertices[d._sourceVertex.id()] = d._sourceVertex;
                vertices[d._targetVertex.id()] = d._targetVertex;
                var edges = {};
                edges[d.id()] = d;
                this.highlightVerticies(vertices);
                this.highlightEdges(edges);
            } else {
                this.highlightVerticies(null);
                this.highlightEdges(null);
            }
        }
    };

    Graph.prototype.refreshIncidentEdges = function (d, skipPushMarkers) {
        var context = this;
        this.graphData.nodeEdges(d.id()).forEach(function (id) {
            var edge = context.graphData.edge(id);
            edge
                .points([], false, skipPushMarkers)
            ;
        });
    };

    //  Events  ---
    Graph.prototype.graph_selection = function (selection) {
    };

    Graph.prototype.vertex_click = function (row, col, sel, more) {
        if (more && more.vertex) {
            more.vertex._parentElement.node().parentNode.appendChild(more.vertex._parentElement.node());
        }
        IGraph.prototype.vertex_click.apply(this, arguments);
    };

    Graph.prototype.vertex_dblclick = function (d) {
    };

    Graph.prototype.vertex_mouseover = function (element, d) {
        this.highlightVertex(element, d);
    };

    Graph.prototype.vertex_mouseout = function (d, self) {
        this.highlightVertex(null, null);
    };

    Graph.prototype.edge_mouseover = function (element, d) {
        this.highlightEdge(element, d);
    };

    Graph.prototype.edge_mouseout = function (d, self) {
        this.highlightEdge(null, null);
    };

    Graph.prototype.addMarkers = function (clearFirst) {
        if (clearFirst) {
            this.defs.select("#" + this._id + "_arrowHead").remove();
            this.defs.select("#" + this._id + "_circleFoot").remove();
            this.defs.select("#" + this._id + "_circleHead").remove();
        }
        this.defs.append("marker")
            .attr("class", "marker")
            .attr("id", this._id + "_arrowHead")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 10)
            .attr("refY", 5)
            .attr("markerWidth", 8)
            .attr("markerHeight", 8)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .append("polyline")
                .attr("points", "0,0 10,5 0,10 1,5")
        ;
        this.defs.append("marker")
            .attr("class", "marker")
            .attr("id",  this._id + "_circleFoot")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 1)
            .attr("refY", 5)
            .attr("markerWidth", 7)
            .attr("markerHeight", 7)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .append("circle")
                .attr("cx", 5)
                .attr("cy", 5)
                .attr("r", 4)
        ;
        this.defs.append("marker")
            .attr("class", "marker")
            .attr("id", this._id + "_circleHead")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 9)
            .attr("refY", 5)
            .attr("markerWidth", 7)
            .attr("markerHeight", 7)
            .attr("markerUnits", "strokeWidth")
            .attr("orient", "auto")
            .append("circle")
                .attr("cx", 5)
                .attr("cy", 5)
                .attr("r", 4)
        ;
    };

    return Graph;
}));
