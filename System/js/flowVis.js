var FlowVis = {
	allFlowSVG: null,
	thisFlowSVG: null,
	width: null, // width of the flow
	height: null, // height of the flow
	name: null,
	networkData: null,
	attributeData: null,
	numberOfNodessAtEachTimeStep: null,

	// colours
	areaColour: "#ededed",

    normalLinkColour: "#999999",
    nodeBorderColour: "#666666",

    // dimension for second layer
	gapBetweenNodes: 10,
	nodeWidth: 10,
	debugRectWidth: 20,

	// data for second layer
	nodes: [],
	links: [],

	// others
	tickHeight: 10,

	init: function(svg, width, height, name) {
		var self = this;

		self.allFlowSVG = svg;
		self.thisFlowSVG = svg.append("g")
			.attr("class", "flow-vis")
			.attr("cursor", "pointer");
		self.width = width;
		self.height = height;

		self.name = name;
		self.networkData = Database.networkDict[name];
		self.attributeData = Database.attributeDict[name];
		self.numberOfNodessAtEachTimeStep = self.returnNumberOfNodesAtEachTimeStep(name);
	},
	returnNumberOfNodesAtEachTimeStep: function(name) {
		var numberOfNodesAtEachTimeStep = [];
		var attributeListAtEachTimeStep = Database.attributeDict[name];

		for (var i = 0; i < attributeListAtEachTimeStep.length; i++) {
			var currentNumberOfAttributes = attributeListAtEachTimeStep[i].length;
			numberOfNodesAtEachTimeStep.push(currentNumberOfAttributes);
		}

		return numberOfNodesAtEachTimeStep;
	},
	createFirstLayer: function() {
		var self = this;

		self.firstLayer.createArea();
		self.firstLayer.translateFlow();
		self.firstLayer.createBackground();
	},
	createSecondLayer: function(hideLinks) {
		var self = this;

		self.secondLayer.createNodeArray();
		self.secondLayer.createLinkArray();
		self.secondLayer.createLinks(hideLinks);
		self.secondLayer.createNodes();
	},
	createLabels: function() {
		var self = this;

		var yTranslate = self.thisFlowSVG.node().getBBox().height + 20;

		// create dummy data for tick rendering
		var data = [];
		for (var i = 0; i < Database.numberOfTimeSteps; i++)
			data.push(i);

		// scale
		var xScale = d3.scale.linear()
			.domain(d3.extent(data))
			.range([0, self.width]);

		// create tick marks
		var tickGroup = self.allFlowSVG.append("g")
			.attr("class", "tick-group")
			.attr("transform", "translate(0," + yTranslate + ")");
		var tick = tickGroup.selectAll("g")
			.data(data)
			.enter()
			.append("g");

		tick.append("line")
			.attr("x1", function(d, i) {
				return xScale(i);
			})
			.attr("x2", function(d, i) {
				return xScale(i);
			})
			.attr("y1", 0)
			.attr("y2", self.tickHeight)
			.attr("stroke", "black")
			.attr("stroke-width", "1px");

		// create name label
		self.allFlowSVG.append("text")
  			.attr("class", "name-label")
			.text(self.name + " (" + Database.employeeDict[self.name] + ")")
			.attr("x", 0)
			.attr("y", yTranslate + 70)
			.style("text-anchor", "start")
			.style("font-size", 40);
	},
	updateFocus: function(className, timeIndex) {
		// remove focus
		d3.selectAll("#flow-view .flow-vis .start-focus").remove();
		d3.selectAll("#flow-view .flow-vis .end-focus").remove();

		// add focus
		var flowGroup = d3.select("#flow-view .flow." + className);
		var totalNumberOfTimePeriods = Database.numberOfTimeSteps - 1;
		var widthOfOneTimePeriod = (EgoNetworkView.canvasWidth - EgoNetworkView.margin.left - EgoNetworkView.margin.right) / totalNumberOfTimePeriods;

		var height = flowGroup.select(".flow-vis").node().getBBox().height;
		var firstStartX = 0;
		var firstEndX = (timeIndex - 1) * widthOfOneTimePeriod + widthOfOneTimePeriod / 2;
		var secondStartX = (timeIndex + 1) * widthOfOneTimePeriod - widthOfOneTimePeriod / 2;
		var secondEndX = (totalNumberOfTimePeriods + 1) * widthOfOneTimePeriod;

		if (flowGroup.select(".flow-vis").select(".start-focus").empty()) {
			flowGroup.select(".flow-vis")
				.append("rect")
				.attr("class", "start-focus");
		}

		if (flowGroup.select(".flow-vis").select(".end-focus").empty()) {
			flowGroup.select(".flow-vis")
				.append("rect")
				.attr("class", "end-focus");
		}

		flowGroup.select(".flow-vis .start-focus")
			.attr("x", firstStartX)
			.attr("y", - height / 2)
			.attr("width", firstEndX - firstStartX)
			.attr("height", height)
			.style("fill", "white")
			.style("opacity", 0.8);

		flowGroup.select(".flow-vis .end-focus")
			.attr("x", secondStartX)
			.attr("y", - height / 2)
			.attr("width", secondEndX - secondStartX)
			.attr("height", height)
			.style("fill", "white")
			.style("opacity", 0.9);
	},
	removeFocus: function() {
		var self = this;
		d3.selectAll("#flow-view .flow-vis .start-focus").remove();
		d3.selectAll("#flow-view .flow-vis .end-focus").remove();

		if (StateHandler.egoClassName != null && StateHandler.timeIndex != null) {
			var className = StateHandler.egoClassName.substring(1);
			var timeIndex = StateHandler.timeIndex;
			self.updateFocus(className, timeIndex);
		}
	},
	firstLayer: {
		createArea: function() {
			var self = FlowVis;

			var maxSize = d3.max(self.networkData, function(d, i) {
				return d.size;
			});
			var xScale = d3.scale.linear()
				.domain([0, self.networkData.length - 1])
				.range([0, self.width]);
			var sizeScale = d3.scale.linear()
				.domain([0, maxSize])
				.range([0, self.height]);

			// create area chart
			var area = d3.svg.area()
				.interpolate("monotone")
				.x(function(d, i) {
					return xScale(i);
				})
				.y0(function(d, i) {
	            	var paddingForNodes = 0;

	            	if (self.numberOfNodessAtEachTimeStep[i] > 0)
	            		paddingForNodes = 2 * self.gapBetweenNodes + (self.numberOfNodessAtEachTimeStep[i] - 1) * self.gapBetweenNodes;

	            	return (sizeScale(d.size) + paddingForNodes) / 2; 
	            })
	            .y1(function(d, i) {
	            	var paddingForNodes = 0;

	            	if (self.numberOfNodessAtEachTimeStep[i] > 0)
	            		paddingForNodes = 2 * self.gapBetweenNodes + (self.numberOfNodessAtEachTimeStep[i] - 1) * self.gapBetweenNodes;

	            	return (-sizeScale(d.size) - paddingForNodes) / 2;
	            });

	        // draw it
	        self.thisFlowSVG.append("path")
				.datum(self.networkData)
				.attr("class", "area")
				.attr("d", area)
				.attr("fill", self.areaColour);
		},
		translateFlow: function() {
			var self = FlowVis;
			var flowBBox = self.thisFlowSVG.node().getBBox(); // not use self.height as paddings were added

			self.thisFlowSVG.attr("transform", "translate(0, " + (flowBBox.height / 2) + ")");
		},
		createBackground: function() {
			var self = FlowVis;
			var flowBBox = self.thisFlowSVG.node().getBBox(); // not use self.height as paddings were added

			self.thisFlowSVG.insert("rect", ":first-child")
				.attr("width", self.width)
				.attr("height", flowBBox.height)
				.attr("x", 0)
				.attr("y", -flowBBox.height / 2)
				.style("fill", "white")
				.style("stroke", "none")
				.style("opacity", 0);
		}
	},
	secondLayer: {
		nodesForEachTimeStep: [],

		createNodeArray: function() {
			var self = FlowVis;
			self.secondLayer.nodesForEachTimeStep = [];

			var totalNumberOfTimeStep = Database.numberOfTimeSteps;

			// * create node array
			var nodes = [];
			var xScale = d3.scale.linear()
				.domain([0, totalNumberOfTimeStep - 1])
				.range([0, self.width]);

			var maxSize = d3.max(self.networkData, function(d, i) { return d.size; });
			var flowSizeScale = d3.scale.linear()
            	.domain([0, maxSize])
            	.range([0, self.height]);

            for (var i = 0; i < self.attributeData.length; i++) {
            	var paddingForNodes = 0;
            	var currentNumberOfNodes = self.attributeData[i].length;
            	var nodesForThisTimeStep = [];

            	if (currentNumberOfNodes > 0)
            		paddingForNodes = 2 * self.gapBetweenNodes + (currentNumberOfNodes - 1) * self.gapBetweenNodes;

            	var widthOfFlow = flowSizeScale(self.networkData[i].size) + paddingForNodes;

            	// should have padding between, top and bottom
            	var widthOfFlowMinusGap = widthOfFlow - (currentNumberOfNodes * self.gapBetweenNodes + self.gapBetweenNodes);

            	// sum of frequency
            	var sumOfFreq = 0;
            	for (var j = 0; j < self.attributeData[i].length; j++)
					sumOfFreq += self.attributeData[i][j].frequency;

				var sizeScale = d3.scale.linear()
					.domain([0, sumOfFreq])
					.range([0, widthOfFlowMinusGap]);

				// create node array for the current time step
				var y = -widthOfFlow / 2; // 0 is the bottom of stream, start the top of the stream
				for (var j = 0; j < self.attributeData[i].length; j++) { // loop through all clusters at a time step
					var nodeHeight = sizeScale(self.attributeData[i][j].frequency);
					var x = xScale(i);
					y += self.gapBetweenNodes + nodeHeight / 2;
					var positionIndex = Database.position2Index[self.attributeData[i][j].position];

					node = {
						timeStep: i,
						normalColour: Database.positionColours[positionIndex],
						height: nodeHeight,
						x: x,
						y: y,
						position: self.attributeData[i][j].position
					};

					nodes.push(node);
					nodesForThisTimeStep.push(node);
					y += nodeHeight / 2;
				}

				self.secondLayer.nodesForEachTimeStep.push(nodesForThisTimeStep);
            }

            self.nodes = nodes;
		},
		createLinkArray: function() {
			var self = FlowVis;
			var links = [];

			for (var i = 0; i < self.secondLayer.nodesForEachTimeStep.length - 1; i++) {
				for (var j = 0; j < self.secondLayer.nodesForEachTimeStep[i].length; j++) {
					var currentNode = self.secondLayer.nodesForEachTimeStep[i][j];
					var foundMatch = false;

					// for each node in current time step, loop through nodes in next time step
					for (var k = 0; k < self.secondLayer.nodesForEachTimeStep[i + 1].length; k++) {
						var nodeInNextTimeStep = self.secondLayer.nodesForEachTimeStep[i + 1][k];

						if (currentNode.position == nodeInNextTimeStep.position) {
							foundMatch = true;
							links.push({
								source: currentNode,
								target: nodeInNextTimeStep
							})

							break;
						}
					}
				}
			}

			self.links = links;
		},
		createLinks: function(hideLinks) {
			var self = FlowVis;

			var areaArray = self.links.map(function(d) {
	            var source1 = $.extend({}, d.source);
	            source1.x = source1.x;

	            var source2 = $.extend({}, d.source);
	            source2.x = source2.x + self.nodeWidth / 2;

	            var target1 = $.extend({}, d.target);
	            target1.x = target1.x - self.nodeWidth / 2;

	            var target2 = $.extend({}, d.target);
	            target2.x = target2.x;

	            return [source1, source2, target1, target2];
	        });

	        // pass an area array to it
	        var area = d3.svg.area()
	        	.x(function(d) { return d.x; })
	        	.y0(function(d) { return d.y - d.height / 2; })
	        	.y1(function(d) { return d.y + d.height / 2; })
	        	.interpolate("monotone");

	        self.thisFlowSVG.selectAll(".link")
	        	.data(areaArray)
	        	.enter()
	        	.append("path")
	        	.attr("class", function(d) {
	        		var source = d[0];
					return "link " + source.position.split(" ").join("-");
				})
	        	.attr("d", area)
	        	.attr("name", self.name) // for restoring color
	            .style("fill", function(d) {
	            	var source = d[0];
	            	return source.normalColour;
	            })
	            .style("stroke", "none");

	        // when users select the hide link button
	        if (hideLinks)
	        	self.thisFlowSVG.selectAll(".link")
	        		.style("opacity", 0);
		},
		createNodes: function() {
			var self = FlowVis;

			self.thisFlowSVG.selectAll(".node")
				.data(self.nodes)
				.enter()
				.append("rect")
				.attr("class", function(d) {
					return "node " + d.position.split(" ").join("-");
				})
	            .attr("width", self.nodeWidth)
	            .attr("height", function(d) {
	                return d.height;
	            })
	            .attr("x", function(d) { 
	                return d.x - self.nodeWidth / 2; 
	            })
	            .attr("y", function(d) {
	                return d.y - d.height / 2;
	            })
	            .attr("rx", "5")
	            .attr("ry", "5")
	            .style("fill", function(d) {
	                return d.normalColour;
	            })
	            .style("stroke", "none");
		}
	}
}