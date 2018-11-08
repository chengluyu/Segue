var EventViewRightClickHandler = {
	// for event extraction
	selectedAttribute: null,
	selectedOption: null,
	parameters: {},

	structuralAttributes: ["Size", "Density"],

	installRightClickBehaviour: function(svg) {
		var self = this;

		svg.on("contextmenu", self.constructMenu);
	},
	constructMenu: function() {
		var self = EventViewRightClickHandler;

		var menu = [];
		var structuralMenuItems = self.structuralAttributes;
		var attributeMenuItems = Object.keys(Database.position2Index);
		var allMenuItems = attributeMenuItems.concat(structuralMenuItems);

		for (var i = 0; i < allMenuItems.length; i++) {
			menu.push({
				title: allMenuItems[i],
				data: allMenuItems[i],
				action: function(title) {
					EventView.removeEventEditor();
					EventView.eventEditorSvg.select(".event-editor-text")
						.text("Event Type Editor - " + title);

					EventViewRightClickHandler.selectedAttribute = title;
					EventViewRightClickHandler.createOptionInEventEditor();
				}
			});
		}

		return d3.contextMenu(menu)();
	},
	createOptionInEventEditor: function() {
		var self = EventViewRightClickHandler;

		// clear previous options first
		EventView.eventEditorSvg.select(".options").remove();

		// option text
		var option = EventView.eventEditorSvg.append("g")
			.attr("class", "options");
		option.append("text")
			.attr("x", 5)
			.attr("y", EventView.optionY)
			.style("text-anchor", "start")
			.style("alignment-baseline", "central")
			.style("font-size", 14)
			.text("Specification:");

		// structual, two option buttons
		if (self.isStructuralAttribute(self.selectedAttribute)) {
			self.drawOptionButton("Value Range", 107, EventView.optionY);
			self.drawOptionButton("Slope Range", 220, EventView.optionY);
		}

		// attribute, four option buttons
		else {
			self.drawOptionButton("Value Range", 107, EventView.optionY);
			self.drawOptionButton("S", 187, EventView.optionY);
			self.drawOptionButton("Slope Range", 220, EventView.optionY);
		}
	},
	drawOptionButton: function(text, translateX, translateY) {
		var self = this;

		var button = EventView.eventEditorSvg.select(".options").append("g")
				.attr("class", "button")
				.attr("transform", "translate(" + translateX + ", " + translateY + ")")
				.attr("cursor", "pointer")
				.on("click", onClickButton);
		var buttonSvgText = button.append("text")
			.attr("x", 0)
			.attr("y", 0)
			.style("alignment-baseline", "central")
			.style("font-size", 12)
			.text(text);
		var bbox = buttonSvgText[0][0].getBBox()
		var backgroundRect = button.insert("rect", "text")
			.attr("width", bbox.width + 8)
			.attr("height", bbox.height + 4)
			.attr("x", bbox.x - 4)
			.attr("y", bbox.y - 2)
			.style("rx", 5)
			.style("ry", 5);

		if (text == "S") {
			backgroundRect
				.style("rx", 0)
				.style("ry", 0);
		}

		function onClickButton() {
			if (!d3.select(this).classed("selected")) {
				var mode = d3.select(this).select("text").text();
				self.selectedOption = mode; // for use by egonetwork view to create debug rect
				d3.selectAll(".options .button").classed("selected", false);
				d3.select(this).classed("selected", true);

				if (mode == "Value Range") { // handle debug rect on drag end
					RangePointEventEditor.init(self.selectedAttribute);
					RangePointEventEditor.createRangeSelector();
					RangePointEventEditor.createLineChart();
					RangePointEventEditor.createEventTagInEditor();
				}

				if (mode == "Slope Range") { // handle debug rect on drag end
					IntervalEventEditor.init(self.selectedAttribute);
					IntervalEventEditor.createControls();
					IntervalEventEditor.createEventTagInEditor();
				}

				if (mode == "S") {
					AppearPointEventEditor.init(self.selectedAttribute);
					AppearPointEventEditor.createEventTagInEditor();
					EgoNetworkView.updateDebugRect();
				}
			}
			else {
				var mode = d3.select(this).select("text").text();
				self.selectedOption = null;
				d3.select(this).classed("selected", false);
				EventView.removeEventEditor();
				EgoNetworkView.removeDebugRect();
			}
		}
	},
	isStructuralAttribute: function(attribute) {
		var self = this;

		return $.inArray(attribute, self.structuralAttributes) != -1;
	}
}