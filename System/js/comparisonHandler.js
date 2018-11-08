var ComparisonHandler = {
	featureVectors: {},
	eventArrayForEachEgo: {}, // { name, events }, events is an array of array
	scatterplotCoord: [],
	scatterplotCoordForDisplay: [],

	computeEventArray: function() {
		var self = this;
		var eventArrayForEachEgo = {};
		var allEvents = Object.keys(EventView.event2Index);
		var event2IndexDict = {};
		var eventsByNameAndStartDate = d3.nest()
			.key(function(d) { return d.name; })
			.key(function(d) { return d.startDate; })
			.map(Database.events);

		// create event2IndexDict
		for (var i = 0; i < allEvents.length; i++)
			event2IndexDict[allEvents[i]] = i;

		// create the required array
		for (var i = 0; i < Database.nameList.length; i++) {
			var currentName = Database.nameList[i];
			var currentEventArray = [];

			if (currentName in eventsByNameAndStartDate) {
				for (var j = 0; j < Database.dateStringArray.length; j++) {
					var currentDate = Database.dateStringArray[j];
					var eventArrayAtCurrentDate = [];

					if (currentDate in eventsByNameAndStartDate[currentName]) {
						var eventsAtCurrentDate = eventsByNameAndStartDate[currentName][currentDate];

						for (var k = 0; k < eventsAtCurrentDate.length; k++) {
							var currentEventName = eventsAtCurrentDate[k].eventName;
							var currentEventIndex = event2IndexDict[currentEventName];
							eventArrayAtCurrentDate.push(currentEventIndex);
						}

						currentEventArray.push(eventArrayAtCurrentDate);
					}
				}
			}

			eventArrayForEachEgo[currentName] = currentEventArray;
		}

		self.eventArrayForEachEgo = eventArrayForEachEgo;
	},
	computeScatterplotCoord_edit: function() {
		var self = this;
		var labels = [];
		var distances = [];

		// create a list of labels
		for (var label in self.eventArrayForEachEgo)
			labels.push(label);

		// create distances based on the label order
		for (var i = 0; i < labels.length; i++) {
			var currentLabel = labels[i];
			var currentDistances = [];

			for (var j = 0; j < labels.length; j++) {
				var theOtherLabel = labels[j];
				var currentEventArray = self.eventArrayForEachEgo[currentLabel];
				var theOtherEventArray = self.eventArrayForEachEgo[theOtherLabel];
				var distance = self.computeEditDistance(currentEventArray, theOtherEventArray);
				currentDistances.push(distance);
			}

			distances.push(currentDistances);
		}

		// render coordinates
		self.scatterplotCoord = mds.classic(distances, labels);
		var xScale = d3.scale.linear()
			.domain(d3.extent(ComparisonHandler.scatterplotCoord, function(d) { return d.x; }))
			.range([0, MDSView.width]);
		var yScale = d3.scale.linear()
			.domain(d3.extent(ComparisonHandler.scatterplotCoord, function(d) { return d.y; }))
			.range([0, MDSView.height]);

		self.scatterplotCoordForDisplay = [];
		for (var i = 0; i < self.scatterplotCoord.length; i++) {
			var x = self.scatterplotCoord[i].x;
			var y = self.scatterplotCoord[i].y;
			var label = self.scatterplotCoord[i].label;

			self.scatterplotCoordForDisplay.push({
				x: xScale(x),
				y: yScale(y),
				label: label 
			});
		}
	},
	computeEditDistance: function(eventArray1, eventArray2) {
		var distanceMatrix = [];
		var costDict = []; // [array1Index][array2Index]: cost

		// create distance matrix
		for (var i = 0; i < eventArray1.length + 1; i++) { // +1 for empty char
			distanceMatrix.push([]);

			for (var j = 0; j < eventArray2.length + 1; j++)
				distanceMatrix[i].push(-1);
		}

		// compute the cost of each pair of events at the same time
		for (var i = 0; i < eventArray1.length; i++) {
			var currentArray1Char = eventArray1[i];

			costDict.push([]);

			for (var j = 0; j < eventArray2.length; j++) {
				var currentArray2Char = eventArray2[j];
				var currentCost = 0;

				// if array 1 element not in array 2 increase cost
				for (var k = 0; k < currentArray1Char.length; k++)
					if (currentArray2Char.indexOf(currentArray1Char[k]) == -1)
						currentCost++;

				// if array 2 element not in array 1 increase cost
				for (var k = 0; k < currentArray2Char.length; k++)
					if (currentArray1Char.indexOf(currentArray2Char[k]) == -1)
						currentCost++;

				// store the cost
				costDict[i].push(currentCost);
			}
		}

		// init distance matrix
		distanceMatrix[0][0] = 0;

		for (var i = 1; i < eventArray2.length + 1; i++) { // first row
			var costInLeftCell = distanceMatrix[0][i - 1];
			var currentCost = eventArray2[i - 1].length;
			distanceMatrix[0][i] = currentCost + costInLeftCell;
		}

		for (var i = 1; i < eventArray1.length + 1; i++) { // first column
			var costInTopCell = distanceMatrix[i - 1][0];
			var currentCost = eventArray1[i - 1].length;
			distanceMatrix[i][0] = currentCost + costInTopCell;
		}

		// compute distance
		for (var i = 1; i < eventArray1.length + 1; i++) {
			for (var j = 1; j < eventArray2.length + 1; j++) {
				var indexInArray1 = i - 1;
				var indexInArray2 = j - 1;
				var costOfTwoChar = costDict[indexInArray1][indexInArray2];
				var isSameCharacter = costOfTwoChar == 0;
				var currentCost = 0;

				var topValue = distanceMatrix[i - 1][j];
				var leftValue = distanceMatrix[i][j - 1];
				var diagValue = distanceMatrix[i - 1][j - 1];

				if (isSameCharacter)
					currentCost = diagValue;
				if (!isSameCharacter) 
					currentCost = Math.min(topValue, Math.min(leftValue, diagValue)) + costOfTwoChar;

				distanceMatrix[i][j] = currentCost;
			}
		}

		return distanceMatrix[eventArray1.length][eventArray2.length];
	},
	computeFeatureVectors: function() {
		var self = this;

		// initialization
		self.featureVectors = {};
		var allEvents = Object.keys(EventView.event2Index);
		var eventsByNameAndEventName = d3.nest()
			.key(function(d) { return d.name; })
			.key(function(d) { return d.eventName; })
			.map(Database.events);

		for (var i = 0; i < Database.nameList.length; i++) {
			var currentName = Database.nameList[i];

			// initialize the vector
			var vector = [];
			for (var j = 0; j < allEvents.length; j++)
				vector.push(0);

			// construct the feature vector
			for (var j = 0; j < allEvents.length; j++) {
				var currentEvent = allEvents[j];

				if (currentName in eventsByNameAndEventName && currentEvent in eventsByNameAndEventName[currentName])
					vector[j] = eventsByNameAndEventName[currentName][currentEvent].length;
			}

			// store the feature vector
			self.featureVectors[currentName] = vector;
		}
	},
	computeOriginalScatterplotCoord: function() {
		var self = this;
		var labels = [];
		var distances = [];

		// create a list of labels
		for (var i = 0; i < Database.nameList.length; i++)
			labels.push(Database.nameList[i]);

		// create distances based on attributes
		for (var i = 0; i < labels.length; i++) {
			var currentLabel = labels[i];
			var currentDistances = [];

			for (var j = 0; j < labels.length; j++) {
				var theOtherLabel = labels[j];

				// compute and store distance
				var distance = 1.5;
				if (currentLabel == theOtherLabel)
					distance = 0;
				else if (Database.employeeDict[currentLabel] == Database.employeeDict[theOtherLabel])
					distance = Math.random() + 0.3;

				currentDistances.push(distance);
			}

			distances.push(currentDistances);
		}

		// compute position using tsne
		var tsne = new tsnejs.tSNE();
		tsne.initDataDist(distances);
		for(var k = 0; k < 500; k++)
	  		tsne.step();
	  	var tSNEResult = tsne.getSolution();

	  	// transform and store result
	  	self.scatterplotCoord = [];
	  	for (var i = 0; i < tSNEResult.length; i++) {
	  		var currentX = tSNEResult[i][0];
	  		var currentY = tSNEResult[i][1];
	  		var currentLabel = labels[i];
	  		var currentObject = {
	  			x: currentX,
	  			y: currentY,
	  			label: currentLabel 
	  		};

	  		self.scatterplotCoord.push(currentObject);
	  	}

	  	// create for display (scaled)
	  	var xScale = d3.scale.linear()
			.domain(d3.extent(ComparisonHandler.scatterplotCoord, function(d) { return d.x; }))
			.range([0, MDSView.width]);
		var yScale = d3.scale.linear()
			.domain(d3.extent(ComparisonHandler.scatterplotCoord, function(d) { return d.y; }))
			.range([0, MDSView.height]);

		self.scatterplotCoordForDisplay = [];
		for (var i = 0; i < self.scatterplotCoord.length; i++) {
			var x = self.scatterplotCoord[i].x;
			var y = self.scatterplotCoord[i].y;
			var label = self.scatterplotCoord[i].label;

			self.scatterplotCoordForDisplay.push({
				x: xScale(x), 
				y: yScale(y),
				label: label 
			});
		}
	},
	computeScatterplotCoord: function() {
		var self = this;
		var labels = [];
		var distances = [];

		// create a list of labels
		for (var label in self.featureVectors)
			labels.push(label);

		// create distances based on the label order
		for (var i = 0; i < labels.length; i++) {
			var currentLabel = labels[i];
			var currentDistances = [];

			for (var j = 0; j < labels.length; j++) {
				var theOtherLabel = labels[j];

				var currentFeatureVector = self.featureVectors[currentLabel];
				var theOtherFeatureVector =  self.featureVectors[theOtherLabel];
				var distance = self.computeVectorDistance(currentFeatureVector, theOtherFeatureVector);

				currentDistances.push(distance);
			}

			distances.push(currentDistances);
		}
		self.scatterplotCoord = mds.classic(distances, labels);

		// create for display (scaled)
		var xScale = d3.scale.linear()
			.domain(d3.extent(ComparisonHandler.scatterplotCoord, function(d) { return d.x; }))
			.range([0, MDSView.width]);
		var yScale = d3.scale.linear()
			.domain(d3.extent(ComparisonHandler.scatterplotCoord, function(d) { return d.y; }))
			.range([0, MDSView.height]);

		self.scatterplotCoordForDisplay = [];
		for (var i = 0; i < self.scatterplotCoord.length; i++) {
			var x = self.scatterplotCoord[i].x;
			var y = self.scatterplotCoord[i].y;
			var label = self.scatterplotCoord[i].label;

			self.scatterplotCoordForDisplay.push({
				x: xScale(x),
				y: yScale(y),
				label: label 
			});
		}
	},
	jitterScatterplotCoordForDisplay: function() {
		var self = this;

		var xScale = d3.scale.linear()
			.domain(d3.extent(ComparisonHandler.scatterplotCoord, function(d) { return d.x; }))
			.range([0, MDSView.width]);
		var yScale = d3.scale.linear()
			.domain(d3.extent(ComparisonHandler.scatterplotCoord, function(d) { return d.y; }))
			.range([0, MDSView.height]);

		for (var i = 0; i < self.scatterplotCoord.length; i++) {
			var newX = xScale(self.scatterplotCoord[i].x) + Math.floor(Math.random() * 20) - 10;
			var newY = yScale(self.scatterplotCoord[i].y) + Math.floor(Math.random() * 20) - 10;

			self.scatterplotCoordForDisplay[i].x = newX;
			self.scatterplotCoordForDisplay[i].y = newY;
		}
	},
	computeVectorDistance: function(vector1, vector2) {
		var distance = 0;

		for (var i = 0; i < vector1.length; i++) {
			var diff = vector1[i] - vector2[i];
			var square = diff * diff;

			distance += square;
		}

		return distance;
	}
}