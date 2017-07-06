
function QueryBuilder(containerId) {
		var instance = this;
		this._data = {};
		this._datasetQueries = [];
		this._datasetTableId = 'dataset-table';
		this._currentQuery = {};
		
		// insert div for query builder
		$('#'+containerId).append('<div id="query-builder-container">'
									+'<div id="add-dataset-button">Add dataset</div>'
									+'<div id="update-query-button">Update</div>'
									+'<table id="dataset-table">'
									+'<tbody>'
									+'</tbody>'
									+'</table>'
									+'<ul id="dataset-select"></ul>'
									+'</div>');
		$('#dataset-select').hide();
		
		// ajax call to get available datasets and associated query params
		$.ajax({
			url: '/dataset_select',
			dataType: 'json',
			success: function(data) {
				// populate dataset select and attach data to QueryBuilder object
				//instance._data = data;
				for (var i in data) {
					$('#dataset-select').append('<li id="'+data[i].code+'"><div>'+data[i].name+'</div></li>');
					instance._data[data[i].code] = {
														"code": data[i].code,
														"name": data[i].name,
														"queryParams":JSON.parse(data[i].query_params)
													}
				}
				$('#dataset-select').menu({
					select: function(event, ui) {
						$('#dataset-select').hide();
						ui.item.addClass('ui-state-disabled');
						var datasetId = ui.item[0].id;
						// add new DatasetQuery object to QueryBuilder's array
						instance._datasetQueries.push(new DatasetQuery(instance._datasetTableId, datasetId, instance._data[datasetId], instance));
						// DatasetQuery init should insert a div into #dataset-table and setup other stuff
					}
				});
				
			}
		});
		
		$('#add-dataset-button').on('click', function(event) {
			var datasetSelect = $('#dataset-select');
			var clickPosX = event.originalEvent.pageX;
			var clickPosY = event.originalEvent.pageY;
			var menuWidth = datasetSelect.width() + 5;
			var menuHeight = datasetSelect.height() + 5;
			var windowWidth = $(window).width();
			var windowHeight = $(window).height();
			if (windowWidth - clickPosX < menuWidth) {
				datasetSelect.css('left', clickPosX-menuWidth);
			} else {
				datasetSelect.css('left', clickPosX);
			}
			if (windowHeight - clickPosY < menuHeight) {
				datasetSelect.css('top', clickPosY-menuHeight);
			} else {
				datasetSelect.css('top', clickPosY);
			}
			datasetSelect.show('fade');
			// need to sort out the positioning of the dataset select here
		});
		
		$(document).on('click', function(event) {
			if (event.target.id != 'dataset-select') {
				$('#dataset-select').hide();
			}
		});
		
		$(window).resize(function() {
			$('#dataset-select').hide();
		});
		
		/*
		 * Add an Update button which constructs object of all currently selected queries and
		 * does request to server.
		 * Disable Update button if query has not been changed
		 * 
		 */
		$('#update-query-button').on('click', function() {
			var newQuery = {};
			var queries = instance._datasetQueries;
			for (var i=0; i<queries.length; i++) {
				newQuery[queries[i]._datasetId] = {};
				for (var key in queries[i]._constraints) {
					var constraint = queries[i]._constraints[key];
					newQuery[queries[i]._datasetId][key] = {"type": queries[i]._constraints[key]._type};
					switch (newQuery[queries[i]._datasetId][key].type) {
						case "radio":
							newQuery[queries[i]._datasetId][key]["value"] = constraint._queryRow.find('input[name="'+key+'"]:checked').val();
							break;
						case "range":
							newQuery[queries[i]._datasetId][key]["min"] = $(constraint._sliderDiv).slider('values',0);
							newQuery[queries[i]._datasetId][key]["max"] = $(constraint._sliderDiv).slider('values',1);
							break;
						case "checkbox":
							// not sure if the following selector + .val() gets all the vals or just one. need to check.
							var vals = [];
							constraint._queryRow.find('input[name="'+key+'"]:checked').each(function() {
																								vals.push($(this).val());
																							});
							if (vals.length > 0) {
								newQuery[queries[i]._datasetId][key]["values"] = vals;
							} else {
								// This is a bit of a hack to get round if there are no checkboxes selected.
								// I've got a bit of a dilemma about what's most logical for users when
								// querying a column on a set of two fixed values. Radio button and have user
								// remove constraint when they want to include all values. Or checkboxes and have
								// all checked and none checked meaning the same thing of include all values. Or all
								// checkboxes empty meaning no query?
								delete newQuery[queries[i]._datasetId][key];
							}
							break;
					}
				}
			}
			$.event.trigger('query-update', newQuery);
			instance._currentQuery = newQuery;
		});
		
};
QueryBuilder.prototype.constructor = QueryBuilder;

/**
 * @param tableId is the id of the table in which to insert a row
 * @param datasetId the dataset code
 * @param dataset is object defining the dataset code, name and possible query types
 * @param the parent of this query object which should be the QueryBuilder object
 * @returns
 */
