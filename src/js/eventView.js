var EventView = { // handling event editor
	margin: { top: 30, left: 10, bottom: 10, right: 10 },

	// dimension
	eventPanelHeight: 210,
	eventEditorHeight: 165,
	eventEditorHeightMinusPadding: null,
	eventEditorWidthMinusPadding: null,
	eventEditorStrokeWidth: 15,
	circleRadius: 5,
	tagWidth: null,
	tagHeight: null,

	// svg
	eventPanelSvg: null,
	eventEditorSvg: null,

	// y
	optionY: null,
	brushY: null,
	tagY: null,
	nextTagY: 5,

	// event registration
	event2Index: {},
	colours: d3.scale.category10(),
	maxNumberOfEvents: 9,
	nextEventIndex: 0,
	newEventColour: null,
	currentEventName: null,

	// add button
	full: false,
	added: false,
	addButtonXTranslate: null,
	addButtonText: null,

	init: function() {
		var self = this;

		self.eventEditorWidthMinusPadding = eventViewWidth - self.margin.left - self.margin.right;
		self.eventEditorHeightMinusPadding = self.eventEditorHeight - self.margin.top - self.margin.bottom;
		self.optionY = -self.eventEditorStrokeWidth * 2 + 40;
		self.brushY = self.optionY + 40;
		self.tagY = self.eventEditorHeight - 50;
		self.tagWidth = eventViewWidth - self.margin.left - self.margin.right;
		self.tagHeight = self.circleRadius * 4 + 2;

		// right click
		EventViewRightClickHandler.installRightClickBehaviour(d3.select("#event-editor"));
		self.initMouseenterBehaviour();

		// event panel
		self.eventPanelSvg = d3.select("#event-editor")
			.append("g")
			.attr("transform", "translate(" + self.margin.left + ", " + self.margin.top + ")");
		self.eventPanelSvg.append("text")
			.attr("x", 0)
			.attr("y", -15)
			.style("font-weight", "bold")
			.text("Event Types");

		var clearButton = self.eventPanelSvg.append("g")
			.style("cursor", "pointer")
			.on("click", onClickClearPanelButton);
		clearButton.append("text")
			.attr("x", self.eventEditorWidthMinusPadding - 3)
			.attr("y", -15)
			.style("text-anchor", "end")
			.text("Clear");
		var bbox = clearButton.node().getBBox();
		clearButton.insert("rect", "text")
			.attr("x", bbox.x - 3)
			.attr("y", bbox.y - 1)
			.attr("width", bbox.width + 6)
			.attr("height", bbox.height + 2)
			.attr("rx", 3)
			.attr("ry", 3)
			.style("fill", "#e5e5e5")
			.style("stroke", "none");

		// event edit
		self.eventEditorSvg = d3.select("#event-editor")
			.append("g")
			.attr("transform", "translate(" + self.margin.left + ", " + (self.eventPanelHeight + self.margin.top) + ")");
		self.eventEditorSvg.append("line")
			.attr("x1", 0)
			.attr("x2", self.eventEditorWidthMinusPadding)
			.attr("y1", -35)
			.attr("y2", -35)
			.style("stroke", "#efefef")
		self.eventEditorSvg.append("rect")
			.attr("id", "event-edit-highlight")
			.attr("x", 0)
			.attr("y", -self.eventEditorStrokeWidth * 2)
			.attr("width", self.eventEditorWidthMinusPadding - 3)
			.attr("height", self.eventEditorHeightMinusPadding + self.eventEditorStrokeWidth * 2)
			.style("fill", "none")
			.style("stroke", "none")
			.style("stroke-width", self.eventEditorStrokeWidth);
		self.eventEditorSvg.append("text")
			.attr("class", "event-editor-text")
			.attr("x", 0)
			.attr("y", -self.eventEditorStrokeWidth)
			.style("font-weight", "bold")
			.text("Event Type Editor");

		var clearButton = self.eventEditorSvg.append("g")
			.style("cursor", "pointer")
			.on("click", onClickClearEditorButton);
		clearButton.append("text")
			.attr("x", self.eventEditorWidthMinusPadding - 3)
			.attr("y", -15)
			.style("text-anchor", "end")
			.text("Clear");
		var bbox = clearButton.node().getBBox();
		clearButton.insert("rect", "text")
			.attr("x", bbox.x - 3)
			.attr("y", bbox.y - 1)
			.attr("width", bbox.width + 6)
			.attr("height", bbox.height + 2)
			.attr("rx", 3)
			.attr("ry", 3)
			.style("fill", "#e5e5e5")
			.style("stroke", "none");

		function onClickClearEditorButton() {
			// remove the previous widgets
			self.removeEventOptions();
			self.removeEventEditor();
			EgoNetworkView.removeDebugRect();

			// restore the title
			self.eventEditorSvg.select(".event-editor-text")
				.text("Event Type Editor");
		}

		function onClickClearPanelButton() {
			// remove events
			Database.events = [];
			self.event2Index = {};
			self.updateNextEventIndex();

			// remove the tag
			d3.selectAll(".event-tag").remove();
			self.nextTagY = 5;

			// update event edit if needed (add button may change from full/ added to add)
			if (!self.eventEditorSvg.select(".editor-event-tag").empty()) {
				self.checkIfCurrentEventAdded();
				self.updateEventEditor();
			}

			// update
			Table.updateEvents();
			MDSView.update();
			EgoNetworkView.updateDebugRect();
		}
	},
	initMouseenterBehaviour: function() {
		$('#event-view').on('mouseenter', mouseenterEventView);
		$('#mds-view').on('mouseenter', mouseleaveEventView);
		$('#flow-view').on('mouseenter', mouseleaveEventView);
		$('#table-view').on('mouseenter', mouseleaveEventView);

		function mouseenterEventView() {
			let currentPos = $(this).offset();
        	let currentWidth = $(this).width();

			$('#tooltip')
				.attr('data-tooltip', "Right-Click to Create Event Type")
				.css('top', currentPos.top - 5)
				.css('left', currentPos.left + currentWidth / 2)
				.addClass('show')
				.removeClass('bottom');
		}

		function mouseleaveEventView() {
			$('#tooltip')
				.removeClass('show');
		}
	},
	addEventTagToEventPanel: function(drawCircle) {
		var self = this;

		var className = self.currentEventName.split(" ").join("-");

		var eventGroup = self.eventPanelSvg.append("g")
			.attr("class", function() {
				return "event-tag " + className;
			})
			.attr("name", self.currentEventName)
			.attr("cursor", "pointer")
			.attr("transform", "translate(0, " + self.nextTagY + ")")
			.on("mouseenter", EventTag.onMouseEnter)
			.on("mouseleave", EventTag.onMouseLeave)
			.on("dblclick", EventTag.onDoubleClick);

		// create a rectangle for hovering
		eventGroup.append("rect")
			.attr("width", self.tagWidth)
			.attr("height", self.tagHeight)
			.attr("x", 0)
			.attr("y", -self.tagHeight / 2)
			.style("rx", 5)
			.style("ry", 5)
			.style("fill", "white");

		// create the instruction text
		eventGroup.append("text")
			.attr("class", "instruction-text")
			.attr("x", self.tagWidth / 2)
			.attr("y", -7)
			.style("text-anchor", "middle")
			.style("fill", "gray")
			.style("display", "none")
			.text("Double click to remove");

		// create the real content
		if (drawCircle) {
			eventGroup.append("circle")
				.attr("class", "event-symbol")
				.attr("r", self.circleRadius)
				.attr("cx", 10)
				.attr("cy", 0)
				.style("fill", self.colours(self.event2Index[self.currentEventName]))
				.style("stroke", "black");
		}
		else {
			eventGroup.append("rect")
				.attr("class", "event-symbol")
				.attr("x", 10 - self.circleRadius)
				.attr("y", 0 - self.circleRadius)
				.attr("width", self.circleRadius * 2)
				.attr("height", self.circleRadius * 2)
				.style("fill", self.colours(self.event2Index[self.currentEventName]))
				.style("stroke", "black");

			// only allow drag for interval events
			var dragEventTag = d3.behavior.drag()
				.on("dragstart", EventTag.onDragStart)
				.on("drag", EventTag.onDrag)
				.on("dragend", EventTag.onDragEnd);

			eventGroup.call(dragEventTag);
		}

		eventGroup.append("text")
			.attr("x", 25)
			.attr("y", 0)
			.style("text-anchor", "start")
			.style("alignment-baseline", "central")
			.style("font-size", 12)
			.text(self.currentEventName);

		self.nextTagY += self.tagHeight;
	},
	checkIfCurrentEventAdded: function() {
		var self = this;

		// * determine if is added (all events are stored in event2Index)
		self.isAdded = self.currentEventName in self.event2Index;

		// change colour and add button text
		if (self.isAdded) {
			self.newEventColour = self.colours(self.event2Index[self.currentEventName]);
			self.addButtonText = "Added";
			self.addButtonXTranslate = eventViewWidth - 50;
		}
		else {
			self.newEventColour = self.colours(self.nextEventIndex);
			self.addButtonText = "Add";
			self.addButtonXTranslate = eventViewWidth - 40;
		}

		// * determine if is full or will be full
		var currentNumberOfEvents = Object.keys(self.event2Index).length;
		var isFullAlready = currentNumberOfEvents >= self.maxNumberOfEvents;

		// change colour and add button text
		if (isFullAlready) {
			self.newEventColour = self.colours(self.maxNumberOfEvents);
			self.addButtonText = "Full";
			self.addButtonXTranslate = eventViewWidth - 40;
			self.isFull = true;
		}
		else {
			self.isFull = false;
		}
	},
	updateEventEditor: function() {
		var self = this;

		// update the text
		self.eventEditorSvg.select(".event-name")
			.text(self.currentEventName);

		// update the circle
		self.eventEditorSvg.select(".event-colour")
			.style("fill", self.newEventColour);

		// update the add button
		var addButton = self.eventEditorSvg.select(".add-button")
			.attr("transform", "translate(" + self.addButtonXTranslate + ", " + self.tagY + ")");
		var addButtonSvgText = addButton.select("text")
			.text(self.addButtonText);
		var bbox = addButtonSvgText[0][0].getBBox()
		self.eventEditorSvg.select(".add-button rect")
			.attr("width", bbox.width + 4)
			.attr("height", bbox.height + 4)
			.attr("x", bbox.x - 2)
			.attr("y", bbox.y - 2);
	},
	removeEventEditor: function() {
		var self = this;

		self.eventEditorSvg.select(".editor").remove();
		self.eventEditorSvg.select(".editor-event-tag").remove();

		// reset them (may change from combining some events to adding interval event, next time adding bug)
		CombineEventEditor.eventCombinationNextX = 20;
		CombineEventEditor.numberOfEventCombined = 0;
	},
	removeEventOptions: function() {
		var self = this;

		self.eventEditorSvg.select(".options").remove();
		EventViewRightClickHandler.selectedOption = null;
	},
	editEventName: function() {
		var self = EventView;

		var x = 25;
		var y = self.tagY - 6; // hacky way of alignment, font-size = 12
		var width = eventViewWidth - self.margin.right - self.margin.left - 100;
		var text = self.currentEventName;

		self.createTextEdit(x, y, width, text, function(textInput) {
			var storedName = self.storeEventName(textInput);
			self.eventEditorSvg.select("text.event-name").text(storedName);
		});
	},
	storeEventName: function(newEventName) { // for checking if the event name is duplicated
		var self = this;

		// find the max event id for the event with the same name
		var maxEventID = -1;
		var currentEventList = Object.keys(EventView.event2Index);
		var newEventName = newEventName.split(" #")[0];
		
		for (var i = 0; i < currentEventList.length; i++) {
			// found, get the id of that event
			var foundIndex = currentEventList[i].indexOf(newEventName);
			if (foundIndex != -1) {
				if (currentEventList[i].indexOf("#") == -1) { // not found
					maxEventID = 1;
				}
				else {
					var eventID = parseInt(currentEventList[i].split("#")[1]);
					if (eventID > maxEventID)
						maxEventID = eventID;
				}
			}
		}

		// append event id to the event name
		if (maxEventID == -1) // not found
			EventView.currentEventName = newEventName;
		else
			EventView.currentEventName = newEventName + " #" + (maxEventID + 1);

		// return the stored name (the named may have been changed)
		return EventView.currentEventName;
	},
	createTextEdit: function(x, y, width, text, useTextInput) {
		var self = this;

		var textInput;

		// create text edit div
		var textEditDiv = self.eventEditorSvg.append("foreignObject")
			.attr("width", width)
			.attr("height", "100%")
			.attr("transform", "translate(" + x + "," + y + ")")
			.append("xhtml:body")
			.style("margin", "0px")
			.append("div")
			.attr("contentEditable", true)
			.attr("width", "auto")
			.style("font-size", "12px")
			.style("background-color", "white")
			.text(text);

		// highlight the text on click
		var range = document.createRange();
	    range.selectNodeContents(textEditDiv[0][0]);
	    var sel = window.getSelection();
	    sel.removeAllRanges();
	    sel.addRange(range);
		textEditDiv[0][0].focus();

		textEditDiv
			.on("blur", function() { // enter text on blur
				var textInput = d3.select(this).text();
				useTextInput(textInput);

				d3.select(this.parentNode.parentNode).remove();
			});
	},
	registerNewEvent: function() {
		var self = this;

		self.event2Index[self.currentEventName] = self.nextEventIndex;
		self.updateNextEventIndex();
	},
	updateNextEventIndex: function() { // should be called every time event2Index changes
		var self = this;

		// some events in the middle from 0 to 6 may be deleted, need to fill in the gap
		var isFilledArray = [];
		for (var i = 0; i < self.maxNumberOfEvents; i++)
			isFilledArray.push(false);

		for (event in self.event2Index)
			isFilledArray[self.event2Index[event]] = true;

		for (var i = 0; i < isFilledArray.length; i++) {
			if (isFilledArray[i] == false) {
				self.nextEventIndex = i;
				break;
			}
		}
	}
}