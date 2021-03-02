var Timeline = {
  margin: { top: 5, left: 25, bottom: 5, right: 25 },

  svg: null,

  init: function () {
    var self = this;

    self.svg = d3
      .select("#timeline")
      .append("g")
      .attr(
        "transform",
        "translate(" + self.margin.left + ", " + self.margin.top + ")"
      );

    var xScale = d3.scale
      .linear()
      .domain([0, Database.dateStringArray.length - 1])
      .range([0, flowViewSvgWidth - self.margin.left - self.margin.right]);
    var parseDate = d3.time.format("%Y-%m").parse;
    var timeFormat = d3.time.format("%b %y");

    // create line
    self.svg
      .append("line")
      .attr("x1", 0)
      .attr("y1", 55)
      .attr("x2", flowViewSvgWidth - self.margin.left - self.margin.right)
      .attr("y2", 55)
      .style("stroke", "#d3d3d3");

    self.svg
      .selectAll("circle")
      .data(Database.dateStringArray)
      .enter()
      .append("circle")
      .attr("cx", function (d, i) {
        return xScale(i);
      })
      .attr("cy", 55)
      .attr("r", 5)
      .style("fill", "white")
      .style("stroke", "#d3d3d3");

    // create text
    var dateGroup = self.svg
      .selectAll(".date")
      .data(Database.dateStringArray)
      .enter()
      .append("text")
      .attr("class", "date")
      .attr("transform", function (d, i) {
        return "translate(" + xScale(i) + ", 40)" + " rotate(-45)";
      })
      .style("fill", "gray")
      .style("alignment-baseline", "middle")
      .text(function (d) {
        var parseDate = d3.time.format("%Y-%m").parse;
        var formatTime = d3.time.format("%b %y");
        var dateString = formatTime(parseDate(d));
        return dateString;
      });
  },
  highlight: function (timeIndex) {
    var self = this;

    // restore all
    self.removeHighlight();

    // text
    var targetText = self.svg.selectAll(".date")[0][timeIndex];
    var text = d3
      .select(targetText)
      .style("font-size", 13)
      .style("font-weight", "bold");

    // circle
    var targetCircle = self.svg.selectAll("circle")[0][timeIndex];
    d3.select(targetCircle).style("fill", "#d3d3d3");
  },
  removeHighlight: function () {
    var self = this;

    var text = self.svg
      .selectAll("text")
      .style("font-size", null)
      .style("font-weight", null);

    self.svg.selectAll("circle").style("fill", "white");
  },
};