function DatasetQuery(tableId, datasetId, dataset, parent) {
	
	var instance = this;
	this._datasetId = datasetId;
	this._dataset = dataset;
	this._parent = parent;
	this._constraints = {};
	
	// insert a div into query builder div for this dataset
	$('#'+tableId+' > tbody').append('<tr id="'+this._dataset.code+'-query" class="dataset-query-row">'
										+'<td class="dataset-title-query-select dataset-table-cell">'
										+'<h3>'+this._dataset.name+' <span id="'+this._dataset.code+'-remove" class="clickable ui-icon ui-icon-close" title="Remove dataset"></span></h3>'
										+'<select id="'+this._dataset.code+'-query-select"><option value="default" disabled selected>Add constraint...</option></select>'
										+'</td>'
										+'<td id="'+this._dataset.code+'-query-constraints" class="query-constraints dataset-table-cell">'
										+'<table id="'+this._dataset.code+'-query-constraints-table" class="query-constraints-table"><tbody></tbody></table>'
										+'</td>'
										+'</tr>');
	// populate query select menu from query builder data for this dataset
	for (var key in dataset.queryParams) {
		$('#'+instance._dataset.code+'-query-select').append('<option id="'+key+'" value="'+key+'">'+instance._dataset.queryParams[key].label+'</option>');
	}
	// on query select, init a new QueryConstraint and add to list, disable that query from select
	$('#'+this._dataset.code+'-query-select').change(function(event) {
		var queryCode = event.currentTarget.value;
		instance._constraints[queryCode] = new QueryConstraint(instance._dataset.queryParams[queryCode].type, queryCode, instance._dataset.queryParams[queryCode], instance._dataset.code, instance)
		
		// disable current query from select
		$('#'+instance._dataset.code+'-query-select option[value='+queryCode+']').prop('disabled', true);
		// set selected value to 'Add query field...
		$('#'+instance._dataset.code+'-query-select option[value=default]').prop('selected', true);
		return false;
	});
	
	$('#'+this._dataset.code+'-remove').on('click', function(event) {
		$('#dataset-select > #'+instance._dataset.code).removeClass('ui-state-disabled');
		var datasetQueries = instance._parent._datasetQueries;
		for (var i=0; i<datasetQueries.length; i++) {
			if (datasetQueries[i].code == this._datasetId) {
				datasetQueries.splice(i, 1);
				break;
			}
		}
		$('#'+instance._dataset.code+'-query').remove();
	});

};
DatasetQuery.prototype.constructor = DatasetQuery;

function QueryConstraint(type, queryCode, queryParams, datasetCode, parent) {
	var instance = this;
	this._type = type;
	this._queryCode = queryCode;
	this._queryParams = queryParams;
	this._datasetCode = datasetCode;
	this._parent = parent;
	
	$('#'+datasetCode+'-query-constraints-table > tbody').append('<tr id="'+datasetCode+'-'+queryCode+'-query" class="query-constraint-row">'
																+'<td id="query-name" class="query-constraint-table-cell">'+queryParams.label+': </td>'
																+'<td id="query-control" class="query-constraint-table-cell"></td>'
																+'<td id="query-remove" class="query-constraint-table-cell"><span class="clickable ui-icon ui-icon-close" title="Remove constraint"></span></td>'
																+'</tr>'
																+'<tr id="'+datasetCode+'-'+queryCode+'-spacer" class="query-constraint-spacer-row"><td></td><td></td><td></td></tr>');
	
	// listener to remove constraint from query
	$('#'+datasetCode+'-'+queryCode+'-query > #query-remove').on('click', function(event) {
		// remove constraint from parent object
		delete instance._parent._constraints[queryCode];
		// reenable this query in the select
		$('#'+datasetCode+'-query-select option[value='+queryCode+']').prop('disabled', false);
		// remove query row and spacer row
		$('#'+datasetCode+'-'+queryCode+'-query').remove();
		$('#'+datasetCode+'-'+queryCode+'-spacer').remove();
	});
	
	// add functionality specific to constraint type
	switch (this._type) {
		case "radio":
			this.radioConstraint();
			break;
		case "range":
			this.rangeConstraint();
			break;
		case "checkbox":
			this.checkboxConstraint();
			break;
	}
	
}

QueryConstraint.prototype.constructor = QueryConstraint;

QueryConstraint.prototype.rangeConstraint = function() {
	var instance = this;
	var controlCell = $('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control')
	controlCell.append('<div id="query-range-slider"></div>');
	this._sliderDiv = $('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control > #query-range-slider');
	this._sliderDiv.append('<div id="min-handle" class="ui-slider-handle query-slider-handle"></div>');
	this._sliderDiv.append('<div id="max-handle" class="ui-slider-handle query-slider-handle"></div>');
	var minHandle = $('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control > #query-range-slider > #min-handle');
	var maxHandle = $('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control > #query-range-slider > #max-handle');
	this._sliderDiv.slider({
		range: true,
		min: instance._queryParams.options.min,
		max: instance._queryParams.options.max,
		values: [instance._queryParams.options.initMin, instance._queryParams.options.initMax],
		create: function() {
			minHandle.text($(this).slider("values",0));
			maxHandle.text($(this).slider("values",1));
		},
		slide: function(event, ui) {
			// update age range slider label
			minHandle.text(ui.values[0]);
			maxHandle.text(ui.values[1]);
		}
	});
}

QueryConstraint.prototype.radioConstraint = function() {
	this._queryRow = $('#'+this._datasetCode+'-'+this._queryCode+'-query');
	$('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control').append('<form>');
	var queryValues = this._queryParams.options.values;
	var queryLabels = this._queryParams.options.labels;
	for (var i=0; i<queryValues.length; i++) {
		$('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control > form').append('<input '
																				+'type="radio" '
																				+'name="'+this._queryCode+'" value="'+queryValues[i]+'" '+(i==0?'checked':'')+'>'
																				+queryLabels[i]);
	}
}

QueryConstraint.prototype.checkboxConstraint = function() {
	this._queryRow = $('#'+this._datasetCode+'-'+this._queryCode+'-query');
	$('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control').append('<form>');
	var queryValues = this._queryParams.options.values;
	var queryLabels = this._queryParams.options.labels;
	for (var i=0; i<queryValues.length; i++) {
		$('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control > form').append('<input '
																				+'type="checkbox" '
																				+'name="'+this._queryCode+'" value="'+queryValues[i]+'" '+(i==0?'checked':'')+'>'
																				+queryLabels[i]);
	}
}

