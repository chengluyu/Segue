var NodeLinkDiagram = {
  alterDict: {}, // for creating links
  ego: {},
  nodes: [],
  links: [],

  centre: { x: null, y: null },
  radius: 70,
  strokeScale: null,
  maxLabelLength: 10,

  linkLayer: null,
  nodeLayer: null,
  labelLayer: null,

  // for scatterplot
  nodeClassNameList: [],
  linkClassNameList: [],
  egoClassName: null,

  // for determining if rerendering is needed
  previousDate: null,

  init: function () {
    var self = this;

    self.linkLayer = d3
      .select("#node-link-diagram svg")
      .append("g")
      .attr("class", "link-layer");
    self.nodeLayer = d3
      .select("#node-link-diagram svg")
      .append("g")
      .attr("class", "node-layer");
    self.labelLayer = d3
      .select("#node-link-diagram svg")
      .append("g")
      .attr("class", "label-layer");

    self.centre.x = $("#node-link-diagram").width() / 2;
    self.centre.y = $("#node-link-diagram").height() / 2;
    self.strokeScale = d3.scale
      .linear()
      .domain([1, Database.maxLinkCountToANode])
      .range([1, 8]);
  },
  installMousemoveBehaviour: function (flowObject) {
    var self = this;

    flowObject
      .on("mousemove", self.onMousemoveFlow)
      .on("mouseleave", self.onMouseleaveFlow)
      .on("click", self.onClickFlow);
  },
  onClickFlow: function () {
    var self = NodeLinkDiagram;
    var timeIndex = self.getCurrentTimeIndex(d3.mouse(this)[0]);
    var date = Database.dateStringArray[timeIndex];
    var parseDate = d3.time.format("%Y-%m").parse;
    var timeFormat = d3.time.format("%b %y");
    var timeString = timeFormat(parseDate(date));
    var name = d3.select(this).attr("name");

    StateHandler.addVisualLock("Ego-network of " + name, timeString);
    StateHandler.storeState(
      "ego",
      timeIndex,
      self.nodeClassNameList,
      self.linkClassNameList,
      self.egoClassName
    );
  },
  onMousemoveFlow: function () {
    var self = NodeLinkDiagram;
    var name = d3.select(this).attr("name");
    var className = name.split(".").join("-");
    var timeIndex = self.getCurrentTimeIndex(d3.mouse(this)[0]);
    var date = Database.dateStringArray[timeIndex];
    var top = d3.event.clientY + $(window).scrollTop();
    var left = d3.event.clientX + $(window).scrollLeft();

    if (self.previousDate == date) {
      self.previousDate = date;
      return;
    } else {
      self.previousDate = date;
    }

    self.computeNodeData(name, date);
    self.computeLinkData(name, date);
    self.drawNodeLinkDiagram(top, left);
    MDSView.updateLinks(date);
    Timeline.highlight(timeIndex);
    MDSView.highlightTimeline(timeIndex);
    MDSView.highlightEgoNetwork(
      self.nodeClassNameList,
      self.linkClassNameList,
      self.egoClassName
    );
  },
  onMouseleaveFlow: function () {
    var self = NodeLinkDiagram;

    self.hideNodeLinkDiagram();
    self.previousDate = null;
    Timeline.removeHighlight();
    StateHandler.restoreState();
  },
  getCurrentTimeIndex: function (mouseX) {
    var totalNumberOfTimePeriods = Database.numberOfTimeSteps - 1;
    var widthOfOneTimePeriod =
      (EgoNetworkView.canvasWidth -
        EgoNetworkView.margin.left -
        EgoNetworkView.margin.right) /
      totalNumberOfTimePeriods;

    var convertedMouseX = mouseX + widthOfOneTimePeriod / 2;
    var numberOfTimePeriods = convertedMouseX / widthOfOneTimePeriod;

    return Math.floor(numberOfTimePeriods); // 0 - 23
  },
  computeNodeData: function (name, date) {
    var self = this;

    var nodes = [];
    var alterDict = {};
    var ego = {};
    var nodeClassNameList = [];

    // find outer names
    var outerNodeNames = [];
    for (var i = 0; i < Database.egoNetworkDict[name][date].length; i++) {
      var currentName = Database.egoNetworkDict[name][date][i];

      if (currentName != name) outerNodeNames.push(currentName);
    }

    // sort nodes based on colour (nodes not include self)
    for (var i = 0; i < outerNodeNames.length; i++) {
      var currentName = outerNodeNames[i];
      var position = Database.employeeDict[currentName];
      var positionIndex = Database.position2Index[position];
      var colour = Database.positionColours[positionIndex];
      var nodeObject = { name: currentName, colour: colour };
      var nodeClassName = currentName.split(".").join("-");

      nodes.push(nodeObject);
      nodeClassNameList.push("." + nodeClassName); // push alter
      alterDict[currentName] = nodeObject;
    }
    var nodeClassName = name.split(".").join("-");
    nodeClassNameList.push("." + nodeClassName); // push ego
    nodes.sort(function (x, y) {
      return d3.ascending(x.colour, y.colour);
    });

    // compute position
    var angleOfSlice = (Math.PI * 2) / outerNodeNames.length;
    for (var i = 0; i < nodes.length; i++) {
      var angle = i * angleOfSlice;
      nodes[i].x = self.centre.x + self.radius * Math.cos(angle);
      nodes[i].y = self.centre.y + self.radius * Math.sin(angle);

      var angleInDegree = (angle / Math.PI) * 180;
      if (angleInDegree > 90 && angleInDegree < 270) {
        nodes[i].textAngle = angleInDegree - 180;
        nodes[i].flip = true;
      } else {
        nodes[i].textAngle = angleInDegree;
        nodes[i].flip = false;
      }
    }

    // include the ego, don't push it to the dict, push to to ego instead
    var position = Database.employeeDict[name];
    var positionIndex = Database.position2Index[position];
    var colour = Database.positionColours[positionIndex];
    var ego = {
      x: self.centre.x,
      y: self.centre.y,
      name: null, // no need to display
      colour: colour,
    };
    nodes.push(ego);

    self.nodes = nodes;
    self.alterDict = alterDict;
    self.ego = ego;
    self.egoClassName = "." + name.split(".").join("-");
    self.nodeClassNameList = nodeClassNameList;
  },
  computeLinkData: function (egoName, date) {
    var self = this;
    var circles = [];
    var links = [];
    var linkClassNameList = [];

    // count links
    var linkCount = {};
    for (var i = 0; i < Database.dateToLinkDict[date].length; i++) {
      var source = Database.dateToLinkDict[date][i].source;
      var target = Database.dateToLinkDict[date][i].target;
      var sourceAndTargetInEgoNet =
        (source in self.alterDict || source == egoName) &&
        (target in self.alterDict || target == egoName);

      if (sourceAndTargetInEgoNet) {
        var first = source < target ? source : target;
        var second = source < target ? target : source;
        var linkID = first + "-" + second;

        if (linkID in linkCount) linkCount[linkID]++;
        else linkCount[linkID] = 1;
      }
    }

    // create links
    max = 0;
    for (var linkID in linkCount) {
      var sourceName = linkID.split("-")[0];
      var targetName = linkID.split("-")[1];
      var sourceClassName = sourceName.split(".").join("-");
      var targetClassName = targetName.split(".").join("-");

      if (sourceName != targetName) {
        var sourceNode =
          sourceName == egoName ? self.ego : self.alterDict[sourceName];
        var targetNode =
          targetName == egoName ? self.ego : self.alterDict[targetName];
        linkClassNameList.push("." + sourceClassName + "." + targetClassName);
        links.push({
          source: sourceNode,
          target: targetNode,
          frequency: linkCount[linkID],
        });
      } else {
        var node =
          sourceName == egoName ? self.ego : self.alterDict[sourceName];
        linkClassNameList.push("circle." + sourceClassName);
        circles.push({ node: node, frequency: linkCount[linkID] });
      }

      if (linkCount[linkID] > max) max = linkCount[linkID];
    }

    self.circles = circles;
    self.links = links;
    self.linkClassNameList = linkClassNameList;
  },
  drawNodeLinkDiagram: function (top, left) {
    var self = this;

    self.moveView(top, left);
    self.createCircleLinks();
    self.createLinks();
    self.createNodes();
    self.createLabels();
  },
  moveView: function (top, left) {
    var windowWidth = $(window).width();
    var scrollLeft = $(window).scrollLeft();
    var nodeLinkDiagramWidth = $("#node-link-diagram").width();

    if (left + 20 + nodeLinkDiagramWidth > windowWidth + scrollLeft)
      left = windowWidth + scrollLeft - nodeLinkDiagramWidth - 30;

    $("#node-link-diagram")
      .css("display", "block")
      .css("left", left + 20)
      .css("top", top + 20);
  },
  createCircleLinks: function () {
    var self = this;

    // join
    var circleLinks = self.linkLayer.selectAll("circle").data(self.circles);

    // enter
    circleLinks
      .enter()
      .append("circle")
      .attr("r", 8)
      .style("stroke", "gray")
      .style("fill", "none")
      .style("opacity", 0.4);

    // update
    d3.selectAll("#node-link-diagram .link-layer circle")
      .attr("cx", function (d) {
        return d.node.x;
      })
      .attr("cy", function (d) {
        return d.node.y;
      })
      .style("stroke-width", function (d) {
        return self.strokeScale(d.frequency);
      });

    circleLinks.exit().remove();
  },
  createLinks: function () {
    var self = this;

    // join
    var links = self.linkLayer.selectAll("line").data(self.links);

    // enter
    links.enter().append("line").style("stroke", "gray").style("opacity", 0.4);

    // update
    d3.selectAll("#node-link-diagram .link-layer line")
      .attr("x1", function (d) {
        return d.source.x;
      })
      .attr("y1", function (d) {
        return d.source.y;
      })
      .attr("x2", function (d) {
        return d.target.x;
      })
      .attr("y2", function (d) {
        return d.target.y;
      })
      .style("stroke-width", function (d) {
        return self.strokeScale(d.frequency);
      });

    links.exit().remove();
  },
  createNodes: function () {
    var self = this;

    // join
    var nodes = self.nodeLayer.selectAll("circle").data(self.nodes);

    // enter
    nodes.enter().append("circle").style("stroke", "#d3d3d3");

    // update
    d3.selectAll("#node-link-diagram .node-layer circle")
      .attr("r", function (d) {
        var isFocalNode = d.name == null;
        var radius = isFocalNode ? 10 : 5;
        return radius;
      })
      .attr("cx", function (d) {
        return d.x;
      })
      .attr("cy", function (d) {
        return d.y;
      })
      .style("fill", function (d) {
        return d.colour;
      });

    nodes.exit().remove();
  },
  createLabels: function () {
    var self = this;

    // join
    var labels = self.labelLayer.selectAll("text").data(self.nodes);

    // enter
    labels.enter().append("text").style("fill", "black");

    // update
    d3.selectAll("#node-link-diagram .label-layer text")
      .attr("transform", function (d) {
        if (!d.name) return null;

        var newX = self.centre.x + (d.x - self.centre.x) * 1.15;
        var newY = self.centre.y + (d.y - self.centre.y) * 1.15;
        var rotate = "rotate(" + d.textAngle + ")";
        var translate = "translate(" + newX + "," + newY + ")";

        return translate + rotate;
      })
      .style("text-anchor", function (d) {
        if (!d.name) return null;

        if (d.flip) return "end";
        else return "start";
      })
      .style("alignment-baseline", "middle")
      .text(function (d) {
        if (!d.name) return null;

        var name =
          d.name.length > self.maxLabelLength
            ? d.name.substring(0, self.maxLabelLength) + "..."
            : d.name;
        return name;
      });

    labels.exit().remove();
  },
  hideNodeLinkDiagram: function () {
    $("#node-link-diagram").css("display", "none");
  },
};
