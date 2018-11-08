var Heatmap = {
	heatmapObject: null,

	init: function() {
		var self = this;

		self.heatmapObject = h337.create({
          gradient: { '0': 'white', '1': '#ff9999' },
          container: document.getElementById('heatmap')
        });
	},
	show: function(inputCoords = null) {
		var self = this;
		var allCoords = (inputCoords === null) ? ComparisonHandler.scatterplotCoordForDisplay : inputCoords;
		var countAtEachCoord = self.findCountAtEachCoord(allCoords);
		var minCount = self.getMinCount(countAtEachCoord);
		var maxCount = self.getMaxCount(countAtEachCoord);
		var data = { min: 1, max: maxCount, data: [] };

		if (maxCount != 1) {
			for (var coordString in countAtEachCoord) {
				var splittedString = coordString.split(",");
				var currentX = parseFloat(splittedString[0]) + MDSView.margin.left;
				var currentY = parseFloat(splittedString[1]) + MDSView.margin.top;
				var count = countAtEachCoord[coordString];

				data.data.push({ x: currentX, y: currentY, value: count });
			}

			self.heatmapObject.setData(data);
		}

		if (maxCount == 1)
			self.clear();
	},
	clear: function() {
		var self = this;
		var data = { min: 0, max: 0, data: [] };

		self.heatmapObject.setData(data);
	},
	findCountAtEachCoord: function(allCoords) {
		var countAtEachCoord = {};

		// init
		for (var i = 0; i < allCoords.length; i++) {
			var currentX = allCoords[i].x;
			var currentY = allCoords[i].y;
			var coordString = currentX + "," + currentY;

			countAtEachCoord[coordString] = 0;
		}

		// count
		for (var i = 0; i < allCoords.length; i++) {
			var currentX = allCoords[i].x;
			var currentY = allCoords[i].y;
			var coordString = currentX + "," + currentY;

			countAtEachCoord[coordString]++;
		}

		return countAtEachCoord;
	},
	getMinCount: function(countAtEachCoord) {
		var minCount = Infinity;

		for (var coordString in countAtEachCoord)
			if (countAtEachCoord[coordString] < minCount)
				minCount = countAtEachCoord[coordString];

		return minCount;
	},
	getMaxCount: function(countAtEachCoord) {
		var maxCount = -Infinity;

		for (var coordString in countAtEachCoord)
			if (countAtEachCoord[coordString] > maxCount)
				maxCount = countAtEachCoord[coordString];

		return maxCount;
	}
}