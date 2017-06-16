
/*
 * Insert div where query report will go and start listening for query-update event which calls update function
 */
function QueryReport(containerId) {
	var instance = this;
	this._containerId = containerId;
	
	//$('#'+containerId).append('<div id="query-report-text">Displaying averaged density maps for datasets:</div>');
	
	$(document).on('query-update', function(event, newQuery) {
		instance.update(newQuery);
	});
}

QueryReport.prototype.constructor = QueryReport;

/*
 * do ajax request for query report and update query report display in callback
 */
QueryReport.prototype.update = function(queryData) {
	var instance = this;
	$.ajax({
		dataType: 'json',
		url: '/query_report?'+$.param(queryData),
		success: function(data) {
			$('#'+instance._containerId).empty();
			$('#'+instance._containerId).html('<div id="query-report-text">Displaying averaged density maps for datasets:</div>'
											+'<ul id="query-report-dataset-list">'
											+'</ul>');
			for (var key in data.dataset) {
				$('#query-report-dataset-list').append('<li>'+key+' ('+data.dataset[key]+' subjects)</li>');
			}
		} 
	});
}