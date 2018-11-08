var IntervalEventEditor = {
	// input
	currentAttribute: null,

	// dimension
	sliderLeftPadding: 10,
	sliderRightPadding: 30,
	sliderFirstColumnWidth: null,
	sliderWidth: {
		"Slope": null,
		"Time period": null,
		"Noise": null
	},
	sliderHeight: {
		"Slope": 20,
		"Time period": 10,
		"Noise": 10
	},

	// others
	isInt: {
		"Slope": false,
		"Time period": true,
		"Noise": false
	},
	brush: {},

	init: function(attribute) {
		var self = this;

		// remove the previous widgets
		EventView.removeEventEditor();
		EgoNetworkView.removeDebugRect();

		// initialization
		self.currentAttribute = attribute;
		self.sliderFirstColumnWidth = (eventViewWidth - EventView.margin.left - EventView.margin.right) / 3 * 2;
		self.sliderWidth["Slope"] = self.sliderFirstColumnWidth - self.sliderLeftPadding - self.sliderRightPadding;
		self.sliderWidth["Time period"] = self.sliderFirstColumnWidth / 2 - self.sliderLeftPadding - self.sliderRightPadding;
		self.sliderWidth["Noise"] = self.sliderFirstColumnWidth / 2 - self.sliderLeftPadding - self.sliderRightPadding;

		self.editorSVG = EventView.eventEditorSvg.append("g")
			.attr("class", "editor")
			.attr("transform", "translate(" + self.sliderLeftPadding + "," + EventView.brushY + ")");
	},
	createControls: function() {
		var self = this;

		self.brushCreator.createSlopeBrush();
		self.brushCreator.createTimePeriodBrush();
		self.brushCreator.createNoiseBrush();		
	},
	createEventTagInEditor: function() {
		var self = this;

		var newEventName = "\"" + self.currentAttribute + "\"" + " interval event";
		EventView.storeEventName(newEventName);
		EventView.checkIfCurrentEventAdded();

		// create group
		var editorEventTag = EventView.eventEditorSvg.append("g")
			.attr("class", "editor-event-tag");

		// draw rect
		editorEventTag.append("rect")
			.attr("class", "event-colour")
			.attr("width", EventView.circleRadius * 2)
			.attr("height", EventView.circleRadius * 2)
			.attr("x", 10 - 5)
			.attr("y", EventView.tagY - 5)
			.style("stroke", "black")
			.style("fill", EventView.newEventColour);

		// draw text
		editorEventTag.append("text")
			.attr("class", "event-name")
			.attr("x", 25)
			.attr("y", EventView.tagY)
			.style("text-anchor", "start")
			.style("alignment-baseline", "central")
			.style("font-size", 12)
			.style("cursor", "pointer")
			.text(EventView.currentEventName)
			.on("click", EventView.editEventName);;

		// draw add button
		var addButton = editorEventTag.append("g")
			.attr("class", "add-button")
			.attr("transform", "translate(" + EventView.addButtonXTranslate + ", " + EventView.tagY + ")")
			.style("display", "none")
			.style("cursor", "pointer")
			.on("click", self.clickAddButton);
		var addButtonSvgText = addButton.append("text")
			.attr("x", 0)
			.attr("y", 0)
			.style("text-anchor", "middle")
			.style("alignment-baseline", "central")
			.style("font-size", 15)
			.text(EventView.addButtonText);
		var bbox = addButtonSvgText[0][0].getBBox()
		addButton.insert("rect", "text")
			.attr("width", bbox.width + 4)
			.attr("height", bbox.height + 4)
			.attr("x", bbox.x - 2)
			.attr("y", bbox.y - 2)
			.style("rx", 5)
			.style("ry", 5)
			.style("fill", "#e5e5e5");
	},
	brushCreator: {
		createSlopeBrush: function() {
			var self = IntervalEventEditor;

			var trueStartValue = Math.round(Database.slopeRangeDict[self.currentAttribute][0] * 1.5 * 10) / 10;
			var trueEndValue = Math.round(Database.slopeRangeDict[self.currentAttribute][1] * 1.5 * 10) / 10;
			var endPadding = (trueEndValue - trueStartValue) / 18;
			var startValue = trueStartValue - endPadding;
			var endValue = trueEndValue + endPadding;

			var name = "Slope";
			var className = "Slope";
			var x = 0;

			self.brush[name] = self.brushCreator.createBrush(name, x, -3, startValue, endValue);
			
			self.brush[name]
				.on("brush", function() { self.brushCreator.onBrushMove(this); })
				.on("brushend", function() { self.brushCreator.onBrushEnd(this); });

			// modify the brush appearance to include upper and lower bound line
			var xScale = d3.scale.linear()
				.domain([startValue, endValue])
				.range([0, self.sliderWidth[name]]);

			self.editorSVG.select("." + className + ".brush .overall-lower-bound")
				.attr("x", xScale(trueStartValue))
				.text(trueStartValue);
			self.editorSVG.select("." + className + ".brush .overall-upper-bound")
				.attr("x", xScale(trueEndValue))
				.text(trueEndValue);

			self.editorSVG.select("." + className + ".brush").append("line")
				.attr("x1", xScale(trueStartValue))
				.attr("x2", xScale(trueStartValue))
				.attr("y1", 0)
				.attr("y2", self.sliderHeight[name])
				.style("stroke", "gray")
				.style("stroke-width", 1);
			self.editorSVG.select("." + className + ".brush").append("line")
				.attr("x1", xScale(trueEndValue))
				.attr("x2", xScale(trueEndValue))
				.attr("y1", 0)
				.attr("y2", self.sliderHeight[name])
				.style("stroke", "gray")
				.style("stroke-width", 1);
		},
		createTimePeriodBrush: function() {
			var self = IntervalEventEditor;

			var startValue = 1;
			var endValue = Database.numberOfTimeSteps - 1;
			var name = "Time period";
			var x = self.sliderFirstColumnWidth;

			self.brush[name] = self.brushCreator.createBrush(name, x, -20 + 4, startValue, endValue); // 10 = bar height / 2

			self.brush[name]
				.on("brush", function() { self.brushCreator.onBrushMove(this); })
				.on("brushend", function() { self.brushCreator.onBrushEnd(this); });
		},
		createNoiseBrush: function() {
			var self = IntervalEventEditor;

			var startValue = 0;
			var endValue = 1;
			var name = "Noise";
			var className = "Noise";
			var x = self.sliderFirstColumnWidth;

			self.brush[name] = self.brushCreator.createBrush(name, x, 20, startValue, endValue); // 10 = bar height / 2

			self.brush[name]
				.on("brush", function() { self.brushCreator.onBrushMove(this); })
				.on("brushend", function() { self.brushCreator.onBrushEnd(this); });

			// change noise brush extent
			self.brush[name].extent([0, 0.03]);

			self.editorSVG.select(".brush." + className + " .extent")
		    	.attr("width", self.brush[name].x()(0.03));
		    self.editorSVG.selectAll("." + className + ".brush .resize")
		  		.style("display", null);
		    self.editorSVG.select("." + className + ".brush .resize.e")
		  		.attr("transform", "translate(" + self.brush[name].x()(0.03) + ",0)");
		    self.editorSVG.select("." + className + ".brush .brush-lower-bound")
		  		.text(self.brush[name].extent()[0]);
		  	self.editorSVG.select("." + className + ".brush .brush-upper-bound")
		  		.text(self.brush[name].extent()[1]);
		},
		createBrush: function(name, xColumnShift, yTranslate, startValue, endValue) {
			var self = IntervalEventEditor;

			var xScale = d3.scale.linear()
				.domain([startValue, endValue])
				.range([0, self.sliderWidth[name]]);
			var brush = d3.svg.brush()
		        .x(xScale);
		    var className = name.split(" ").join("-");

		    // create brush
		    var brushGroup = self.editorSVG.append("g")
		    	.attr("brush-name", name)
		    	.attr("class", "brush " + className)
		    	.attr("transform", "translate(" + (xColumnShift + self.sliderLeftPadding) + ", " + yTranslate + ")")
		    	.call(brush);

		    // draw the brush background
		    brushGroup.selectAll("rect")
		    	.attr("height", self.sliderHeight[name]);
		    brushGroup.select(".background")
		    	.style("visibility", null);

		    // draw the name
		    brushGroup.append("text")
				.attr("x", self.sliderWidth[name] / 2)
				.attr("y", self.sliderHeight[name] + 1)
				.style("text-anchor", "middle")
				.style("alignment-baseline", "text-before-edge")
				.text(name);

			// draw the overall range
			brushGroup.append("text")
		  		.attr("class", "overall-lower-bound")
				.attr("x", 0)
				.attr("y", self.sliderHeight[name] + 10)
				.style("text-anchor", "middle")
				.style("alignment-baseline", "baseline")
				.text(startValue);
		  	brushGroup.append("text")
		  		.attr("class", "overall-upper-bound")
				.attr("x", self.sliderWidth[name])
				.attr("y", self.sliderHeight[name] + 10)
				.style("text-anchor", "middle")
				.style("alignment-baseline", "baseline")
				.text(endValue);

			// draw the range of the brush
			brushGroup.select(".resize.w").append("text")
				.attr("class", "brush-lower-bound")
				.attr("x", -3)
				.attr("y", self.sliderHeight[name] / 2)
				.style("text-anchor", "end")
				.style("alignment-baseline", "central");
		  	brushGroup.select(".resize.e").append("text")
		  		.attr("class", "brush-upper-bound")
				.attr("x", 3)
				.attr("y", self.sliderHeight[name] / 2)
				.style("text-anchor", "start")
				.style("alignment-baseline", "central");

			return brush;
		},
		onBrushMove: function(brushSVG) {
			var self = IntervalEventEditor;

			var name = d3.select(brushSVG).attr("brush-name");
			var className = name.split(" ").join("-");

			// determine new lower and upper bound
			var lowerBound, upperBound;
	  		if (self.isInt[name]) {
	  			lowerBound = self.brush[name].empty() ? null : Math.round(self.brush[name].extent()[0]);
	  			upperBound = self.brush[name].empty() ? null : Math.round(self.brush[name].extent()[1]);
	  		}
	  		else { // show two decimal place
	  			lowerBound = self.brush[name].empty() ? null : Math.round(self.brush[name].extent()[0] * 100) / 100;
	  			upperBound = self.brush[name].empty() ? null : Math.round(self.brush[name].extent()[1] * 100) / 100;
	  		}

	  		// change the lower bound and upper bound text
	  		self.editorSVG.select("." + className + ".brush .brush-lower-bound")
	  			.text(lowerBound);
	  		self.editorSVG.select("." + className + ".brush .brush-upper-bound")
	  			.text(upperBound);

	  		// slope > 1.5 = inf, percentage change < 0.5 = 0
	  		if (name == "Slope") {
	  			var brushLowerBound = self.brush[name].extent()[0];
	  			var brushUpperBound = self.brush[name].extent()[1];
	  			var lowerThreshold = Math.round(Database.slopeRangeDict[self.currentAttribute][0] * 1.5 * 10) / 10;
	  			var upperThreshold = Math.round(Database.slopeRangeDict[self.currentAttribute][1] * 1.5 * 10) / 10;

  				if (brushLowerBound < lowerThreshold) {
	  				self.editorSVG.select(".Slope.brush .brush-lower-bound")
	  					.text("-∞");
	  			}
	  			if (brushUpperBound > upperThreshold) {
	  				self.editorSVG.select(".Slope.brush .brush-upper-bound")
	  					.text("∞");
	  			}

	  			// update event tag
		  		if (lowerBound != null && upperBound != null) {
		  			var newEventName = "";

		  			if (lowerBound > 0 && upperBound > 0)
		  				newEventName = "\"" + self.currentAttribute + "\"" + " increases";
		  			if (lowerBound < 0 && upperBound < 0)
		  				newEventName = "\"" + self.currentAttribute + "\"" + " decreases";
		  			if (lowerBound < 0 && upperBound > 0)
		  				newEventName = "\"" + self.currentAttribute + "\"" + " is stable";

		  			EventView.storeEventName(newEventName);
		  		}
					  		
		  		EventView.checkIfCurrentEventAdded();
		  		EventView.updateEventEditor(); // assume event editor was created
	  		}
		},
		onBrushEnd: function(brushSVG) {
			var self = IntervalEventEditor;

			// allow event adding only when slope range is selected
			if (self.brush["Slope"].empty()) {
	  			EventView.eventEditorSvg.select(".add-button")
	  				.style("display", "none");
	  		}
	  		else {
	  			EventView.eventEditorSvg.select(".add-button")
	  				.style("display", null);
	  		}

	  		// draw debug rect
	  		EgoNetworkView.updateDebugRect();
		}
	},
	clickAddButton: function() {
		var self = IntervalEventEditor;

		if (EventView.addButtonText == "Added" || EventView.addButtonText == "Full")
			return;

		self.addEventToDatabase();
		EventView.registerNewEvent();
		EventView.addEventTagToEventPanel(false);
		MDSView.update();
		Table.updateEvents();

		// update the name
		var originalName = EventView.eventEditorSvg.select("text.event-name").text();
		var storedName = EventView.storeEventName(originalName);
		EventView.eventEditorSvg.select("text.event-name").text(storedName);
		EventView.checkIfCurrentEventAdded(); // change to added
		EventView.updateEventEditor();

		// update the debug rect
	  	EgoNetworkView.updateDebugRect();
	},
	addEventToDatabase: function() {
		var self = this;

		// get the parameter values
		var slopeRange = self.getSlopeRange();
		var timePeriodRange = self.getTimePeriodRange();
		var noiseRange = self.getNoiseRange();

		// adding new event
		for (var name in Database.timeSeriesRegressionDict[self.currentAttribute]) {
			var slopeArray = Database.timeSeriesRegressionDict[self.currentAttribute][name].slope;
			var outlierPercentArray = Database.timeSeriesRegressionDict[self.currentAttribute][name].outlierPercent;
			var maxIndex = slopeArray.length;
			var endPointOfLongestMatch = null;

			for (var i = 0; i < maxIndex; i++) {
				var timeIndices = Database.convertIndex2TimeIndices(i);
				var firstIndex = timeIndices[0];
				var secondIndex = timeIndices[1];
				var isMatch = true;

				// check if time period within range
				var outOfRange = secondIndex - firstIndex < timePeriodRange[0] || secondIndex - firstIndex >= timePeriodRange[1]; // upper bound not included
				if (outOfRange) {
					firstIndex++;
					secondIndex = firstIndex + 1;
					endPointOfLongestMatch = null;
					i = Database.convertTimeIndices2Index([firstIndex, secondIndex]);

					// jump!!!
					continue;
				}

				// check if slope falls into range
				var slope = slopeArray[i];
				if (slope < slopeRange[0] || slope >= slopeRange[1]) // upper bound not included
					isMatch = false;

				// check if outlier percentage falls into range
				var outlierPercent = outlierPercentArray[i];
				if (outlierPercent < noiseRange[0] || outlierPercent >= noiseRange[1]) // upper bound not included
					isMatch = false;

				// went through all the tests!! pattern matched, store second index of longest match
				if (isMatch)
					endPointOfLongestMatch = secondIndex;

				// store if it is the last item in the loop
				var lastItemInLoop = secondIndex == Database.numberOfTimeSteps - 1 || secondIndex == firstIndex + timePeriodRange[1];
				if (lastItemInLoop && endPointOfLongestMatch) {
					Database.appendEvent(EventView.currentEventName, Database.dateStringArray[firstIndex], Database.dateStringArray[endPointOfLongestMatch], name);
					
					firstIndex = endPointOfLongestMatch;
					secondIndex = firstIndex + 1;
					endPointOfLongestMatch = null;
					i = Database.convertTimeIndices2Index([firstIndex, secondIndex]);

					// jump!!!
					continue;
				}
			}
		}
	},
	getSlopeRange: function() {
		var self = this;

		var slopeRange = self.brush["Slope"].empty() ? null : self.brush["Slope"].extent();

		if (slopeRange) {
			var lowerThreshold = Math.round(Database.slopeRangeDict[self.currentAttribute][0] * 1.5 * 10) / 10;
  			var upperThreshold = Math.round(Database.slopeRangeDict[self.currentAttribute][1] * 1.5 * 10) / 10;

			// change to -Infinity and Infinity if needed
			slopeRange[0] = (slopeRange[0] < lowerThreshold) ? -Infinity : Math.round(slopeRange[0] * 100) / 100;
  			slopeRange[1] = (slopeRange[1] > upperThreshold) ? Infinity : Math.round(slopeRange[1] * 100) / 100;

  			return slopeRange;
		}
		
		return null;
	},
	getTimePeriodRange: function() {
		var self = this;

		var timePeriodRange = self.brush["Time period"].empty() ? null : self.brush["Time period"].extent();

		if (timePeriodRange) {
			timePeriodRange[0] = Math.round(timePeriodRange[0]);
			timePeriodRange[1] = Math.round(timePeriodRange[1]);
		}
		else {
			timePeriodRange = [1, Database.numberOfTimeSteps - 1];
		}

		return timePeriodRange;
	},
	getNoiseRange: function() {
		var self = this;

		var noiseRange = self.brush["Noise"].empty() ? null : self.brush["Noise"].extent();

		if (noiseRange) {
			noiseRange[0] = Math.round(noiseRange[0] * 100) / 100;
			noiseRange[1] = Math.round(noiseRange[1] * 100) / 100;
		}
		else {
			noiseRange = [0, 1];
		}

		return noiseRange;
	},
	createDebugRectData: function() {
		var self = this;

		debugEventsByName = {};

		// get the parameter values
		var slopeRange = self.getSlopeRange();
		var timePeriodRange = self.getTimePeriodRange();
		var noiseRange = self.getNoiseRange();

		if (slopeRange == null) { // should not draw rect
			self.debugEventsByName = debugEventsByName;
			self.debugEventColour = EventView.newEventColour;

			return;
		}

		EgoNetworkView.svgGroup.selectAll(".flow").each(function() {
			var currentName = d3.select(this).attr("name");
			debugEventsByName[currentName] = [];

			// adding new event
			var slopeArray = Database.timeSeriesRegressionDict[self.currentAttribute][currentName].slope;
			var outlierPercentArray = Database.timeSeriesRegressionDict[self.currentAttribute][currentName].outlierPercent;
			var maxIndex = slopeArray.length;
			var endPointOfLongestMatch = null;

			for (var i = 0; i < maxIndex; i++) {
				var timeIndices = Database.convertIndex2TimeIndices(i);
				var firstIndex = timeIndices[0];
				var secondIndex = timeIndices[1];
				var isMatch = true;

				// check if time period within range
				var outOfRange = secondIndex - firstIndex < timePeriodRange[0] || secondIndex - firstIndex >= timePeriodRange[1];
				if (outOfRange) {
					firstIndex++;
					secondIndex = firstIndex + 1;
					endPointOfLongestMatch = null;
					i = Database.convertTimeIndices2Index([firstIndex, secondIndex]);

					// jump!!!
					continue;
				}

				// check if slope falls into range
				var slope = slopeArray[i];
				if (slope < slopeRange[0] || slope >= slopeRange[1])
					isMatch = false;

				// check if outlier percentage falls into range
				var outlierPercent = outlierPercentArray[i];
				if (outlierPercent < noiseRange[0] || outlierPercent >= noiseRange[1])
					isMatch = false;

				// went through all the tests!! pattern matched, store second index of longest match
				if (isMatch)
					endPointOfLongestMatch = secondIndex;

				// store if it is the last item in the loop
				var lastItemInLoop = secondIndex == Database.numberOfTimeSteps - 1 || secondIndex == firstIndex + timePeriodRange[1];
				if (lastItemInLoop && endPointOfLongestMatch) {
					debugEventsByName[currentName].push({
						startDate: Database.dateStringArray[firstIndex],
						endDate: Database.dateStringArray[endPointOfLongestMatch]
					})
					
					firstIndex = endPointOfLongestMatch;
					secondIndex = firstIndex + 1;
					endPointOfLongestMatch = null;
					i = Database.convertTimeIndices2Index([firstIndex, secondIndex]);

					// jump!!!
					continue;
				}
			}
		});

		self.debugEventsByName = debugEventsByName;
		self.debugEventColour = EventView.newEventColour;
	}
}