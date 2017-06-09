
/*
 * Insert div where query report will go and start listening for query-update event which calls update function
 */
function QueryReport() {
	var instance = this;
	
	$(document).on('query-update', function(event, newQuery) {
		console.log(newQuery);
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
		contentType: 'application/json',
		data: queryData,
		url: '/query_report',
		success: function(data) {
			
		} 
	});
}