var MDSView = {
	margin: { top: 70, left: 30, bottom: 170, right: 30 },
	textMargin: { top: 30, left: 10 },

	width: null,
	height: null,

	labelSVG: null,
	nodeLayer: null,
	linkLayer: null,

	init: function() {
		var self = this;

		self.width = $("#scatterplot").width() - self.margin.left - self.margin.right;
		self.height = $("#scatterplot").height() - self.margin.top - self.margin.bottom;

		d3.select("#scatterplot").append("text")
			.attr("x", 0)
			.attr("y", -15)
			.attr("transform", "translate(" + self.textMargin.left + ", " + self.textMargin.top + ")")
			.style("font-weight", "bold")
			.text("Network View");

		self.initDistanceFunctionMenu();
		self.initClickOutside();
		self.initJitterButton();
		self.initHeatmapButton();
		self.initLabel();
		self.initNodeAndLinkLayers();
		self.restore(); // create attribute clusters using tSNE
	},
	initDistanceFunctionMenu: function() {
		var self = this;

		$("#mds-view .distance-function-menu select").on('change', changeDistanceFunction);

		function changeDistanceFunction() {
			var selectedDistance = $("#mds-view .distance-function-menu select").val();
			var isHeatmapSelected = d3.select("#scatterplot .heatmap-btn").classed("selected");

			if (Database.events.length != 0 && selectedDistance == 'euclidean') {
				ComparisonHandler.computeFeatureVectors();
				ComparisonHandler.computeScatterplotCoord();
				self.updateNodes(StateHandler.restoreState);
				if (isHeatmapSelected) Heatmap.show();
			}
			if (Database.events.length != 0 && selectedDistance == 'edit') {
				ComparisonHandler.computeEventArray();
				ComparisonHandler.computeScatterplotCoord_edit();
				self.updateNodes(StateHandler.restoreState);
				if (isHeatmapSelected) Heatmap.show();
			}
		}
	},
	initNodeAndLinkLayers: function() {
		var self = this;

		self.linkLayer = d3.select("#scatterplot").append("g")
			.attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");
		self.nodeLayer = d3.select("#scatterplot").append("g")
			.attr("transform", "translate(" + self.margin.left + "," + self.margin.top + ")");
	},
	initHeatmapButton: function() {
		var self = this;
		var networkViewWidth = $("#scatterplot").width();

		var heatmapButton = d3.select("#scatterplot")
			.append("g")
			.attr("class", "heatmap-btn")
			.style("cursor", "pointer")
			.on("click", clickHeatmapBtn);
		heatmapButton.append("text")
			.attr("x", -self.textMargin.left - 30)
			.attr("y", -15)
			.attr("transform", "translate(" + networkViewWidth + ", " + self.textMargin.top + ")")
			.style("text-anchor", "end")
			.text("Heatmap");
		var bbox = heatmapButton.select("text").node().getBBox();
		heatmapButton.insert("rect", ".heatmap-btn text")
			.attr("x", bbox.x - 2)
			.attr("y", bbox.y - 1)
			.attr("width", bbox.width + 4)
			.attr("height", bbox.height + 2)
			.attr("transform", "translate(" + networkViewWidth + ", " + self.textMargin.top + ")")
			.attr("rx", 3)
			.attr("ry", 3)
			.attr("fill", "#e5e5e5");

		function clickHeatmapBtn() {
			var heatmapSelected = d3.select(this).classed('selected');

			if (heatmapSelected) {
				d3.select(this).classed('selected', false);
				Heatmap.clear();
			}
			if (!heatmapSelected) {
				d3.select(this).classed('selected', true);
				Heatmap.show();
			}
		}
	},
	initJitterButton: function() {
		var self = this;
		var networkViewWidth = $("#scatterplot").width();

		var jitterButton = d3.select("#scatterplot")
			.append("g")
			.style("cursor", "pointer")
			.on("click", clickJitterBtn);
		jitterButton.append("text")
			.attr("class", "jitter-btn")
			.attr("x", -self.textMargin.left)
			.attr("y", -15)
			.attr("transform", "translate(" + networkViewWidth + ", " + self.textMargin.top + ")")
			.style("text-anchor", "end")
			.text("Jitter");
		var bbox = jitterButton.select("text").node().getBBox();
		jitterButton.insert("rect", ".jitter-btn")
			.attr("x", bbox.x - 2)
			.attr("y", bbox.y - 1)
			.attr("width", bbox.width + 4)
			.attr("height", bbox.height + 2)
			.attr("transform", "translate(" + networkViewWidth + ", " + self.textMargin.top + ")")
			.attr("rx", 3)
			.attr("ry", 3)
			.attr("fill", "#e5e5e5");

		function clickJitterBtn() {
			var isHeatmapSelected = d3.select("#scatterplot .heatmap-btn").classed("selected");

			ComparisonHandler.jitterScatterplotCoordForDisplay();
			MDSView.linkLayer.selectAll(".link").remove();
			self.updateNodes(StateHandler.restoreState);
			if (isHeatmapSelected) Heatmap.show();
		}
	},
	initClickOutside: function() {
		var self = this;
		var width = $("#scatterplot").width();
		var height = $("#scatterplot").height();

		d3.select("#scatterplot").insert("rect", ":first-child")
			.attr("class", "background")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", width)
			.attr("height", height)
			.style("fill", "white")
			.style("opacity", 0);

		d3.select("#scatterplot .background")
			.on("click", function() {
				var hasEvents = Database.events.length != 0;
				var inRadialLayout = !self.nodeLayer.select("circle.clicked").empty();

				if (hasEvents || inRadialLayout) {
					self.disableBackgroundPointerEvents();
					self.update();
				}
			});
	},
	initLabel: function() {
		var self = this;
		var labelTranslateY = self.height + self.margin.top + self.margin.bottom / 2;

		var xScale = d3.scale.linear()
			.domain([0, Database.dateStringArray.length - 1])
			.range([0, self.width]);

		// create group
		self.labelSVG = d3.select("#scatterplot").append("g")
			.attr("class", "timeline")
			.attr("transform", "translate(" + self.margin.left + "," + labelTranslateY + ")")
			.style("cursor", "pointer");

		// create line
		self.labelSVG.append("line")
			.attr("x1", 0)
			.attr("y1", 55)
			.attr("x2", self.width)
			.attr("y2", 55)
			.style("stroke", "#d3d3d3");

		// create circles
		self.labelSVG.selectAll("cirlce")
			.data(Database.dateStringArray)
			.enter()
			.append("circle")
			.attr("cx", function(d, i) {
				return xScale(i)
			})
			.attr("cy", 55)
			.attr("r", 5)
			.style("fill", "white")
			.style("stroke", "#d3d3d3")
			.on("click", self.clickDateLabel)
			.on("mouseenter", self.mouseenterDateLabel)
			.on("mouseleave", self.mouseleaveDateLabel);

		// create text
		var dateGroup = self.labelSVG.selectAll(".date")
			.data(Database.dateStringArray)
			.enter()
			.append("g")
			.attr("class", "date")
			.attr("transform", function(d, i) {
				return "translate(" + xScale(i) + ", 35)" + " rotate(-45)";
			})
			.on("click", self.clickDateLabel)
			.on("mouseenter", self.mouseenterDateLabel)
			.on("mouseleave", self.mouseleaveDateLabel);

		dateGroup.each(function(d) {
			// text
			var text = d3.select(this).append("text")
				.style("fill", "gray")
				.style("alignment-baseline", "middle")
				.text(function(d) {
					var parseDate = d3.time.format("%Y-%m").parse;
					var formatTime = d3.time.format("%b %y");
					var dateString = formatTime(parseDate(d));
					return dateString;
				});

			// rect
			var bbox = text.node().getBBox();
			d3.select(this).insert("rect", "text")
				.attr("x", bbox.x - 3)
				.attr("y", bbox.y - 6)
				.attr("width", bbox.width + 6)
				.attr("height", bbox.height + 6)
				.style("fill", "white");
		});
	},
	clickDateLabel: function(d, i) {
		var date = d;
		var timeIndex = i;
		var parseDate = d3.time.format("%Y-%m").parse;
		var timeFormat = d3.time.format("%b %y");
		var timeString = timeFormat(parseDate(date));
		
		StateHandler.addVisualLock("The entire network", timeString);
		StateHandler.storeState("entire", timeIndex);
	},
	mouseenterDateLabel: function(d) {
		var self = MDSView;
		var date = d;
		var timeIndex = 0;

		for (var i = 0; i < Database.dateStringArray.length; i++)
			if (d == Database.dateStringArray[i]) {
				timeIndex = i;
				break;
			}

		self.removeHighlightEgoNetwork();
		self.highlightTimeline(timeIndex);
		self.updateLinks(date);
	},
	mouseleaveDateLabel: function() {
		StateHandler.restoreState();
	},
	highlightTimeline: function(timeIndex) {
		var self = this;

		// restore all
		self.labelSVG.selectAll(".date")
			.style("font-size", null)
			.style("font-weight", null);
		self.labelSVG.selectAll("circle")
			.style("fill", "white");

		// text
		var targetText = self.labelSVG
			.selectAll(".date")[0][timeIndex];
		d3.select(targetText)
			.style("font-size", 13)
			.style("font-weight", "bold");

		// circle
		var targetCircle = self.labelSVG
			.selectAll("circle")[0][timeIndex];
		d3.select(targetCircle)
			.style("fill", "#d3d3d3");
	},
	removeHighlightTimeline: function() {
		var self = this;

		self.labelSVG.selectAll(".date")
			.style("font-size", null)
			.style("font-weight", null);
		self.labelSVG.selectAll("circle")
			.style("fill", "white");
	},
	restore: function() {
		var self = this;
		var isHeatmapSelected = d3.select("#scatterplot .heatmap-btn").classed("selected");

		ComparisonHandler.computeOriginalScatterplotCoord();
		self.updateNodes(StateHandler.restoreState);
		if (isHeatmapSelected) Heatmap.show();
	},
	update: function() {
		var self = this;
		var isHeatmapSelected = d3.select("#scatterplot .heatmap-btn").classed("selected");
		var selectedDistance = $("#mds-view .distance-function-menu select").val();

		MDSView.linkLayer.selectAll(".link").remove();

		if (Database.events.length == 0)
			self.restore();
		if (Database.events.length != 0 && selectedDistance == 'euclidean') {
			ComparisonHandler.computeFeatureVectors();
			ComparisonHandler.computeScatterplotCoord();
			self.updateNodes(StateHandler.restoreState);
			if (isHeatmapSelected) Heatmap.show();
		}
		if (Database.events.length != 0 && selectedDistance == 'edit') {
			ComparisonHandler.computeEventArray();
			ComparisonHandler.computeScatterplotCoord_edit();
			self.updateNodes(StateHandler.restoreState);
			if (isHeatmapSelected) Heatmap.show();
		}
	},
	updateNodes: function(callback) {
		var self = this;
		var onClickOrDblClickCircle = clickcancel()
			.on("click", clickCircle)
			.on("dblclick", dblClickCircle);

		// remove all clicked class
		self.nodeLayer.selectAll("circle")
			.classed("clicked", false);

		// join
		var circle = self.nodeLayer.selectAll("circle")
			.data(ComparisonHandler.scatterplotCoordForDisplay);

		// enter
		var circleEnter = circle.enter()
			.append("circle")
			.attr("r", 5)
			.style("stroke", "#d1d1d1")
			.style("opacity", 0.7)
			.style("cursor", "pointer")
			.on("mouseover", mouseoverCircle)
			.on("mouseout", mouseoutCircle)
			.call(onClickOrDblClickCircle);

		// update
		var n = 0;
		self.nodeLayer.selectAll("circle")
			.attr("class", function(d) {
				var position = Database.employeeDict[d.label].split(" ").join("-");
				var nameClassName = d.label.split(".").join("-");
				return position + " " + nameClassName;
			})
			.style("fill", function(d) {
				var position = Database.employeeDict[d.label];
				var positionIndex = Database.position2Index[position];
				var positionColour = Database.positionColours[positionIndex];
				return positionColour;
			})
			.transition()
			.attr("cx", function(d) {
				return d.x;
			})
			.attr("cy", function(d) {
				return d.y;
			})
			.each("start", function() { n++; })
			.each("end", function() {
				n--;
				if (!n) {
					self.restoreBackgroundPointerEvents();
					callback();
				}
			});
			
		// exit
		circle.exit().remove();

		function clickCircle(d) {
			var className = ".row." + d.label.split(".").join("-");

			// append selected to row
			if (!Table.svgGroup.select(className).classed("selected")) {
				Table.svgGroup.select(className).classed("selected", true);
				EgoNetworkView.createFlow(d.label);
			}
			else {
				Table.svgGroup.select(className).classed("selected", false);
				EgoNetworkView.removeFlow(d.label);
			}
		}

		function dblClickCircle(clickedCircleData) {
			var clickedCircleEl = this;
			var totalNumberOfCircle = Database.nameList.length;
			var angleOfEachSlice = (Math.PI * 2) / (totalNumberOfCircle - 1);
			var centreX = self.width / 2;
			var centreY = self.height / 2;
			var i = 0;
			var labelToDistanceDict = {};
			var maxDistance = -999;
			var isHeatmapSelected = d3.select("#scatterplot .heatmap-btn").classed("selected");
			var allCoords = [];

			// create labelToDistanceDict
			if (Database.events.length != 0) {
				for (var theOtherLabel in ComparisonHandler.featureVectors) {
					if (theOtherLabel != clickedCircleData.label) {
						var clickedFeatureVector = ComparisonHandler.featureVectors[clickedCircleData.label];
						var theOtherFeatureVector =  ComparisonHandler.featureVectors[theOtherLabel];
						var distance = ComparisonHandler.computeVectorDistance(clickedFeatureVector, theOtherFeatureVector);

						labelToDistanceDict[theOtherLabel] = distance;

						if (distance > maxDistance)
							maxDistance = distance;
					}
				}
			}

			// clicked circle
			clickedCircleData.x = centreX;
			clickedCircleData.y = centreY;

			d3.select(this)
				.classed("clicked", true)
				.transition()
				.attr("r", 10)
				.attr("cx", centreX)
				.attr("cy", centreY);

			// other circles
			var radiusScale = d3.scale.linear()
				.domain([ 0, maxDistance ])
				.range([ 8, self.width / 2 ]);

			self.nodeLayer.selectAll("circle").each(function(d) {
				if (this != clickedCircleEl) {
					var currentRadius = (Database.events.length != 0) ? radiusScale(labelToDistanceDict[d.label]) : self.width / 2;
					var currentAngle = angleOfEachSlice * i;
					var currentX = currentRadius * Math.sin(currentAngle);
					var currentY = currentRadius * Math.cos(currentAngle);
					d.x = currentX + centreX;
					d.y = currentY + centreY;

					d3.select(this)
						.classed("clicked", false)
						.transition()
						.attr("r", 5)
						.attr("cx", currentX + centreX)
						.attr("cy", currentY + centreY);

					allCoords.push({ x: currentX + centreX, y: currentY + centreY });
					i++;
				}
			});

			if (isHeatmapSelected)
				Heatmap.show(allCoords);
		}

		function mouseoverCircle(d) {
			// * draw text

			// get the x y position of the hovered circle
			var circleX = parseInt(d3.select(this).attr("cx"));
			var circleY = parseInt(d3.select(this).attr("cy"));

			var newPixelGroupLeftRightPadding = 15;
			var pixelGroupWidth = Table.columnWidth[2] - Table.pixelGroupLeftRightPadding * 2 + newPixelGroupLeftRightPadding * 2;
				
			// * draw pixel display
			var pixelHeight = (Table.maxPixelGroupsHeight - (EventView.maxNumberOfEvents - 1)) / EventView.maxNumberOfEvents; // 6 = gap numbers x gap pixels
			var pixelWidth = 4;
			var paddingBetweenPixel = (Table.columnWidth[2] - Table.pixelGroupLeftRightPadding - Table.pixelGroupLeftRightPadding - pixelWidth * Database.numberOfTimeSteps) / (Database.numberOfTimeSteps - 1)
			var pixelXAndWidthScale = d3.scale.linear()
				.domain([0, Database.numberOfTimeSteps - 1])
				.range([0, pixelGroupWidth - newPixelGroupLeftRightPadding - newPixelGroupLeftRightPadding]);

			if (circleX + pixelGroupWidth > self.width)
				circleX = circleX - pixelGroupWidth - 20;

			// retrieve the events of that person
			var nameOfSelectedPerson = d.label;
			var eventsOfSelectedPerson = [];
			for (var i = 0; i < Database.events.length; i++) {
				if (Database.events[i].name == nameOfSelectedPerson)
					eventsOfSelectedPerson.push(Database.events[i])
			}

			// construct event group array
			var eventsByEventName = d3.nest()
				.key(function(event) {
					return event.eventName;
				})
				.map(eventsOfSelectedPerson);

			var eventGroupArray = [];
			for (var eventName in eventsByEventName)
				eventGroupArray.push(eventsByEventName[eventName]);

			// append the pixel display group
			var currentEventPixelGroup = self.nodeLayer
				.append("g")
				.attr("id", "current-pixel-group")
				.attr("transform", "translate(" + (circleX + 10) + ", " + (circleY - 30) + ")");

			// append text label
			currentEventPixelGroup.append("text")
				.attr("x", 2)
				.attr("y", -5)
				.text(d.label + ": " + Database.employeeDict[d.label]);

			// append the bottom rectangle
			currentEventPixelGroup.append("rect")
				.attr("width", pixelGroupWidth)
				.attr("height", Table.rowHeight)
				.attr("rx", 3)
				.attr("ry", 3)
				.style("fill", "white")
				.style("stroke", "black");

			// append the pixels on top
			var currentPixelGroup = currentEventPixelGroup.selectAll("g")
				.data(eventGroupArray)
				.enter()
				.append("g")
				.attr("transform", function(d, i) {
					var yTranslate = Table.maxPixelGroupsHeight - (i + 1) * (pixelHeight + 1);
					return "translate(" + newPixelGroupLeftRightPadding + ", " + yTranslate + ")";
				});

			currentPixelGroup.selectAll("rect")
				.data(function(d) {
					return d;
				})
				.enter()
				.append("rect")
				.attr("width", function(d) {
					var startTimeIndex = Database.dateString2Index[d.startDate];

					if (d.endDate) {
						var endTimeIndex = Database.dateString2Index[d.endDate];
						return pixelXAndWidthScale(endTimeIndex - startTimeIndex) - paddingBetweenPixel;
					}
					else {
						return pixelWidth;
					}
				})
				.attr("height", pixelHeight)
				.attr("x", function(d) {
					return pixelXAndWidthScale(Database.dateString2Index[d.startDate]) + paddingBetweenPixel / 2;
				})
				.attr("y", 0.5) // 0.5 is the top padding
				.style("fill", function(d) {
					var eventIndex = EventView.event2Index[d.eventName];

					return EventView.colours(eventIndex);
				});
		}

		function mouseoutCircle(d) {
			// remove text and pixel display
			d3.select("#current-pixel-group").remove();
		}
	},
	updateLinks: function(date) {
		var self = this;

		// compute coordinate of labels
		var labelCoord = {};
		for (var i = 0; i < ComparisonHandler.scatterplotCoordForDisplay.length; i++) {
			var currentNode = ComparisonHandler.scatterplotCoordForDisplay[i];
			labelCoord[currentNode.label] = {
				x: currentNode.x,
				y: currentNode.y
			}
		}

		// count link frequency
		var links = {};
		for (var i = 0; i < Database.dateToLinkDict[date].length; i++) {
			var source = Database.dateToLinkDict[date][i].source;
			var target = Database.dateToLinkDict[date][i].target;

			var first = (source < target) ? source : target;
			var second = (source < target) ? target : source;
			var linkString = first + "-" + second;

			if (linkString in links)
				links[linkString]++;
			else
				links[linkString] = 1;
		}

		// generate link data
		var linkData = [];
		var circleData = [];
		for (linkID in links) {
			var sourceLabel = linkID.split("-")[0];
			var targetLabel = linkID.split("-")[1];
			var className = sourceLabel.split(".").join("-") + " " + targetLabel.split(".").join("-");

			if (sourceLabel != targetLabel) {
				var linkObject = {
					source: { x: labelCoord[sourceLabel].x, y: labelCoord[sourceLabel].y },
					target: { x: labelCoord[targetLabel].x, y: labelCoord[targetLabel].y }
				}
				var pathData = linkArc(linkObject);
				var weight = links[linkID];

				linkData.push({
					path: pathData,
					weight: weight,
					className: className
				});
			}

			// draw circle for nodes which connect to themselves
			else {
				var weight = links[linkID];

				circleData.push({
					x: labelCoord[sourceLabel].x,
					y: labelCoord[sourceLabel].y,
					weight: weight,
					className: className
				});
			}
		}

		// draw link
		var strokeScale = d3.scale.linear()
			.domain([1, Database.maxLinkCountToANode])
			.range([1, 8]);

		var linkSVG = self.linkLayer.selectAll("path.link")
			.data(linkData);

		linkSVG.enter()
			.append("path")
			.attr("class", "link")
			.style("fill", "none")
			.style("stroke", "#d1d1d1");

		self.linkLayer.selectAll(".link")
			.attr("class", function(d) { return d.className + " link"; })
			.attr("d", function(d) { return d.path; })
			.style("stroke-width", function(d) {
				return strokeScale(d.weight); 
			})
			.style("opacity", 0.7);

		linkSVG.exit().remove();

		// draw circle
		var linkSVG = self.linkLayer.selectAll("circle.link")
			.data(circleData);

		linkSVG.enter()
			.append("circle")
			.attr("class", "link")
			.attr("r", 8)
			.style("fill", "none")
			.style("stroke", "#d1d1d1");

		self.linkLayer.selectAll("circle.link")
			.attr("class", function(d) { return d.className + " link"; })
			.attr("cx", function(d) {
				return d.x; 
			})
			.attr("cy", function(d) {
				return d.y;
			})
			.style("stroke-width", function(d) {
				return strokeScale(d.weight);
			});

		function linkArc(d) {
		  var dx = d.target.x - d.source.x,
		      dy = d.target.y - d.source.y,
		      dr = Math.sqrt(dx * dx + dy * dy);
		  return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
		}
	},
	highlightEgoNetwork: function(nodeClassNameList, linkClassNameList, egoClassName = null) {
		var self = this;

		// remove all other highlights
		self.linkLayer.selectAll(".link")
			.style("opacity", 0.05);
		self.nodeLayer.selectAll("circle")
			.attr("r", 5)
			.style("opacity", 0.05);

		// highlight nodes
		for (var i = 0; i < nodeClassNameList.length; i++) {
			self.nodeLayer.select("circle" + nodeClassNameList[i])
				.style("opacity", 0.7);
		}

		// highlight links
		for (var i = 0; i < linkClassNameList.length; i++) {
			self.linkLayer.select(linkClassNameList[i] + ".link")
				.style("opacity", 0.7);
		}

		// highlight ego
		if (egoClassName != null)
			self.nodeLayer.select("circle" + egoClassName)
				.attr("r", 10);
	},
	removeHighlightEgoNetwork: function() {
		var self = this;

		self.linkLayer.selectAll(".link")
			.style("opacity", 0.7);
		self.nodeLayer.selectAll("circle")
			.attr("r", 5)
			.style("opacity", 0.7);
		self.nodeLayer.selectAll("circle.clicked")
			.attr("r", 10)
	},
	restoreBackgroundPointerEvents: function() {
		d3.select("#scatterplot .background")
			.style("pointer-events", null);
	},
	disableBackgroundPointerEvents: function() {
		d3.select("#scatterplot .background")
			.style("pointer-events", "none");
	}
}