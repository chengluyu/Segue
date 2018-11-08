var TimeSeriesAreaCharts = {
	colour: "#e5e5e5",
	height: null,
	width: null,
	timeSeries: null,
	name: null,
	tickHeight: 10,

	parentSVG: null,
	svgGroup: null,

	init: function(svg, width, height, timeSeries, name) {
		var self = this;

		self.svgGroup = svg.append("g")
			.attr("class", "time-series-area-chart")
			.attr("cursor", "pointer");
		self.parentSVG = svg;

		self.height = height;
		self.width = width;
		self.timeSeries = timeSeries;
		self.name = name;
	},
	createAreaChart: function(normalized = true) {
		var self = this;

		var maxSize = d3.max(self.timeSeries);
		var xScale = d3.scale.linear()
			.domain([0, self.timeSeries.length - 1])
			.range([0, self.width]);
		var sizeScale = d3.scale.linear()
			.domain(d3.extent(self.timeSeries))
			.range([0, self.height]);

		if (!normalized) {
			var attributeName = $("#timeseries-menu select").val();
			
			sizeScale = d3.scale.linear()
				.domain(Database.rangeDict[attributeName])
				.range([0, self.height]);
		}

		// create area chart
		var area = d3.svg.area()
			.interpolate("monotone")
			.x(function(d, i) { return xScale(i); })
            .y0(function(d) { return sizeScale(d) / 2; })
            .y1(function(d) { return -sizeScale(d) / 2; });

        self.svgGroup.append("path")
			.datum(self.timeSeries)
			.attr("class", "area")
			.attr("d", area)
			.attr("fill", self.colour);
	},
	translateFlow: function() {
		var self = this;

		self.svgGroup
			.attr("transform", "translate(0, " + (self.height / 2)+ ")");
	},
	createBackground: function() {
		var self = this;

		self.svgGroup.insert("rect", ":first-child")
			.attr("width", self.width)
			.attr("height", self.height)
			.attr("x", 0)
			.attr("y", -self.height / 2)
			.style("fill", "white")
			.style("stroke", "none")
			.style("opacity", 0);
	},
	createLabel: function() {
		var self = this;

		var yTranslate = self.height + 20;

		// create dummy data for tick rendering
		var data = [];
		for (var i = 0; i < Database.numberOfTimeSteps; i++)
			data.push(i);

		// scale
		var xScale = d3.scale.linear()
			.domain(d3.extent(data))
			.range([0, self.width]);

		// create tick marks
		var tickGroup = self.parentSVG.append("g")
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
		self.parentSVG.append("text")
  			.attr("class", "name-label")
			.text(self.name + " (" + Database.employeeDict[self.name] + ")")
			.attr("x", 0)
			.attr("y", yTranslate + 70)
			.style("text-anchor", "start")
			.style("font-size", 40);
	}
}