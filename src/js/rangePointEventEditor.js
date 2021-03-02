var RangePointEventEditor = {
  // input
  currentAttribute: null,

  // dimensions
  leftRightPadding: 30,
  trackWidth: null,
  barHeight: 20,

  // svg
  editorSVG: null,

  // others
  xScale: null,
  brush: null,
  numberOfbins: 25,
  isInt: {
    Size: true,
    Density: false,
  },

  // debug rect
  debugEventsByName: null,
  debugEventColour: null,

  init: function (attribute) {
    var self = this;

    // remove the previous widgets
    EventView.removeEventEditor();
    EgoNetworkView.removeDebugRect();

    // store data
    self.trackWidth =
      eventViewWidth -
      EventView.margin.left -
      EventView.margin.right -
      self.leftRightPadding * 2;
    self.currentAttribute = attribute;

    self.editorSVG = EventView.eventEditorSvg
      .append("g")
      .attr("class", "editor")
      .attr(
        "transform",
        "translate(" + self.leftRightPadding + ", " + EventView.brushY + ")"
      );

    var lowerBound = Database.rangeDict[self.currentAttribute][0];
    var upperBound = Database.rangeDict[self.currentAttribute][1];
    if (upperBound < 25 && self.isInt[self.currentAttribute])
      self.numberOfbins = upperBound - lowerBound + 1;
    else self.numberOfbins = 25;
  },
  createRangeSelector: function () {
    var self = this;

    // draw brush
    self.xScale = d3.scale
      .linear()
      .domain(Database.rangeDict[self.currentAttribute])
      .range([0, self.trackWidth]);
    self.brush = d3.svg
      .brush()
      .x(self.xScale)
      .on("brush", onBrushMove)
      .on("brushend", onBrushEnd);

    var brushGroup = self.editorSVG
      .append("g")
      .attr("class", "brush")
      .call(self.brush);
    brushGroup.selectAll("rect").attr("height", self.barHeight);
    brushGroup.select(".background").style("visibility", null);

    // draw the overall range
    brushGroup
      .append("text")
      .attr("x", 0)
      .attr("y", self.barHeight + 10)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "baseline")
      .text(Database.rangeDict[self.currentAttribute][0]);
    brushGroup
      .append("text")
      .attr("x", self.trackWidth)
      .attr("y", self.barHeight + 10)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "baseline")
      .text(Database.rangeDict[self.currentAttribute][1]);

    // draw the range of the brush
    brushGroup
      .select(".resize.w")
      .append("text")
      .attr("class", "lower-bound")
      .attr("x", 0)
      .attr("y", -13)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "baseline")
      .style("font-size", 15);
    brushGroup
      .select(".resize.e")
      .append("text")
      .attr("class", "upper-bound")
      .attr("x", 0)
      .attr("y", -13)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "baseline")
      .style("font-size", 15);

    // draw the name
    brushGroup
      .append("text")
      .attr("x", self.trackWidth / 2)
      .attr("y", self.barHeight + 1)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "text-before-edge")
      .text(self.currentAttribute);

    function onBrushMove() {
      var lowerBound, upperBound;

      if (self.isInt[self.currentAttribute]) {
        lowerBound = self.brush.empty()
          ? null
          : Math.round(self.brush.extent()[0]);
        upperBound = self.brush.empty()
          ? null
          : Math.round(self.brush.extent()[1]);
      } else {
        // show one decimal place
        lowerBound = self.brush.empty()
          ? null
          : Math.round(self.brush.extent()[0] * 10) / 10;
        upperBound = self.brush.empty()
          ? null
          : Math.round(self.brush.extent()[1] * 10) / 10;
      }

      // change the lower bound and upper bound text
      EventView.eventEditorSvg.select(".brush .lower-bound").text(lowerBound);
      EventView.eventEditorSvg.select(".brush .upper-bound").text(upperBound);

      // update event tag
      EventView.currentEventName =
        '"' +
        self.currentAttribute +
        '"' +
        " between " +
        lowerBound +
        " and " +
        upperBound;
      EventView.checkIfCurrentEventAdded();
      EventView.updateEventEditor(); // assume event editor was created
    }

    function onBrushEnd() {
      // show the add button only if brush is created
      if (self.brush.empty()) {
        EventView.eventEditorSvg.select(".add-button").style("display", "none");
      } else {
        EventView.eventEditorSvg.select(".add-button").style("display", null);
      }

      // draw debug rect
      EgoNetworkView.updateDebugRect();
    }
  },
  createLineChart: function () {
    var self = this;
    var lineChartData = [];

    // determine range of a bin
    var lowerBound = Database.rangeDict[self.currentAttribute][0];
    var upperBound = Database.rangeDict[self.currentAttribute][1];
    var sizeOfBin = (upperBound - lowerBound) / self.numberOfbins;

    // create the bins for counting
    for (var i = 0; i < self.numberOfbins; i++) lineChartData.push(0);

    for (var name in Database.timeSeriesDict[self.currentAttribute]) {
      var valueArray = Database.timeSeriesDict[self.currentAttribute][name];

      for (var t = 0; t < valueArray.length; t++) {
        var binIndex = Math.floor((valueArray[t] - lowerBound) / sizeOfBin);

        // handle the special case
        if (binIndex == self.numberOfbins) binIndex--;

        lineChartData[binIndex]++;
      }
    }

    // draw the bar chart
    var xScale = d3.scale
      .linear()
      .domain([0, self.numberOfbins - 1])
      .range([0, self.trackWidth]);
    var yScale = d3.scale
      .linear()
      .domain(d3.extent(lineChartData))
      .range([self.barHeight, 0]);
    var line = d3.svg
      .line()
      .x(function (d, i) {
        return xScale(i);
      })
      .y(function (d) {
        return yScale(d);
      })
      .interpolate("cardinal");

    var lineChart = self.editorSVG.select(".brush").insert("g", ".background");

    lineChart
      .append("path")
      .datum(lineChartData)
      .attr("d", line)
      .style("fill", "none")
      .style("stroke", "black");
  },
  createEventTagInEditor: function () {
    var self = this;

    // must check if added whenever current event name is changed
    EventView.currentEventName =
      '"' + self.currentAttribute + '"' + " between NULL and NULL";
    EventView.checkIfCurrentEventAdded();

    // create group
    var editorEventTag = EventView.eventEditorSvg
      .append("g")
      .attr("class", "editor-event-tag");

    // draw circle
    editorEventTag
      .append("circle")
      .attr("class", "event-colour")
      .attr("r", EventView.circleRadius)
      .attr("cx", 10)
      .attr("cy", EventView.tagY)
      .style("stroke", "black")
      .style("fill", EventView.newEventColour);

    // draw text
    editorEventTag
      .append("text")
      .attr("class", "event-name")
      .attr("x", 25)
      .attr("y", EventView.tagY)
      .style("text-anchor", "start")
      .style("alignment-baseline", "central")
      .style("font-size", 12)
      .style("cursor", "pointer")
      .text(EventView.currentEventName)
      .on("click", EventView.editEventName);

    // draw add button
    var addButton = editorEventTag
      .append("g")
      .attr("class", "add-button")
      .attr(
        "transform",
        "translate(" +
          EventView.addButtonXTranslate +
          ", " +
          EventView.tagY +
          ")"
      )
      .style("display", "none")
      .style("cursor", "pointer")
      .on("click", self.clickAddButton);
    var addButtonSvgText = addButton
      .append("text")
      .attr("x", 0)
      .attr("y", 0)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "central")
      .style("font-size", 15)
      .text(EventView.addButtonText);
    var bbox = addButtonSvgText[0][0].getBBox();
    addButton
      .insert("rect", "text")
      .attr("width", bbox.width + 4)
      .attr("height", bbox.height + 4)
      .attr("x", bbox.x - 2)
      .attr("y", bbox.y - 2)
      .style("rx", 5)
      .style("ry", 5)
      .style("fill", "#e5e5e5");
  },
  clickAddButton: function () {
    var self = RangePointEventEditor;

    if (EventView.addButtonText == "Added" || EventView.addButtonText == "Full")
      return;

    self.addEventToDatabase();
    EventView.registerNewEvent();
    EventView.addEventTagToEventPanel(true);
    MDSView.update();
    Table.updateEvents();

    EventView.checkIfCurrentEventAdded(); // change to added
    EventView.updateEventEditor();

    // update the debug rect
    EgoNetworkView.removeDebugRect();
  },
  addEventToDatabase: function () {
    var self = this;

    // determin lower and upper bounds
    var lowerBound, upperBound;
    if (self.isInt[self.currentAttribute]) {
      lowerBound = self.brush.empty()
        ? null
        : Math.ceil(self.brush.extent()[0]);
      upperBound = self.brush.empty()
        ? null
        : Math.ceil(self.brush.extent()[1]);
    } else {
      // show one decimal place
      lowerBound = self.brush.empty()
        ? null
        : Math.round(self.brush.extent()[0] * 10) / 10;
      upperBound = self.brush.empty()
        ? null
        : Math.round(self.brush.extent()[1] * 10) / 10;
    }

    // add to database
    for (var name in Database.timeSeriesDict[self.currentAttribute]) {
      var valueArray = Database.timeSeriesDict[self.currentAttribute][name];

      // upper bound not included to prevent overlapping
      for (var t = 0; t < valueArray.length; t++) {
        if (
          (valueArray[t] >= lowerBound && valueArray[t] < upperBound) ||
          (upperBound == Database.rangeDict[self.currentAttribute][1] &&
            valueArray[t] == Database.rangeDict[self.currentAttribute][1])
        )
          Database.appendEvent(
            EventView.currentEventName,
            Database.dateStringArray[t],
            null,
            name
          );
      }
    }
  },
  createDebugRectData: function () {
    var self = this;

    debugEventsByName = {};

    // determin lower and upper bounds
    var lowerBound, upperBound;
    if (self.isInt[self.currentAttribute]) {
      lowerBound = self.brush.empty()
        ? null
        : Math.ceil(self.brush.extent()[0]);
      upperBound = self.brush.empty()
        ? null
        : Math.ceil(self.brush.extent()[1]);
    } else {
      // show one decimal place
      lowerBound = self.brush.empty()
        ? null
        : Math.round(self.brush.extent()[0] * 10) / 10;
      upperBound = self.brush.empty()
        ? null
        : Math.round(self.brush.extent()[1] * 10) / 10;
    }

    if (lowerBound == null) {
      // should not draw rect
      self.debugEventsByName = debugEventsByName;
      self.debugEventColour = EventView.newEventColour;

      return;
    }

    // create data
    EgoNetworkView.svgGroup.selectAll(".flow").each(function () {
      var currentName = d3.select(this).attr("name");
      debugEventsByName[currentName] = [];

      var valueArray =
        Database.timeSeriesDict[self.currentAttribute][currentName];

      for (var t = 0; t < valueArray.length; t++) {
        if (
          (valueArray[t] >= lowerBound && valueArray[t] < upperBound) ||
          (upperBound == Database.rangeDict[self.currentAttribute][1] &&
            valueArray[t] == Database.rangeDict[self.currentAttribute][1])
        ) {
          debugEventsByName[currentName].push({
            startDate: Database.dateStringArray[t],
            endData: null,
          });
        }
      }
    });

    self.debugEventsByName = debugEventsByName;
    self.debugEventColour = EventView.newEventColour;
  },
};
