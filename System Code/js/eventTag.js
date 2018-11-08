var EventTag = {
	debugEventsByName: null,
	debugEventColour: null,

	onMouseEnter: function() {
		var self = EventTag;

		d3.select(this)
			.select("rect")
			.style("fill", "#FFFFEE");

		d3.select(this)
			.selectAll(".instruction-text")
			.style("display", null);

		// highlight event editor
		if (!d3.select(this).select("rect.event-symbol").empty()) {
			EventView.eventEditorSvg.append("text")
				.attr("class", "instruction-text")
				.attr("x", EventView.eventEditorWidthMinusPadding / 2)
				.attr("y", -30)
				.text("Drag into event editor to combine")
				.style("fill", "gray")
				.style("text-anchor", "middle")
				.style("alignment-baseline", "central");

			EventView.eventEditorSvg.select("#event-edit-highlight")
				.style("stroke", "#FFFFEE");
		}

		// create debug rect
		self.createDebugRectData(d3.select(this).attr("name"));
		EgoNetworkView.createDebugRect(self.debugEventsByName, self.debugEventColour);
	},
	createDebugRectData: function(selectedEventName) {
		var self = this;

		// get the list of selected flow
		var selectedName = [];
		EgoNetworkView.svgGroup.selectAll(".flow").each(function() {
			var currentName = d3.select(this).attr("name");
			selectedName.push(currentName);
		});

		// create event by name
		var eventsByName = {};
		for (var i = 0; i < Database.events.length; i++) {
			if ($.inArray(Database.events[i].name, selectedName) != -1 && Database.events[i].eventName == selectedEventName) {
				var currentName = Database.events[i].name;

				if (!(currentName in eventsByName))
					eventsByName[currentName] = [Database.events[i]];
				else
					eventsByName[currentName].push(Database.events[i]);
			}
		}

		// get colour
		var eventIndex = EventView.event2Index[selectedEventName];

		self.debugEventsByName = eventsByName;
		self.debugEventColour = EventView.colours(eventIndex);
	},
	onMouseLeave: function() {
		d3.select(this)
			.select("rect")
			.style("fill", "white");

		d3.select(this)
			.selectAll(".instruction-text")
			.style("display", "none");

		// remove highlight in event editor
		EventView.eventEditorSvg.selectAll(".instruction-text").remove();
		EventView.eventEditorSvg.select("#event-edit-highlight").style("stroke", "none");

		EgoNetworkView.removeDebugRect();
		EgoNetworkView.updateDebugRect();
	},
	onDoubleClick: function() {
		var eventName = d3.select(this).attr("name");
		var newEvents = [];

		// remove events
		for (var i = 0; i < Database.events.length; i++) {
			if (Database.events[i].eventName != eventName)
				newEvents.push(Database.events[i]);
		}
		Database.events = newEvents;
		delete EventView.event2Index[eventName];
		EventView.updateNextEventIndex();

		// remove the tag and shift the tag below up
		var removedTagTranslateY = d3.transform(d3.select(this).attr("transform")).translate[1];
		d3.select(this).remove();
		d3.selectAll(".event-tag")
			.each(function() {
				var currentTranslateY = d3.transform(d3.select(this).attr("transform")).translate[1];

				if (currentTranslateY > removedTagTranslateY) {
					currentTranslateY -= EventView.tagHeight;
					d3.select(this)
						.transition()
						.attr("transform", "translate(0, " + currentTranslateY + ")")
				}
			});
		EventView.nextTagY -= EventView.tagHeight;

		// update event edit if needed (add button may change from full/ added to add)
		if (!EventView.eventEditorSvg.select(".editor-event-tag").empty()) {
			EventView.checkIfCurrentEventAdded();
			EventView.updateEventEditor();
		}

		// update
		Table.updateEvents();
		MDSView.update();
		EgoNetworkView.updateDebugRect();
	},
	onDragStart: function() {
		var x = d3.select(this).select(".event-symbol").attr("x");
		var y = d3.select(this).select(".event-symbol").attr("y");
		var width = d3.select(this).select(".event-symbol").attr("width");
		var height = d3.select(this).select(".event-symbol").attr("height");
		var fill = d3.select(this).select(".event-symbol").style("fill")
		var translate = d3.select(this).attr("transform");

		EventView.eventPanelSvg.append("rect")
			.attr("class", "duplicate-event-symbol")
			.attr("x", x)
			.attr("y", y)
			.attr("width", width)
			.attr("height", height)
			.attr("transform", translate)
			.style("fill", fill)
			.style("cursor", "pointer")
			.style("stroke", "black");
	},
	onDrag: function() {
		var x = d3.mouse(this)[0];
		var y = d3.mouse(this)[1];
		var width = d3.select(this).select(".event-symbol").attr("width");
		var height = d3.select(this).select(".event-symbol").attr("height");

		EventView.eventPanelSvg.select(".duplicate-event-symbol")
			.attr("x", x - width / 2)
			.attr("y", y - height / 2);

		// if the editor is not hightlighted, highlight it
		if (EventView.eventEditorSvg.select(".instruction-text").empty()) {
			EventView.eventEditorSvg.append("text")
				.attr("class", "instruction-text")
				.attr("x", EventView.eventEditorWidthMinusPadding / 2)
				.attr("y", -30)
				.text("Drag into event editor to combine")
				.style("fill", "gray")
				.style("text-anchor", "middle")
				.style("alignment-baseline", "central");

			EventView.eventEditorSvg.select("#event-edit-highlight")
					.style("stroke", "yellow");
		}
	},
	onDragEnd: function() {
		var self = EventTag;

		var y = d3.mouse(this)[1];
		var targetY = EventView.eventPanelHeight - d3.transform(d3.select(this).attr("transform")).translate[1] - EventView.margin.top;

		if (y > targetY) {
			// enter for the first time
			if (CombineEventEditor.numberOfEventCombined == 0) {
				CombineEventEditor.init();
				CombineEventEditor.createEventTagInEditor();
			}

			// subsequent enters
			var width = d3.select(this).select(".event-symbol").attr("width");
			var height = d3.select(this).select(".event-symbol").attr("height");
			var fill = d3.select(this).select(".event-symbol").style("fill");
			var name = d3.select(this).attr("name");
			CombineEventEditor.updateControl(width, height, fill, name);
		}

		// remove the visual elements
		EventView.eventPanelSvg.select(".duplicate-event-symbol").remove();
		EventView.eventEditorSvg.selectAll(".instruction-text").remove();
		EventView.eventEditorSvg.select("#event-edit-highlight").style("stroke", "none");
	}
}