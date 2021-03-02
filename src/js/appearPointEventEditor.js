var AppearPointEventEditor = {
	// input
	currentAttribute: null,

	// debug
	debugEventsByName: {},
	debugEventColour: null,

	init: function(attribute) {
		var self = this;

		// remove the previous widgets
		EventView.removeEventEditor();
		EgoNetworkView.removeDebugRect();

		// store data
		self.currentAttribute = attribute;
	},
	createEventTagInEditor: function() {
		var self = this;

		// must check if added whenever current event name is changed
		EventView.currentEventName = "\"" + self.currentAttribute  + "\"" + " appears in the ego-network";
		EventView.checkIfCurrentEventAdded();

		// create group
		var editorEventTag = EventView.eventEditorSvg.append("g")
			.attr("class", "editor-event-tag");

		// draw circle
		editorEventTag.append("circle")
			.attr("class", "event-colour")
			.attr("r", EventView.circleRadius)
			.attr("cx", 10)
			.attr("cy", EventView.tagY)
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
			.on("click", EventView.editEventName);

		// draw add button
		var addButton = editorEventTag.append("g")
			.attr("class", "add-button")
			.attr("transform", "translate(" + EventView.addButtonXTranslate + ", " + EventView.tagY + ")")
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
		var self = AppearPointEventEditor;

		if (EventView.addButtonText == "Added" || EventView.addButtonText == "Full")
			return;

		self.addEventToDatabase();
		EventView.registerNewEvent();
		EventView.addEventTagToEventPanel(true);
		MDSView.update();
		Table.updateEvents();
		EventView.checkIfCurrentEventAdded(); // change to added
		EventView.updateEventEditor();
	},
	addEventToDatabase: function() {
		var self = this;

		for (var name in Database.attributeDict) {
			var attributeListArray = Database.attributeDict[name]; // array containing position contacted at each time

			for (var t = 0; t < attributeListArray.length; t++) {
				for (var i = 0; i < attributeListArray[t].length; i++) {
					var attributeAppear = attributeListArray[t][i].position;

					if (attributeAppear == self.currentAttribute) {
						Database.appendEvent(EventView.currentEventName, attributeListArray[t][i].date, null, name);
						break; // the same postion appears only once at each time step
					}
				}
			}
		}
	},
	createDebugRectData: function() {
		var self = this;

		debugEventsByName = {};

		EgoNetworkView.svgGroup.selectAll(".flow").each(function() {
			var currentName = d3.select(this).attr("name");
			debugEventsByName[currentName] = [];
			
			var attributeListArray = Database.attributeDict[currentName];
			for (var t = 0; t < attributeListArray.length; t++) {
				for (var i = 0; i < attributeListArray[t].length; i++) {
					var attributeAppear = attributeListArray[t][i].position;

					if (attributeAppear == self.currentAttribute) {
						debugEventsByName[currentName].push({
							startDate: attributeListArray[t][i].date,
							endData: null
						});

						break; // the same postion appears only once at each time step
					}
				}
			}
		});

		self.debugEventsByName = debugEventsByName;
		self.debugEventColour = EventView.newEventColour;
	}
}