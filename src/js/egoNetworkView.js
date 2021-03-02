var EgoNetworkView = {
  margin: { top: 10, left: 25, bottom: 10, right: 25 },

  // dimension of the canvas for drawing the flows
  canvasWidth: 3000,
  canvasHeight: 250,

  // dimensions of the whole flow view (including the timeline)
  svgWidth: null,
  svgHeight: null,

  svgGroup: null,

  nextY_zoom: 0,
  zoomFactor: 0,

  init: function () {
    var self = this;

    self.svgWidth = flowViewSvgWidth;
    self.svgHeight = flowSvgHeight + timelineSvgHeight;

    self.zoomFactor =
      (self.canvasWidth - self.margin.left - self.margin.right) /
      (self.svgWidth - self.margin.left - self.margin.right);
    var inverseFactor = 1 / self.zoomFactor;
    var transformStr =
      "translate(" +
      self.margin.left +
      "," +
      self.margin.top +
      ")" +
      "scale(" +
      inverseFactor +
      ", " +
      inverseFactor +
      ")";

    self.svgGroup = d3
      .select("#chart")
      .append("g")
      .attr("id", "all-flows")
      .attr("transform", transformStr);

    self.initButtonBehavior();
    self.initDropDownMenu();
    self.createLegend();
  },
  initButtonBehavior: function () {
    var self = this;

    d3.select("#flow-view .ui-menu-bar .control")
      .append("text")
      .attr("x", 10)
      .attr("y", 15)
      .style("font-weight", "bold")
      .text("Ego-Network View");

    $("#remove").click(function () {
      // clear all flows
      d3.selectAll(".flow").remove();

      // restore original size of svg
      d3.select("#chart").attr("height", flowSvgHeight - 10);
      self.nextY_zoom = 0;

      // remove the row highlights
      d3.selectAll(".row.selected").classed("selected", false);
    });

    $("#remove").mouseenter(function () {
      let currentPos = $(this).offset();
      let currentHeight = $(this).height();
      let currentWidth = $(this).width();

      $("#tooltip")
        .attr("data-tooltip", "Clear View")
        .css("top", currentPos.top + currentHeight + 10)
        .css("left", currentPos.left + currentWidth / 2 - 5)
        .addClass("show")
        .addClass("bottom");
    });

    $("#remove").mouseleave(function () {
      $("#tooltip").removeClass("show");
    });

    $("#hide-link").click(function () {
      if (!$(this).hasClass("selected")) {
        $(this).addClass("selected");

        d3.selectAll(".flow .link").style("opacity", 0);
      } else {
        $(this).removeClass("selected");

        d3.selectAll(".flow .link").style("opacity", null);
      }
    });

    $("#hide-link").mouseenter(function () {
      let currentPos = $(this).offset();
      let currentHeight = $(this).height();
      let currentWidth = $(this).width();

      $("#tooltip")
        .attr("data-tooltip", "Hide Links")
        .css("top", currentPos.top + currentHeight + 10)
        .css("left", currentPos.left + currentWidth / 2 - 5)
        .addClass("show")
        .addClass("bottom");
    });

    $("#hide-link").mouseleave(function () {
      $("#tooltip").removeClass("show");
    });

    $("#adjust-time-series").click(function () {
      if (!$("#adjust-time-series").hasClass("selected"))
        $("#adjust-time-series").addClass("selected");
      else $("#adjust-time-series").removeClass("selected");

      // get the list of names
      var nameListToBeRendered = [];
      self.svgGroup.selectAll(".flow").each(function () {
        var name = d3.select(this).attr("name");
        nameListToBeRendered.push(name);
      });

      // remove all flows
      self.svgGroup.selectAll(".flow").remove();
      self.nextY_zoom = 0;

      // restore flow
      for (var i = 0; i < nameListToBeRendered.length; i++)
        self.createFlow(nameListToBeRendered[i]);
    });
  },
  initDropDownMenu: function () {
    var self = this;

    var menuItems = Object.keys(Database.timeSeriesDict);
    menuItems.unshift("None");

    for (var i = 0; i < menuItems.length; i++) {
      $("#timeseries-menu select").append(
        $("<option>", {
          value: menuItems[i],
          text: menuItems[i],
        })
      );
    }

    $("#timeseries-menu select").change(onChangeTimeSeriesMenu);

    // change the flows to time series
    function onChangeTimeSeriesMenu() {
      var attributeName = $(this).val();
      var nameListToBeRendered = [];

      // get the list of names
      self.svgGroup.selectAll(".flow").each(function () {
        var name = d3.select(this).attr("name");
        nameListToBeRendered.push(name);
      });

      // remove all flows
      self.svgGroup.selectAll(".flow").remove();
      self.nextY_zoom = 0;

      // restore flow
      for (var i = 0; i < nameListToBeRendered.length; i++)
        self.createFlow(nameListToBeRendered[i]);

      // show the adjust button
      if (attributeName == "None") {
        $("#adjust-time-series").css("display", "");
      } else {
        $("#adjust-time-series").css("display", "inline");
        $("#adjust-time-series").removeClass("selected");
      }

      self.updateDebugRect();
    }
  },
  createLegend: function () {
    var self = this;
    var svg = d3.select("#flow-view .ui-menu-bar .control");

    svg
      .append("text")
      .attr("x", 116)
      .attr("y", 15)
      .style("font-weight", "bold")
      .text("Legend:");

    // self.createLegendText("venture_capital", 162, 15, "#bcbcbc");
    // self.createLegendText("micro_vc", 235, 15, "#bcbcbc");
    // self.createLegendText("individual", 281, 15, "#bcbcbc");
    // self.createLegendText("corporate_venture_capital", 329, 15, "black");
    // self.createLegendText("accelerator", 451, 15, "black");
    // self.createLegendText("angel_group", 507, 15, "black");
    // self.createLegendText("investment_bank", 569, 15, "black");
    // self.createLegendText("others", 651, 15, "black");
    self.createLegendText("CEO", 162, 15, "#bcbcbc");
    self.createLegendText("President", 190, 15, "#bcbcbc");
    self.createLegendText("Vice President", 238, 15, "#bcbcbc");
    self.createLegendText("Director", 308, 15, "#bcbcbc");
    self.createLegendText("Managing Director", 349, 15, "black");
    self.createLegendText("Manager", 436, 15, "black");
    self.createLegendText("In House Lawyer", 481, 15, "black");
    self.createLegendText("Trader", 562, 15, "black");
    self.createLegendText("Employee", 597, 15, "black");
    self.createLegendText("unknown", 647, 15, "black");

    svg
      .selectAll(".legend")
      .style("cursor", "pointer")
      .on("mouseenter", onMouseenterLegend)
      .on("mouseleave", onMouseleaveLegend);

    function onMouseenterLegend() {
      var className = "." + d3.select(this).attr("class").split(" ").join(".");
      var position = d3.select(this).select("text").text().split(" ").join("-");

      // highlight text
      d3.selectAll("#flow-view .ui-menu-bar .control .legend").style(
        "opacity",
        0.1
      );
      d3.selectAll("#flow-view .ui-menu-bar .control " + className).style(
        "opacity",
        1
      );

      // highlight nodes
      d3.selectAll("#flow-view .node").style("opacity", 0);
      d3.selectAll("#flow-view .node." + position).style("opacity", 1);

      // highlight links
      d3.selectAll("#flow-view .link").style("opacity", 0);
      d3.selectAll("#flow-view .link." + position).style("opacity", 1);

      // highlight nodes in MDS view
      MDSView.nodeLayer.selectAll("circle").style("opacity", 0.05);
      MDSView.nodeLayer.selectAll("circle." + position).style("opacity", 0.7);
    }

    function onMouseleaveLegend() {
      // remove highlight text
      d3.selectAll("#flow-view .ui-menu-bar .control .legend").style(
        "opacity",
        1
      );

      // remove highlight nodes
      d3.selectAll(".node").style("opacity", 1);

      // remove highlight links
      d3.selectAll(".link").style("opacity", 1);

      // remove highlight nodes in MDS view
      MDSView.nodeLayer.selectAll("circle").style("opacity", 0.7);
    }
  },
  createLegendText: function (position, x, y, textColour) {
    var className = position.split(" ").join("-");
    var positionIndex = Database.position2Index[position];

    // create the group
    var group = d3
      .select("#flow-view .ui-menu-bar .control")
      .append("g")
      .attr("class", "legend " + className);

    // create text
    var text = group
      .append("text")
      .attr("x", x)
      .attr("y", y)
      .style("fill", textColour)
      .text(position);

    // create rect behind the text
    var bbox = text.node().getBBox();
    var rect = group
      .insert("rect", "text")
      .attr("x", bbox.x - 3)
      .attr("y", bbox.y - 2)
      .attr("width", bbox.width + 6)
      .attr("height", bbox.height + 4)
      .attr("rx", 3)
      .attr("ry", 3)
      .style("fill", Database.positionColours[positionIndex])
      .style("stroke", "black");
  },
  createFlow: function (name) {
    var self = this;
    var normalizeTimeSeriesAreaChart = !$("#adjust-time-series").hasClass(
      "selected"
    );
    var hideLinks = $("#hide-link").hasClass("selected");

    var className = name.split(".").join("-");

    var flow = self.svgGroup
      .append("g")
      .attr("class", "flow " + className)
      .attr("name", name);
    NodeLinkDiagram.installMousemoveBehaviour(flow);

    var flowWidth = self.canvasWidth - self.margin.left - self.margin.right;
    var flowHeight = self.canvasHeight - self.margin.top - self.margin.bottom;

    if ($("#timeseries-menu select").val() == "None") {
      // draw the two layers and label
      FlowVis.init(flow, flowWidth, flowHeight, name);
      FlowVis.createFirstLayer();
      FlowVis.createSecondLayer(hideLinks);
      FlowVis.createLabels();
    } else {
      // get attribute name
      var attributeName = $("#timeseries-menu select").val();

      // draw area chart
      TimeSeriesAreaCharts.init(
        flow,
        flowWidth,
        flowHeight / 2,
        Database.timeSeriesDict[attributeName][name],
        name
      );
      TimeSeriesAreaCharts.createAreaChart(normalizeTimeSeriesAreaChart);
      TimeSeriesAreaCharts.translateFlow();
      TimeSeriesAreaCharts.createBackground();
      TimeSeriesAreaCharts.createLabel();
    }

    // translate to juxtapose the flow groups
    flowGroupBBHeight = flow.node().getBBox().height;
    flow.attr("transform", "translate(0," + self.nextY_zoom + ")");
    self.nextY_zoom += flowGroupBBHeight + 50; // 50 is the padding

    // change size of svg depending on the number of flow
    d3.select("#chart").attr(
      "height",
      (self.nextY_zoom + 50) / self.zoomFactor
    );

    // update debug rect
    self.updateDebugRect();
  },
  updateDebugRect: function () {
    var self = this;

    if (EventViewRightClickHandler.selectedOption != null) {
      var mode = EventViewRightClickHandler.selectedOption;

      if (mode == "Value Range") {
        RangePointEventEditor.createDebugRectData();
        EgoNetworkView.createDebugRect(
          RangePointEventEditor.debugEventsByName,
          RangePointEventEditor.debugEventColour
        );
      }
      if (mode == "Slope Range") {
        IntervalEventEditor.createDebugRectData();
        EgoNetworkView.createDebugRect(
          IntervalEventEditor.debugEventsByName,
          IntervalEventEditor.debugEventColour
        );
      }
      if (mode == "S") {
        AppearPointEventEditor.createDebugRectData();
        EgoNetworkView.createDebugRect(
          AppearPointEventEditor.debugEventsByName,
          AppearPointEventEditor.debugEventColour
        );
      }
      if (mode == "Combine") {
        CombineEventEditor.createDebugRectData();
        EgoNetworkView.createDebugRect(
          CombineEventEditor.debugEventsByName,
          CombineEventEditor.debugEventColour
        );
      }
    }

    if (EventViewRightClickHandler.selectedOption == null)
      self.removeDebugRect();
  },
  removeFlow: function (name) {
    var self = this;

    var className = name.split(".").join("-");

    // compute bounding box height of the flow and remove from nextY_zoom
    var bboxHeight = self.svgGroup
      .select(".flow." + className)
      .node()
      .getBBox().height;
    self.nextY_zoom -= bboxHeight + 20;

    // restore height of svg
    d3.select("#chart").attr(
      "height",
      (self.nextY_zoom + 50) / self.zoomFactor
    );

    // remove the corresponding flow and shift the ones below up
    var removedFlowTranslateY = d3.transform(
      self.svgGroup.select(".flow." + className).attr("transform")
    );
    removedFlowTranslateY = removedFlowTranslateY.translate[1];

    self.svgGroup.select(".flow." + className).remove();

    self.svgGroup.selectAll(".flow").each(function () {
      var currentTranslateY = d3.transform(d3.select(this).attr("transform"))
        .translate[1];

      if (currentTranslateY > removedFlowTranslateY) {
        currentTranslateY -= bboxHeight + 20;
        d3.select(this)
          .transition()
          .attr("transform", "translate(0, " + currentTranslateY + ")");
      }
    });

    if (self.svgGroup.select(".flow").empty()) self.nextY_zoom = 0;
  },
  createDebugRect: function (eventsByName, rectColour) {
    // used by both flow and area
    var self = this;

    // create rect data (array of rect objects)
    var rectData = {};
    for (var name in eventsByName) {
      var rectArray = [];
      var className = name.split(".").join("-");
      var flowWidth = self.canvasWidth - self.margin.left - self.margin.right;
      var xScale = d3.scale
        .linear()
        .domain([0, Database.numberOfTimeSteps - 1])
        .range([0, flowWidth]);

      for (var i = 0; i < eventsByName[name].length; i++) {
        var currentEvent = eventsByName[name][i];
        var startDateIndex = Database.dateString2Index[currentEvent.startDate];
        var timeDiff = 0;
        var rectObject = {};

        if (currentEvent.endDate) {
          var endDateIndex = Database.dateString2Index[currentEvent.endDate];
          timeDiff = endDateIndex - startDateIndex;
        }

        rectObject = {
          x: xScale(startDateIndex),
          y: 0,
          width:
            FlowVis.debugRectWidth +
            timeDiff * (flowWidth / (Database.numberOfTimeSteps - 1)),
          height: 20,
        };

        rectArray.push(rectObject);
      }

      rectData[name] = rectArray;
    }

    // draw the rect
    for (var name in eventsByName) {
      var className = name.split(".").join("-");

      // join
      var rect = d3
        .select(".flow." + className + " .tick-group")
        .selectAll(".debug-rect")
        .data(rectData[name]);

      // enter
      rect
        .enter()
        .append("rect")
        .attr("class", "debug-rect")
        .attr("rx", 2)
        .attr("ry", 2)
        .style("fill-opacity", 0.3)
        .style("stroke-width", 3);

      // update
      d3.selectAll(".flow." + className + " .tick-group .debug-rect")
        .attr("x", function (d) {
          return d.x - FlowVis.debugRectWidth / 2;
        })
        .attr("y", function (d) {
          return d.y;
        })
        .attr("width", function (d) {
          return d.width;
        })
        .attr("height", function (d) {
          return d.height;
        })
        .style("fill", rectColour)
        .style("stroke", rectColour);

      // exit
      rect.exit().remove();
    }
  },
  removeDebugRect: function () {
    var self = this;

    self.svgGroup.selectAll(".flow").each(function () {
      var className = "." + d3.select(this).attr("class").split(" ").join(".");
      d3.selectAll(className + " .tick-group .debug-rect").remove();
    });
  },
};
