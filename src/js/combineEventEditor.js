var CombineEventEditor = {
	eventCombinationNextX: 20, // needs to be updated
	numberOfEventCombined: 0, // needs to be updated
	eventCombinationY: 30,
	maxEventCombination: 5,
	paddingBetweenEvents: null, // init in event view

	// debug rect
	debugEventsByName: null,
	debugEventColour: null,

	init: function() {
		var self = this;

		// remove the previous widgets
		EventView.removeEventOptions();
		EventView.removeEventEditor();
		EgoNetworkView.removeDebugRect();

		// restore the title
		EventView.eventEditorSvg.select(".event-editor-text")
			.text("Event Editor");

		// init
		EventViewRightClickHandler.selectedOption = null; // called when enter for the first time, changed to combine only when number >= 2
		self.paddingBetweenEvents = (EventView.eventEditorWidthMinusPadding - self.eventCombinationNextX * 2) / (self.maxEventCombination - 1);
		
		EventView.eventEditorSvg.append("g")
			.attr("class", "editor");
	},
	updateControl: function(width, height, fill, name) { // add the symbol to event editor
		var self = this;
		
		if (self.numberOfEventCombined < self.maxEventCombination) {
			// draw symbol
			var dragCombinedEventSymbol = d3.behavior.drag()
				.on("dragstart", self.onDragStartSymbol)
				.on("drag", self.onDragSymbol)
				.on("dragend", self.onDragEndSymbol);

			EventView.eventEditorSvg.select(".editor").append("rect")
				.attr("class", "combined-event")
				.attr("x", self.eventCombinationNextX - width / 2)
				.attr("y", self.eventCombinationY)
				.attr("height", height)
				.attr("width", width)
				.attr("name", name)
				.style("fill", fill)
				.style("stroke", "black")
				.style("cursor", "pointer")
				.on("mouseover", self.onMouseOverSymbol)
				.on("mouseout", self.onMouseOutSymbol)
				.call(dragCombinedEventSymbol);

			// add the number of time periods in between
			if (self.numberOfEventCombined > 0) {
				EventView.eventEditorSvg.select(".add-button")
					.style("display", null);

				EventView.eventEditorSvg.select(".editor").append("text")
					.attr("class", "combined-event-interval")
					.attr("x", self.eventCombinationNextX - self.paddingBetweenEvents / 2)
					.attr("y", self.eventCombinationY + height / 2)
					.style("text-anchor", "middle")
					.style("alignment-baseline", "central")
					.style("cursor", "pointer")
					.text("<= 0 month")
					.on("click", self.onClickIntervalText);

				// create debug rect
				EventViewRightClickHandler.selectedOption = "Combine"; // when ego network is created next time, create debug rect
				EgoNetworkView.updateDebugRect();
			}

			// change the next x position
			self.eventCombinationNextX += self.paddingBetweenEvents;
			self.numberOfEventCombined++;
		}
	},
	createEventTagInEditor: function() {
		var self = this;

		EventView.storeEventName("Combined interval event")
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
	clickAddButton: function() {
		var self = CombineEventEditor;

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
		// retrieve event name and the interval in between
		var eventsToBeCombined = [];
		var intervalsBetweenEvents = [];

		EventView.eventEditorSvg.selectAll(".combined-event")
			.each(function() {
				eventsToBeCombined.push(d3.select(this).attr("name"));
			});
		EventView.eventEditorSvg.selectAll(".combined-event-interval")
			.each(function() {
				var interval = parseInt(d3.select(this).text().split(" ")[1]);
				intervalsBetweenEvents.push(interval);
			});

		// create combined events
		var eventsByNameAndEventName = d3.nest()
			.key(function(d) { return d.name; })
			.key(function(d) { return d.eventName; })
			.key(function(d) { return d.startDate; })
			.map(Database.events);

		for (var name in eventsByNameAndEventName) {
			for (var startDate in eventsByNameAndEventName[name][eventsToBeCombined[0]]) {
				var currentAnchorRecord = eventsByNameAndEventName[name][eventsToBeCombined[0]][startDate][0]; // no overlapping, safe to use [0]
				var currentAnchorRecordEndDate = currentAnchorRecord.endDate;
				var checkingEventIndex = 1;
				var checkingEvent = eventsToBeCombined[checkingEventIndex];

				var parseDate = d3.time.format("%Y-%m").parse;
				var lastTimeStep = Database.networkDict[Database.nameList[0]][Database.numberOfTimeSteps - 1].date;
				var currentDate = parseDate(currentAnchorRecordEndDate);
				var stopDate = parseDate(currentAnchorRecordEndDate);
				stopDate = new Date(stopDate.setMonth(stopDate.getMonth() + intervalsBetweenEvents[0]));
				var lastDate = parseDate(lastTimeStep);
				var startDateListOfCheckingEvent;
				var eventCombinationCount = 1;

				// the currently checking event may not exist in a person's event list
				if (checkingEvent in eventsByNameAndEventName[name])
					startDateListOfCheckingEvent = Object.keys(eventsByNameAndEventName[name][checkingEvent]);
				else
					break;

				// check if the start date list contains the current end date
				while (currentDate <= lastDate) {
					// not found
					if (currentDate > stopDate)
						break;

					// get currentDate string
					var year = currentDate.getYear() + 1900;
					var month = currentDate.getMonth() + 1;
					if (month < 10)
						month = "0" + month.toString();
					else
						month = month.toString();
					var currentDateString = year + "-" + month;

					// target found, update current date, stop date, currentEvent and start date list
					if ($.inArray(currentDateString, startDateListOfCheckingEvent) != -1) {
						// store the found combination if needed
						currentAnchorRecord = eventsByNameAndEventName[name][checkingEvent][currentDateString][0]; // no overlapping, safe to use [0]
						currentAnchorRecordEndDate = currentAnchorRecord.endDate;
						eventCombinationCount++;

						if (eventCombinationCount == eventsToBeCombined.length) {
							Database.appendEvent(EventView.currentEventName, startDate, currentAnchorRecordEndDate, name);
							break;
						}

						// update others
						checkingEventIndex++;
						checkingEvent = eventsToBeCombined[checkingEventIndex];

						currentDate = parseDate(currentAnchorRecordEndDate);
						stopDate = parseDate(currentAnchorRecordEndDate);
						stopDate = new Date(stopDate.setMonth(stopDate.getMonth() + intervalsBetweenEvents[eventCombinationCount - 1]));
						
						if (checkingEvent in eventsByNameAndEventName[name])
							startDateListOfCheckingEvent = Object.keys(eventsByNameAndEventName[name][checkingEvent]);
						else
							break;

						// current date updated already, don't update currentDate again
						continue;
					}

					currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
				}
			}
		}
	},
	createDebugRectData: function() {
		var self = this;

		debugEventsByName = {};

		// retrieve event name and the interval in between
		var eventsToBeCombined = [];
		var intervalsBetweenEvents = [];

		EventView.eventEditorSvg.selectAll(".combined-event")
			.each(function() {
				eventsToBeCombined.push(d3.select(this).attr("name"));
			});
		EventView.eventEditorSvg.selectAll(".combined-event-interval")
			.each(function() {
				var interval = parseInt(d3.select(this).text().split(" ")[1]);
				intervalsBetweenEvents.push(interval);
			});

		// create combined events
		var eventsByNameAndEventName = d3.nest()
			.key(function(d) { return d.name; })
			.key(function(d) { return d.eventName; })
			.key(function(d) { return d.startDate; })
			.map(Database.events);

		EgoNetworkView.svgGroup.selectAll(".flow").each(function() {
			var currentName = d3.select(this).attr("name");
			debugEventsByName[currentName] = [];

			if (!(currentName in eventsByNameAndEventName))
				return;

			for (var startDate in eventsByNameAndEventName[currentName][eventsToBeCombined[0]]) {
				var currentAnchorRecord = eventsByNameAndEventName[currentName][eventsToBeCombined[0]][startDate][0]; // no overlapping, safe to use [0]
				var currentAnchorRecordEndDate = currentAnchorRecord.endDate;
				var checkingEventIndex = 1;
				var checkingEvent = eventsToBeCombined[checkingEventIndex];

				var parseDate = d3.time.format("%Y-%m").parse;
				var lastTimeStep = Database.networkDict[Database.nameList[0]][Database.numberOfTimeSteps - 1].date;
				var currentDate = parseDate(currentAnchorRecordEndDate);
				var stopDate = parseDate(currentAnchorRecordEndDate);
				stopDate = new Date(stopDate.setMonth(stopDate.getMonth() + intervalsBetweenEvents[0]));
				var lastDate = parseDate(lastTimeStep);
				var startDateListOfCheckingEvent;
				var eventCombinationCount = 1;

				// the currently checking event may not exist in a person's event list
				if (checkingEvent in eventsByNameAndEventName[currentName])
					startDateListOfCheckingEvent = Object.keys(eventsByNameAndEventName[currentName][checkingEvent]);
				else
					break;

				// check if the start date list contains the current end date
				while (currentDate <= lastDate) {
					// not found
					if (currentDate > stopDate)
						break;

					// get currentDate string
					var year = currentDate.getYear() + 1900;
					var month = currentDate.getMonth() + 1;
					if (month < 10)
						month = "0" + month.toString();
					else
						month = month.toString();
					var currentDateString = year + "-" + month;

					// target found, update current date, stop date, currentEvent and start date list
					if ($.inArray(currentDateString, startDateListOfCheckingEvent) != -1) {
						// store the found combination if needed
						currentAnchorRecord = eventsByNameAndEventName[currentName][checkingEvent][currentDateString][0]; // no overlapping, safe to use [0]
						currentAnchorRecordEndDate = currentAnchorRecord.endDate;
						eventCombinationCount++;

						if (eventCombinationCount == eventsToBeCombined.length) {
							debugEventsByName[currentName].push({
								startDate: startDate,
								endDate: currentAnchorRecordEndDate
							});

							break;
						}

						// update others
						checkingEventIndex++;
						checkingEvent = eventsToBeCombined[checkingEventIndex];

						currentDate = parseDate(currentAnchorRecordEndDate);
						stopDate = parseDate(currentAnchorRecordEndDate);
						stopDate = new Date(stopDate.setMonth(stopDate.getMonth() + intervalsBetweenEvents[eventCombinationCount - 1]));
						
						if (checkingEvent in eventsByNameAndEventName[currentName])
							startDateListOfCheckingEvent = Object.keys(eventsByNameAndEventName[currentName][checkingEvent]);
						else
							break;

						// current date updated already, don't update currentDate again
						continue;
					}

					currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
				}
			}
		});

		self.debugEventsByName = debugEventsByName;
		self.debugEventColour = EventView.newEventColour;
	},
	onDragStartSymbol: function() {
		var originalX = d3.select(this).attr("x");

		d3.select(this)
			.attr("original-x", originalX);
	},
	onDragSymbol: function() {
		var x = d3.mouse(this)[0];
		var y = d3.mouse(this)[1];
		var width = d3.select(this).attr("width");
		var height = d3.select(this).attr("height");

		d3.select(this)
			.attr("x", x - width / 2)
			.attr("y", y - height / 2);

		if (EventView.eventEditorSvg.selectAll(".instruction-text").empty())
			EventView.eventEditorSvg.append("text")
				.attr("class", "instruction-text")
				.attr("x", EventView.eventEditorWidthMinusPadding / 2)
				.attr("y", -EventView.eventEditorStrokeWidth * 2)
				.text("Drag out of event editor to remove")
				.style("fill", "gray")
				.style("text-anchor", "middle")
				.style("alignment-baseline", "central");

		if (EventView.eventEditorSvg.select("#event-edit-highlight").style("stroke") != "yellow")
			EventView.eventEditorSvg.select("#event-edit-highlight").style("stroke", "yellow");
	},
	onDragEndSymbol: function() {
		var self = CombineEventEditor;

		var y = d3.mouse(this)[1];
		var symbolWidth = parseInt(d3.select(this).attr("width"));
		var thisSymbolOriginalX = parseInt(d3.select(this).attr("original-x"));
		var previousSymbolOriginalX = -999;
		var maxX = -999;

		if (y > -EventView.eventEditorStrokeWidth * 2) { // rectangle translate by -eventEditorStrokeWidth * 2
			// restore original position
			d3.select(this)
				.attr("x", thisSymbolOriginalX)
				.attr("y", self.eventCombinationY);
		}
		else {
			// remove combined-event
			d3.select(this).remove();

			// shift other symbols
			d3.selectAll(".combined-event")
				.each(function() {
					var currentSymbolX = parseInt(d3.select(this).attr("x"));

					// for removing interval
					if (currentSymbolX < thisSymbolOriginalX && currentSymbolX > previousSymbolOriginalX)
						previousSymbolOriginalX = currentSymbolX;

					// shift
					if (currentSymbolX > thisSymbolOriginalX) {
						d3.select(this)
							.transition()
							.attr("x", currentSymbolX - self.paddingBetweenEvents);

						currentSymbolX = currentSymbolX - self.paddingBetweenEvents;
					}							

					// determine maxX for restoring eventCombinationNextX
					if (currentSymbolX > maxX)
						maxX = currentSymbolX;
				});

			// remove combined-event interval
			// if previousSymbolOriginalX == -999, the leftmost one was removed, no interval is removed
			if (previousSymbolOriginalX != -999) {
				d3.selectAll(".combined-event-interval")
					.each(function() {
						var currentIntervalX = parseInt(d3.select(this).attr("x"));

						if (currentIntervalX > previousSymbolOriginalX && currentIntervalX < thisSymbolOriginalX) {
							d3.select(this).remove();
						}
						else if (currentIntervalX > thisSymbolOriginalX) {
							// shift the ones to the right
							d3.select(this)
								.transition()
								.attr("x", currentIntervalX - self.paddingBetweenEvents)
						}
					});
			}
			else {
				// remove first one and shift the others
				d3.select(".combined-event-interval").remove();

				d3.selectAll(".combined-event-interval")
					.each(function() {
						var currentIntervalX = parseInt(d3.select(this).attr("x"));

						d3.select(this)
							.transition()
							.attr("x", currentIntervalX - self.paddingBetweenEvents);
					});
			}

			// restore parameters
			self.eventCombinationNextX = maxX + symbolWidth / 2 + self.paddingBetweenEvents;
			self.numberOfEventCombined--;

			// update the debug rect
			if (self.numberOfEventCombined == 0)
				EventView.removeEventEditor();

			if (self.numberOfEventCombined <= 1) { // nothing to combine
				EventViewRightClickHandler.selectedOption = null;
				EgoNetworkView.removeDebugRect();
			}
			else {
				EventViewRightClickHandler.selectedOption = "Combine";
				EgoNetworkView.updateDebugRect();
			}
		}

		// remove instruction and highlight
		EventView.eventEditorSvg.selectAll(".instruction-text").remove();
		EventView.eventEditorSvg.select("#event-edit-highlight").style("stroke", "none");
	},
	onMouseOverSymbol: function() {
		var self = CombineEventEditor;

		// add instruction
		EventView.eventEditorSvg.append("text")
			.attr("class", "instruction-text")
			.attr("x", EventView.eventEditorWidthMinusPadding / 2)
			.attr("y", -EventView.eventEditorStrokeWidth * 2)
			.text("Drag out of event editor to remove")
			.style("fill", "gray")
			.style("text-anchor", "middle")
			.style("alignment-baseline", "central");

		// highlight the box
		EventView.eventEditorSvg.select("#event-edit-highlight")
			.style("stroke", "#FFFFEE");
	},
	onMouseOutSymbol: function() {
		// remove instruction and highlight
		EventView.eventEditorSvg.selectAll(".instruction-text").remove();
		EventView.eventEditorSvg.select("#event-edit-highlight").style("stroke", "none");
	},
	onClickIntervalText: function() {
		var self = CombineEventEditor;

		var textNode = this;
		var width = this.getBBox().width;
		var text = d3.select(this).text().split(" ")[1];

		var x = parseFloat(d3.select(this).attr("x")) - width / 2;
		var y = parseFloat(d3.select(this).attr("y")) - 5; // hacky way of alignment, font-size = 10

		EventView.createTextEdit(x, y, width, text, function(textInput) {
			var newText = "";
			var month = parseInt(textInput);

			if (month == 0 || month == 1)
				newText = "<= " + month + " month"
			else if (month > 1 && month <= 23)
				newText = "<= " + month + " months";
			else
				newText = d3.select(textNode).text();

			// change text
			d3.select(textNode).text(newText);

			// create debug rect
			EgoNetworkView.updateDebugRect();
		});
	}
}