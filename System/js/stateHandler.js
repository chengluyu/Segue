var StateHandler = {
	networkType: null, // ego, entire
	nodeClassNameList: null,
	linkClassNameList: null,
	egoClassName: null,
	timeIndex: null,

	storeState: function(networkType, timeIndex, nodeClassNameList = null, linkClassNameList = null, egoClassName = null) {
		var self = this;

		self.networkType = networkType;
		self.timeIndex = timeIndex;
		self.nodeClassNameList = nodeClassNameList;
		self.linkClassNameList = linkClassNameList;
		self.egoClassName = egoClassName;
	},
	removeState: function() {
		var self = this;

		self.networkType = null;
		self.timeIndex = null;
		self.nodeClassNameList = null;
		self.linkClassNameList = null;
		self.egoClassName = null;
	},
	isScatterplotLocked: function() {
		var self = this;

		return self.networkType != null;
	},
	addVisualLock: function(name, timeString) {
		var self = this;
		d3.select("#scatterplot .lock").remove();

		var lockGroup = d3.select("#scatterplot").append("g")
			.attr("class", "lock")
			.attr("transform", "translate(90, " + MDSView.textMargin.top + ")")
			.style("cursor", "pointer")
			.on("click", clickLockGroup)
			.on("mouseenter", mouseenterLockGroup)
			.on("mouseleave", mouseleaveLockGroup);
		lockGroup.append("text")
			.attr("x", 10)
			.attr("y", -18)
			.attr("font-size", 13)
			.attr('font-family', 'FontAwesome')
			.style("text-anchor", "middle")
			.style("alignment-baseline", "middle")
			.text("\uf023");
		lockGroup.append("text")
			.attr("x", 20)
			.attr("y", -15)
			.style("font-weight", "bold")
			.text(name + " in " + timeString);

		function clickLockGroup() {
			self.removeState();
			self.restoreState();
			d3.select("#scatterplot .lock").remove();
		}

		function mouseenterLockGroup() {
			d3.select("#scatterplot .lock")
				.append("text")
				.attr("class", "remove")
				.attr("x", 10)
				.attr("y", -18)
				.attr("font-size", 20)
				.attr('font-family', 'FontAwesome')
				.style("text-anchor", "middle")
				.style("alignment-baseline", "middle")
				.style("fill", "red")
				.text("\uf00d");
		}

		function mouseleaveLockGroup() {
			d3.select("#scatterplot .lock .remove").remove();
		}
	},
	restoreState: function() {
		var self = StateHandler;

		if (self.isScatterplotLocked()) {
			if (self.networkType == "ego") {
				var timeIndex = self.timeIndex;
				var date = Database.dateStringArray[timeIndex];
				var nodeClassNameList = self.nodeClassNameList;
				var linkClassNameList = self.linkClassNameList;
				var egoClassName = self.egoClassName;

				MDSView.highlightTimeline(timeIndex);
				MDSView.linkLayer.selectAll(".link").remove();
				MDSView.updateLinks(date);
				MDSView.highlightEgoNetwork(nodeClassNameList, linkClassNameList, egoClassName);
			}
			if (self.networkType == "entire") {
				var timeIndex = self.timeIndex;
				var date = Database.dateStringArray[timeIndex];

				MDSView.highlightTimeline(timeIndex);
				MDSView.linkLayer.selectAll(".link").remove();
				MDSView.updateLinks(date);
				MDSView.removeHighlightEgoNetwork();
			}
		}
		else {
			MDSView.removeHighlightTimeline();
			MDSView.linkLayer.selectAll(".link").remove();
			MDSView.removeHighlightEgoNetwork();
		}
	}
}