/*
 * Constructor for Panel class
 */
function Panel() {
	// insert div with certain dimensions to hold either an image or a form
};

Panel.prototype = {
		constructor: Panel
}

/*
 * Constructor for ViewPanel class inheriting from Panel
 */
function ViewPanel() {
	Panel.call(this);
	// insert a canvas tag to render slices of voxel data in a certain plane
	// have a slider to go through slices
	// drag cross hair to go through slices on other canvases
}
ViewPanel.prototype = Object.create(Panel.prototype);
ViewPanel.prototype.constructor = ViewPanel;

ViewPanel.prototype.render = function() {
	
}

/*
 * Constructor for QueryPanel class inheriting from Panel
 */
function QueryPanel() {
	Panel.call(this);
	// insert widgets from JQuery UI to submit to server via a form
}
QueryPanel.prototype = Object.create(Panel.prototype);
QueryPanel.prototype.constructor = QueryPanel;

/*
 * Constructor for Viewer class
 */
function Viewer(elementId) {
	// insert Panel objects
	this.elementId = elementId;
	var container = $('#'+this.elementId);
	container.append('<div id="coronal-view-panel"></div>');
	container.append('<div id="sagittal-view-panel"></div>');
	container.append('<div id="transverse-view-panel"></div>');
	container.append('<div id="query-panel"></div>');
	$('#'+this.elementId+' div').addClass('viewer-panel');
	$('[id*="view-panel"]').addClass('view-panel'); // attribute contains selector
	
	var currentCoronalSlide = 45;
	
	// get template data via AJAX request
	// on callback call render function to display initial data
	$.ajax({
		url: $SCRIPT_ROOT + '/get_template',
		method: 'GET',
		dataType: 'json',
		success: function(data) {
			// set property of Viewer instance to hold template data
			console.log('data received');
			// coronal slice
			var coronalViewPanel = $('#coronal-view-panel')
			for (var i = 0; i < data.length; i++) {
				var canvasId = 'coronal-view-panel-slice'+i;
				coronalViewPanel.append('<canvas id="'+canvasId+'" style="width:150px; height:150px; display: none;"></canvas>');
				// render each slice on current canvas
				var canvas = document.getElementById(canvasId);
				var ctx = canvas.getContext("2d");
				var xLen = data[0].length;
				var yLen = data[0][0].length
				var imgData = ctx.createImageData(xLen, yLen);
				/*for (var j = 0; j < imgData.data.length; j+=4) {
					imgData.data[j+0] = imgData.data[j+1] = imgData.data[j+2] = 255; //data[i][j];
					imgData.data[j+3] = 255;
				}*/
				for (var j = 0; j < yLen; j++) {
					for (var k = 0; k < xLen; k++) {
						var idx = 4 * (j * xLen + k);
						//console.log(k + '    ' + j)
						imgData.data[idx+0] = imgData.data[idx+1] = imgData.data[idx+2] = data[i][k][j];
						imgData.data[idx+3] = 255;
					}
				}
				ctx.putImageData(imgData, 50, 50);
			}
			// make initial slice visible
			$('#coronal-view-panel-slice'+currentCoronalSlide).show();
			coronalViewPanel.append('<div id="slider"></div>');
			$('#slider').slider({
				value: 45,
				min: 0,
				max: 90,
				step: 1,
				slide: function(event, ui) {
					$('#coronal-view-panel-slice'+currentCoronalSlide).hide();
					$('#coronal-view-panel-slice'+ui.value).show();
					currentCoronalSlide = ui.value;
				}
				
			});
			// stop loading gif
		}
	});
	// display loading gif while waiting for callback
	
	
	
};

Viewer.prototype = {
		constructor: Viewer,
		display: function() {
			
		}
}

$(document).ready(function() {
	// insert Viewer into div with id="viewer"
	var viewer = new Viewer("viewer");
});