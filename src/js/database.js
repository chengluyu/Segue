var Database = {
  events: [], // { name, startDate, endData, name }

  // raw data
  networkData: [],
  attributeData: [],
  timeSeriesData: [],
  linkData: [],

  // dict
  employeeDict: {}, // name to position
  networkDict: {}, // name to network array
  attributeDict: {}, // name to attribute data
  // position2Index: {
  // 	"venture_capital": 0,
  // 	"micro_vc": 1,
  // 	"individual": 2,
  // 	"corporate_venture_capital": 3,
  // 	"accelerator": 4,
  // 	"angel_group": 5,
  // 	"investment_bank": 6,
  // 	"others": 7
  // },
  position2Index: {
    CEO: 0,
    President: 1,
    "Vice President": 2,
    Director: 3,
    "Managing Director": 4,
    Manager: 5,
    "In House Lawyer": 6,
    Trader: 7,
    Employee: 8,
    unknown: 9,
  },

  // links
  dateToLinkDict: {},
  egoNetworkDict: {},
  maxLinkCountToANode: 0,

  // for handling event adding
  rangeDict: {}, // key: Size, Density + { positions }
  timeSeriesDict: {}, // key: Size, Density + { positions }
  timeSeriesRegressionDict: {}, // key: Size, Density + { positions }
  slopeRangeDict: {}, // key: Size, Density + { positions }

  // max
  maxSizeOfAll: 0,
  maxDensityOfAll: 0,

  // date related
  numberOfTimeSteps: null,
  dateString2Index: {},
  dateStringArray: [], // for converting index to dateString

  // others
  nameList: [],
  // positionColours: ["#4C0016", "#794044", "#8F605A", "#A68071", "#D2BF9F", "#E9DFB5", "#FFFFCC", "white"],
  positionColours: [
    "#4C0016",
    "#62202D",
    "#794044",
    "#8F605A",
    "#A68071",
    "#BC9F88",
    "#D2BF9F",
    "#E9DFB5",
    "#FFFFCC",
    "white",
  ],

  getData: function () {
    var self = this;

    d3.csv("csv/network.csv", networkType, function (network) {
      d3.csv("csv/attribute.csv", attributeType, function (attribute) {
        d3.csv("csv/employees.csv", function (employees) {
          d3.csv("csv/timeSeries.csv", function (timeSeries) {
            d3.csv("csv/links.csv", function (links) {
              self.init(network, attribute, employees, timeSeries, links);

              self.processNetworkData();
              self.processAttributeData();
              self.createDate2IndexDict();
              self.processLinkData(); // do it after getting date string
              self.createTimeSeriesDict();
              self.createRangeDict();

              Table.init();
              Timeline.init();
              EgoNetworkView.init();
              EventView.init();
              MDSView.init();
              NodeLinkDiagram.init();
              Heatmap.init();

              // process the time series later to shorten loading time
              self.processTimeSeriesRegressionData();
            });
          });
        });
      });
    });

    function networkType(d) {
      d.size = +d.size;
      d.density = +d.density;

      return d;
    }

    function attributeType(d) {
      d.frequency = +d.frequency;

      return d;
    }
  },
  init: function (network, attribute, employees, timeSeries, links) {
    var self = this;

    self.networkData = network;
    self.attributeData = attribute;
    self.timeSeriesData = timeSeries;
    self.linkData = links;

    // create a dictionary of employee to position
    for (var i = 0; i < employees.length; i++)
      self.employeeDict[employees[i].name] = employees[i].position;
  },
  processLinkData: function () {
    var self = this;

    var dateToLinkDict = d3
      .nest()
      .key(function (d) {
        return d.date;
      })
      .map(self.linkData);
    var maxLinkCountToANode = 0;

    // init ego-network dict
    var egoNetworkDict = {};
    for (var i = 0; i < self.nameList.length; i++) {
      var currentName = self.nameList[i];
      egoNetworkDict[currentName] = {};

      for (var j = 0; j < self.dateStringArray.length; j++) {
        var currentDate = self.dateStringArray[j];
        egoNetworkDict[currentName][currentDate] = {};
      }
    }

    // create ego-network dict
    for (var date in dateToLinkDict) {
      for (var i = 0; i < dateToLinkDict[date].length; i++) {
        var currentSource = dateToLinkDict[date][i].source;
        var currentTarget = dateToLinkDict[date][i].target;

        if (currentSource == currentTarget) {
          // record it once
          if (currentTarget in egoNetworkDict[currentSource][date])
            egoNetworkDict[currentSource][date][currentTarget]++;
          else egoNetworkDict[currentSource][date][currentTarget] = 1;

          // update count
          if (
            egoNetworkDict[currentSource][date][currentTarget] >
            maxLinkCountToANode
          )
            maxLinkCountToANode =
              egoNetworkDict[currentSource][date][currentTarget];
        } else {
          // record target
          if (currentTarget in egoNetworkDict[currentSource][date])
            egoNetworkDict[currentSource][date][currentTarget]++;
          else egoNetworkDict[currentSource][date][currentTarget] = 1;

          // record source
          if (currentSource in egoNetworkDict[currentTarget][date])
            egoNetworkDict[currentTarget][date][currentSource]++;
          else egoNetworkDict[currentTarget][date][currentSource] = 1;

          // update count
          if (
            egoNetworkDict[currentSource][date][currentTarget] >
            maxLinkCountToANode
          )
            maxLinkCountToANode =
              egoNetworkDict[currentSource][date][currentTarget];
          if (
            egoNetworkDict[currentTarget][date][currentSource] >
            maxLinkCountToANode
          )
            maxLinkCountToANode =
              egoNetworkDict[currentTarget][date][currentSource];
        }
      }
    }

    // compute the nodes in each ego-network
    for (var name in egoNetworkDict) {
      for (var date in egoNetworkDict[name]) {
        var nameArray = [];
        for (var otherName in egoNetworkDict[name][date])
          nameArray.push(otherName);

        egoNetworkDict[name][date] = nameArray;
      }
    }

    self.dateToLinkDict = dateToLinkDict;
    self.maxLinkCountToANode = maxLinkCountToANode;
    self.egoNetworkDict = egoNetworkDict;
  },
  processNetworkData: function () {
    var self = this;

    // create a network dictionary
    self.networkDict = d3
      .nest()
      .key(function (d) {
        return d.name;
      })
      .map(self.networkData);

    // sort by date (may not be sorted in the original data)
    for (var name in self.networkDict)
      self.networkDict[name].sort(function (a, b) {
        return d3.ascending(a.date, b.date);
      });

    // create unique list of names and sort by their positions
    self.nameList = Object.keys(self.networkDict);
    self.nameList.sort(function (a, b) {
      return d3.ascending(self.employeeDict[a], self.employeeDict[b]);
    });

    // store the total number of time periods
    self.numberOfTimeSteps = self.networkDict[self.nameList[0]].length;

    // find max size and density of email exchanges of all employees
    for (var i = 0; i < self.networkData.length; i++) {
      if (self.networkData[i].size > self.maxSizeOfAll)
        self.maxSizeOfAll = self.networkData[i].size;

      if (self.networkData[i].density > self.maxDensityOfAll)
        self.maxDensityOfAll = self.networkData[i].density;
    }
  },
  processAttributeData: function () {
    var self = this;

    // * create attribute dictionary
    var attributeDict = d3
      .nest()
      .key(function (d) {
        return d.name;
      })
      .map(self.attributeData);

    for (var name in attributeDict) {
      var attributeList = attributeDict[name];
      var attributeListByDate = [];
      var uniquePositions = [];

      for (var i = 0; i < attributeList.length; i++) {
        // determine the number of layers
        if ($.inArray(attributeList[i].position, uniquePositions) == -1)
          uniquePositions.push(attributeList[i].position);
      }

      var tempAttributeListByDate = d3
        .nest()
        .key(function (d) {
          return d.date;
        })
        .map(attributeList);

      // create attributeListByDate which contains every month
      var firstTimeStep = self.networkDict[self.nameList[0]][0].date;
      var lastTimeStep =
        self.networkDict[self.nameList[0]][self.numberOfTimeSteps - 1].date;
      var parseDate = d3.time.format("%Y-%m").parse;
      var currentDate = parseDate(firstTimeStep);
      var lastDate = parseDate(lastTimeStep);

      while (currentDate <= lastDate) {
        // construct date string
        var year = currentDate.getYear() + 1900;
        var month = currentDate.getMonth() + 1;
        month = month < 10 ? "0" + month.toString() : month.toString();
        var currentDateString = year + "-" + month;

        if (currentDateString in tempAttributeListByDate)
          attributeListByDate.push(tempAttributeListByDate[currentDateString]);
        else attributeListByDate.push([]);

        currentDate = new Date(
          currentDate.setMonth(currentDate.getMonth() + 1)
        );
      }

      // sort by position and then by frequency
      for (var i = 0; i < attributeListByDate.length; i++) {
        attributeListByDate[i].sort(function (x, y) {
          return d3.ascending(
            self.position2Index[x.position],
            self.position2Index[y.position]
          );
        });
      }

      attributeDict[name] = attributeListByDate;
    }

    self.attributeDict = attributeDict;
  },
  processTimeSeriesRegressionData: function () {
    var self = this;

    var finalTimeSeriesData = {};
    var finalSlopeRange = {};

    for (var i = 0; i < self.timeSeriesData.length; i++) {
      for (var key in self.timeSeriesData[i]) {
        if (key != "name") {
          var attributeName = key.split("-")[0];
          var timeSeriesName = key.split("-")[1];
          var timeSeriesArray = self.timeSeriesData[i][key].split(";");
          var currentName = self.timeSeriesData[i].name;

          // convert the strings to numbers
          for (var j = 0; j < timeSeriesArray.length; j++)
            timeSeriesArray[j] = +timeSeriesArray[j];

          // store the array
          if (!(attributeName in finalTimeSeriesData))
            finalTimeSeriesData[attributeName] = {};
          if (!(currentName in finalTimeSeriesData[attributeName]))
            finalTimeSeriesData[attributeName][currentName] = {};

          finalTimeSeriesData[attributeName][currentName][
            timeSeriesName
          ] = timeSeriesArray;

          // store the slope range
          if (timeSeriesName == "slope") {
            var slopeExtent = d3.extent(timeSeriesArray);

            if (!(attributeName in finalSlopeRange)) {
              finalSlopeRange[attributeName] = slopeExtent;
            } else {
              if (slopeExtent[0] < finalSlopeRange[attributeName][0])
                finalSlopeRange[attributeName][0] = slopeExtent[0];
              if (slopeExtent[1] > finalSlopeRange[attributeName][1])
                finalSlopeRange[attributeName][1] = slopeExtent[1];
            }
          }
        }
      }
    }

    self.timeSeriesRegressionDict = finalTimeSeriesData;
    self.slopeRangeDict = finalSlopeRange;
  },
  createDate2IndexDict: function () {
    var self = this;

    var firstTimeStep = self.networkDict[self.nameList[0]][0].date;
    var lastTimeStep =
      self.networkDict[self.nameList[0]][self.numberOfTimeSteps - 1].date;
    var parseDate = d3.time.format("%Y-%m").parse;
    var currentDate = parseDate(firstTimeStep);
    var lastDate = parseDate(lastTimeStep);
    var dateIndex = 0;

    while (currentDate <= lastDate) {
      // construct time string
      var year = currentDate.getYear() + 1900;
      var month = currentDate.getMonth() + 1;
      month = month < 10 ? "0" + month.toString() : month.toString();
      var currentDateString = year + "-" + month;

      self.dateString2Index[currentDateString] = dateIndex;
      self.dateStringArray.push(currentDateString);

      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
      dateIndex++;
    }
  },
  createTimeSeriesDict: function () {
    var self = this;

    // * create data store for each structural property
    self.timeSeriesDict["Size"] = {};
    self.timeSeriesDict["Density"] = {};

    // size and density
    for (var name in self.networkDict) {
      var sizeArray = [],
        densityArray = [];

      for (var t = 0; t < self.networkDict[name].length; t++) {
        sizeArray.push(self.networkDict[name][t].size);
        densityArray.push(self.networkDict[name][t].density);
      }

      self.timeSeriesDict["Size"][name] = sizeArray;
      self.timeSeriesDict["Density"][name] = densityArray;
    }

    // * create data store for each attribute-based property
    for (var name in self.attributeDict) {
      var positionArraysOfCurrentPerson = {};
      for (var position in self.position2Index)
        positionArraysOfCurrentPerson[position] = [];

      for (var t = 0; t < self.attributeDict[name].length; t++) {
        for (var i = 0; i < self.attributeDict[name][t].length; i++) {
          var currentPosition = self.attributeDict[name][t][i].position;
          var positionFrequency = self.attributeDict[name][t][i].frequency;
          positionArraysOfCurrentPerson[currentPosition].push(
            positionFrequency
          );
        }

        // these positions were not contacted, add zero
        for (var position in self.position2Index)
          if (positionArraysOfCurrentPerson[position].length < t + 1)
            positionArraysOfCurrentPerson[position].push(0);
      }

      for (var position in self.position2Index) {
        if (!(position in self.timeSeriesDict))
          self.timeSeriesDict[position] = {};

        self.timeSeriesDict[position][name] =
          positionArraysOfCurrentPerson[position];
      }
    }
  },
  createRangeDict: function () {
    var self = this;

    for (var attribute in self.timeSeriesDict) {
      var min = Infinity,
        max = -Infinity;

      for (var name in self.timeSeriesDict[attribute]) {
        var currentTimeSeriesArray = self.timeSeriesDict[attribute][name];
        var currentTimeSeriesMin = d3.min(currentTimeSeriesArray);
        var currentTimeSeriesMax = d3.max(currentTimeSeriesArray);

        if (currentTimeSeriesMax > max) max = currentTimeSeriesMax;
        if (currentTimeSeriesMin < min) min = currentTimeSeriesMin;
      }

      self.rangeDict[attribute] = [min, max];
    }
  },
  appendEvent: function (eventName, startDate, endDate, name) {
    var self = this;

    var event = {
      eventName: eventName,
      startDate: startDate,
      endDate: endDate,
      name: name,
    };

    self.events.push(event);
  },
  convertIndex2TimeIndices: function (index) {
    var self = this;

    // start from 23 to 1
    for (
      var bucketSize = self.numberOfTimeSteps - 1;
      bucketSize >= 1;
      bucketSize--
    ) {
      // check if it belong to the current bucket
      if (index >= 0 && index < bucketSize) {
        var firstTimeIndex = self.numberOfTimeSteps - 1 - bucketSize;
        var secondTimeIndex = firstTimeIndex + index + 1;

        return [firstTimeIndex, secondTimeIndex];
      }

      index -= bucketSize;
    }
  },
  convertTimeIndices2Index: function (timeIndices) {
    var self = this;

    var sum = 0;
    var numberToMinus = self.numberOfTimeSteps - 1;
    for (var i = 0; i < timeIndices[0]; i++) {
      sum += numberToMinus;
      numberToMinus--;
    }

    var indexWithinBucket = timeIndices[1] - timeIndices[0] - 1;

    return sum + indexWithinBucket;
  },
};
