var Table = {
  margin: { top: 0, left: 0, bottom: 0, right: 5 }, // top height not include table legend height
  width: null, // no height as it depends on the number of objects to be rendered
  rowHeight: 35,

  pixelGroupTopBottomPadding: 2,
  barGroupTopBottomPadding: 2,
  maxPixelGroupsHeight: 31, // 34 + 2 + 2 = 38
  graphGroupLeftRightPadding: 30,
  pixelGroupLeftRightPadding: 25,
  barGroupLeftRightPadding: 25,
  positionLeftPadding: 25,

  svgGroup: null,

  columnWidth: [],

  init: function () {
    var self = this;

    var topPadding = self.rowHeight / 2 - 6; // font size is 12
    self.margin.bottom = topPadding * 2; // x 2 because there is no top padding
    self.width = tableViewWidth - self.margin.left - self.margin.right;
    self.columnWidth = [
      self.width / 3 - 10,
      self.width / 3 - 10,
      self.width / 3 + 20,
    ];

    d3.select("#table").attr(
      "height",
      self.rowHeight * Database.nameList.length +
        self.margin.top +
        self.margin.bottom
    );
    self.svgGroup = d3
      .select("#table")
      .append("g")
      .attr(
        "transform",
        "translate(" + self.margin.left + ", " + self.margin.top + ")"
      );

    self.createRows();
    self.createPixelGroups();
    self.createLegend();
  },
  createRows: function () {
    var self = this;

    var row = self.svgGroup
      .selectAll(".row")
      .data(Database.nameList)
      .enter()
      .append("g")
      .attr("class", function (d, i) {
        if (i % 2 == 0) return "row even " + d.split(".").join("-");
        else return "row odd " + d.split(".").join("-");
      })
      .attr("transform", function (d, i) {
        return "translate(0, " + i * self.rowHeight + ")";
      })
      .style("cursor", "pointer")
      .on("mouseover", onMouseOverRow)
      .on("mouseout", onMouseOutRow)
      .on("click", onClickRow);

    // append rectangle for hovering
    row
      .append("rect")
      .attr("class", "highlight")
      .attr("width", self.width)
      .attr("height", self.rowHeight)
      .attr("x", 0)
      .attr("y", self.rowHeight / 2 - 6); // minus 6 because font size is 12

    // append name
    row
      .append("text")
      .text(function (d) {
        return d;
      })
      .attr("x", self.columnWidth[0] / 2)
      .attr("y", self.rowHeight)
      .style("font-size", 12)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "bottom");

    // append position circle
    row
      .append("circle")
      .attr("r", 5)
      .attr("cx", self.columnWidth[0] + self.positionLeftPadding)
      .attr("cy", self.rowHeight - 5) // 5 is the font size
      .attr("fill", function (d) {
        var position = Database.employeeDict[d];
        var positionIndex = Database.position2Index[position];
        var positionColour = Database.positionColours[positionIndex];

        return positionColour;
      })
      .attr("stroke", "black");

    // append position
    row
      .append("text")
      .text(function (d) {
        return Database.employeeDict[d];
      })
      .attr("x", self.columnWidth[0] + self.positionLeftPadding + 15)
      .attr("y", self.rowHeight)
      .style("font-size", 12)
      .style("alignment-baseline", "bottom");

    function onMouseOverRow() {
      d3.select(this).classed("highlighted", true);
    }

    function onMouseOutRow() {
      d3.select(this).classed("highlighted", false);
    }

    function onClickRow(d) {
      // append selected to row
      if (!d3.select(this).classed("selected")) {
        d3.select(this).classed("selected", true);
        EgoNetworkView.createFlow(d);
      } else {
        d3.select(this).classed("selected", false);
        EgoNetworkView.removeFlow(d);
      }
    }
  },
  createPixelGroups: function () {
    var self = this;
    var row = self.svgGroup.selectAll(".row");

    // create event pixel group
    var pixelGroupXTranslate =
      self.columnWidth[0] +
      self.columnWidth[1] +
      self.pixelGroupLeftRightPadding;
    var pixelGroupYTranslate =
      self.rowHeight / 2 - 6 + self.pixelGroupTopBottomPadding; // yTranslate should be the same as the rectangle for hovering

    row
      .append("g")
      .attr("class", "event-pixel-group")
      .attr(
        "transform",
        "translate(" + pixelGroupXTranslate + ", " + pixelGroupYTranslate + ")"
      );
  },
  createLegend: function () {
    var self = this;
    var row = self.svgGroup.selectAll(".row");

    // create legend
    var legend = d3
      .select("#table-legend")
      .append("g")
      .attr("transform", "translate(" + self.margin.left + ", 0)");

    legend
      .append("rect")
      .attr("width", tableViewWidth - 20)
      .attr("height", tableLegendHeight)
      .style("fill", "white");

    legend
      .append("text")
      .text("Node ID")
      .attr("x", self.columnWidth[0] / 2)
      .attr("y", self.rowHeight / 2)
      .style("font-size", 12)
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .style("alignment-baseline", "middle");
    legend
      .append("text")
      .text("Node Label")
      .attr("x", self.columnWidth[0] + self.columnWidth[1] / 2)
      .attr("y", self.rowHeight / 2)
      .style("font-size", 12)
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .style("alignment-baseline", "middle");
    legend
      .append("text")
      .text("Events")
      .attr(
        "x",
        self.columnWidth[0] + self.columnWidth[1] + self.columnWidth[2] / 2
      )
      .attr("y", self.rowHeight / 2)
      .style("font-size", 12)
      .style("font-weight", "bold")
      .style("text-anchor", "middle")
      .style("alignment-baseline", "middle");

    // create download button
    var xTranslate =
      self.columnWidth[0] + self.columnWidth[1] + self.columnWidth[2] / 2 + 55;
    var downloadButton = legend
      .append("g")
      .attr("class", "download-button")
      .attr("transform", "translate(" + xTranslate + ", " + 0 + ")")
      .attr("cursor", "pointer")
      .on("click", onClickDownloadButton);

    var downloadButtonText = downloadButton
      .append("text")
      .text("Download")
      .attr("x", 0)
      .attr("y", self.rowHeight / 2)
      .style("text-anchor", "middle")
      .style("alignment-baseline", "middle");

    var bbox = downloadButtonText[0][0].getBBox();
    downloadButton
      .insert("rect", "text")
      .attr("width", bbox.width + 4)
      .attr("height", bbox.height + 4)
      .attr("x", bbox.x - 2)
      .attr("y", bbox.y - 2)
      .style("rx", 5)
      .style("ry", 5)
      .style("fill", "#e5e5e5");

    function onClickDownloadButton() {
      var csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "eventName,startDate,endDate,name\n";

      Database.events.forEach(function (event, i) {
        var endDate = event.endDate == null ? "" : event.endDate;
        dataString =
          event.name + "," + event.startDate + "," + endDate + "," + event.name;
        csvContent +=
          i < Database.events.length ? dataString + "\n" : dataString;
      });

      var encodedUri = encodeURI(csvContent);
      window.location.href = encodedUri;
    }
  },
  updateEvents: function () {
    var self = this;

    // preprocess the events
    var eventsByName = d3
      .nest()
      .key(function (d) {
        return d.name;
      })
      .map(Database.events);

    // * update the events in the table
    var pixelHeight =
      (self.maxPixelGroupsHeight - (EventView.maxNumberOfEvents - 1)) /
      EventView.maxNumberOfEvents; // 6 = gap numbers x gap pixels
    var pixelWidth = 4;
    var paddingBetweenPixel =
      (self.columnWidth[2] -
        self.pixelGroupLeftRightPadding -
        self.pixelGroupLeftRightPadding -
        pixelWidth * Database.numberOfTimeSteps) /
      (Database.numberOfTimeSteps - 1);
    var pixelXAndWidthScale = d3.scale
      .linear()
      .domain([0, Database.numberOfTimeSteps - 1])
      .range([
        0,
        self.columnWidth[2] -
          self.pixelGroupLeftRightPadding -
          self.pixelGroupLeftRightPadding,
      ]);

    var eventPixelGroup = self.svgGroup.selectAll(".row .event-pixel-group");

    // join data for pixel group
    var pixelGroup = eventPixelGroup.selectAll("g").data(function (d) {
      // return an array with each element as an event type
      var eventGroupArray = [];

      if (d in eventsByName) {
        var eventsByEventName = d3
          .nest()
          .key(function (event) {
            return event.eventName;
          })
          .map(eventsByName[d]);

        for (eventName in eventsByEventName)
          eventGroupArray.push(eventsByEventName[eventName]);
      }

      return eventGroupArray;
    });

    // enter for pixel group
    pixelGroup.enter().append("g");

    // update for pixel group
    eventPixelGroup.selectAll("g").attr("transform", function (d, i) {
      var yTranslate = self.maxPixelGroupsHeight - (i + 1) * (pixelHeight + 1);
      return "translate(0, " + yTranslate + ")";
    });

    // exit for pixel group
    pixelGroup.exit().remove();

    // join data for pixels in a group
    var pixels = pixelGroup.selectAll("rect").data(function (d) {
      return d;
    });

    // enter for pixels in a group
    pixels.enter().append("rect").attr("height", pixelHeight).attr("y", 0.5); // 0.5 is the top padding

    // update for pixels in a group
    pixelGroup
      .selectAll("rect")
      .attr("width", function (d) {
        var startTimeIndex = Database.dateString2Index[d.startDate];

        if (d.endDate) {
          var endTimeIndex = Database.dateString2Index[d.endDate];
          return (
            pixelXAndWidthScale(endTimeIndex - startTimeIndex) -
            paddingBetweenPixel
          );
        } else {
          return pixelWidth;
        }
      })
      .attr("x", function (d) {
        return (
          pixelXAndWidthScale(Database.dateString2Index[d.startDate]) +
          paddingBetweenPixel / 2
        );
      })
      .style("fill", function (d) {
        var eventIndex = EventView.event2Index[d.eventName];

        return EventView.colours(eventIndex);
      });

    // exit for pixels in a group
    pixels.exit().remove();
  },
};
