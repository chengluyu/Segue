var margin = 8;
var full = "100%";

var leftContentWidth = 600;
var rightContentWidth = 900;
var fullHeight = 800;

// right bottom
var tableViewWidth = 478;
var eventViewWidth = 410;

var tableViewHeight = 377;
var tableLegendHeight = 30;
var eventViewHeight = 377;

// right top
var flowViewSvgWidth = 898;
var flowViewWidth = 898;
var flowViewFlowWrapperWidth = "calc(100% - 1px)"

var flowSvgHeight = 313;
var timelineSvgHeight = 80;
var menuBarHeight = 20;

$(function() {
	// contents
	$("#left-content")
		.css("width", leftContentWidth)
		.css("height", fullHeight)
		.css("margin-right", margin + 2);
	$("#right-content")
		.css("width", rightContentWidth)
		.css("height", fullHeight);
	$("#right-content #upper-content")
		.css("width", full)
		.css("margin-bottom", margin);
	$("#right-content #lower-content")
		.css("width", full);

	// left content
	$("#mds-view")
		.css("width", full)
		.css("height", full);
	$("#mds-view #heatmap")
		.css("width", full)
		.css("height", full);
	$("#mds-view .scatterplot-container")
		.css("width", full)
		.css("height", full);
	d3.select("#mds-view #scatterplot")
		.attr("width", full)
		.attr("height", full);

	// right upper contents
	$("#flow-view")
		.css("width", flowViewWidth)
		.css("height", flowSvgHeight + timelineSvgHeight + menuBarHeight);
	$("#flow-view .ui-menu-bar")
		.css("width", full)
		.css("height", menuBarHeight);
	$("#flow-view #timeline-flow")
		.css("width", full)
		.css("height", flowSvgHeight + timelineSvgHeight);
	$("#flow-view #timeline-flow #timeline-wrapper")
		.css("width", full)
		.css("height", timelineSvgHeight);
	$("#flow-view #timeline-flow #flow-wrapper")
		.css("width", flowViewFlowWrapperWidth)
		.css("height", flowSvgHeight - 2);

	d3.select("#flow-view .ui-menu-bar .control")
		.attr("width", flowViewSvgWidth - 200)
		.attr("height", menuBarHeight);
	d3.select("#flow-view #timeline-flow #timeline-wrapper #timeline")
		.attr("width", flowViewSvgWidth)
		.attr("height", timelineSvgHeight);	
	d3.select("#flow-view #timeline-flow #flow-wrapper #chart")
		.attr("width", flowViewSvgWidth)
		.attr("height", flowSvgHeight - 10); // -10 to prevent y overflow at the beginning

	// right lower contents
	$("#table-view")
		.css("width", tableViewWidth)
		.css("height", tableViewHeight);
	$("#table-view #table-wrapper")
		.css("width", tableViewWidth)
		.css("height", tableViewHeight - tableLegendHeight);
	$("#event-view")
		.css("width", eventViewWidth)
		.css("height", eventViewHeight)
		.css("margin-right", margin);

	d3.select("#event-view #event-editor")
		.attr("width", eventViewWidth)
		.attr("height", eventViewHeight);

	d3.select("#table-view #table-legend")
		.attr("width", tableViewWidth)
		.attr("height", tableLegendHeight);
	d3.select("#table-view #table")
		.attr("width", tableViewWidth)
		.attr("height", tableViewHeight - tableLegendHeight - 10);

	Database.getData();
});

function clickcancel() {
  var event = d3.dispatch('click', 'dblclick');
  function cc(selection) {
      var down, tolerance = 5, last, wait = null, args;
      // euclidean distance
      function dist(a, b) {
          return Math.sqrt(Math.pow(a[0] - b[0], 2), Math.pow(a[1] - b[1], 2));
      }
      selection.on('mousedown', function() {
          down = d3.mouse(document.body);
          last = +new Date();
          args = arguments;
      });
      selection.on('mouseup', function() {
          if (dist(down, d3.mouse(document.body)) > tolerance) {
              return;
          } else {
              if (wait) {
                  window.clearTimeout(wait);
                  wait = null;
                  event.dblclick.apply(this, args);
              } else {
                  wait = window.setTimeout((function() {
                      return function() {
                          event.click.apply(this, args);
                          wait = null;
                      };
                  })(), 300);
              }
          }
      });
  };
  return d3.rebind(cc, event, 'on');
}