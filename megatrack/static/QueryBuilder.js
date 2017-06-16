
function QueryBuilder(containerId) {
		var instance = this;
		this._data = {};
		this._datasetQueries = [];
		this._datasetTableId = 'dataset-table';
		this._currentQuery = {};
		
		// insert div for query builder
		$('#'+containerId).append('<div id="query-builder-container">'
									+'<table id="dataset-table">'
									+'<tbody>'
									+'</tbody>'
									+'</table>'
									+'<div id="add-dataset-button">Add dataset</div>'
									+'<div id="update-query-button">Update</div>'
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
						instance._datasetQueries.push(new DatasetQuery(instance._datasetTableId, datasetId, instance._data[datasetId]));
						// DatasetQuery init should insert a div into #dataset-table and setup other stuff
					}
				});
				
			}
		});
		
		$('#add-dataset-button').on('click', function(event) {
			$('#dataset-select').show('fade');
			// need to sort out the positioning of the dataset select here
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
							newQuery[queries[i]._datasetId][key]["values"] = constraint._queryRow.find('input[name="'+key+'"]:checked').val();
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
 * @param data is object defining the dataset name and possible query types
 * @returns
 */
function DatasetQuery(tableId, datasetId, dataset) {
	
	var instance = this;
	this._datasetId = datasetId;
	this._dataset = dataset;
	
	var testQueryParams = {
								"gender": {
									 "label":"Gender",
									 "type": "radio",
									 "options" :{
													"values": ["M", "F"],
													"labels": ["Male", "Female"]
												}
								},
								"age": {
										"label":"Age",
										"type": "range",
										"options": {
														"min": 18,
														"max": 99,
														"initMin": 20,
														"initMax": 60
														
													}
								},
								"handedness": {
										"label":"Handedness",
										"type": "radio",
										"options": {
														"values": ["R", "L"],
														"labels": ["Right", "Left"]
													}
								}
							}
	this._dataset.queryParams = testQueryParams;
	this._constraints = {};
	
	// insert a div into query builder div for this dataset
	$('#'+tableId+' > tbody').append('<tr id="'+this._dataset.code+'-query" class="dataset-query-row">'
										+'<td id="dataset-title-query-select">'
										+'<h3>'+this._dataset.name+'</h3>'
										+'<select id="'+this._dataset.code+'-query-select"><option value="default" disabled selected>Add constraint...</option></select>'
										+'</td>'
										+'<td id="'+this._dataset.code+'-query-constraints" class="query-constraints">'
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
		switch (instance._dataset.queryParams[queryCode].type) {
			case "radio":
				instance._constraints[queryCode] = new RadioQueryConstraint(queryCode, instance._dataset.queryParams[queryCode], instance._dataset.code);
				break;
			case "range":
				instance._constraints[queryCode] = new RangeQueryConstraint(queryCode, instance._dataset.queryParams[queryCode], instance._dataset.code);
				break;
			case "checkbox":
				instance._constraints[queryCode] = new CheckboxQueryConstraint(queryCode, instance._dataset.queryParams[queryCode], instance._dataset.code);
				break;
		}
		
		// disable current query from select
		$('#'+instance._dataset.code+'-query-select option[value='+queryCode+']').prop('disabled', true);
		// set selected value to 'Add query field...
		$('#'+instance._dataset.code+'-query-select option[value=default]').prop('selected', true);
		return false;
	});

};
DatasetQuery.prototype.constructor = DatasetQuery;

/*
 * I want this to be the superclass of more specific types of query constraints
 * with the functionality of this class to be inserting a div into the dataset
 * table with consistent styling for the label etc...
 * Will create the subclasses using this as a prototype and not maintain any
 * state in QueryConstraint itself as all the subclasses will have it on their
 * prototype chain. Object.create
 */
var QueryConstraint = {
		init: function() {
			// maybe don't need an init here, just call some common functions from the subclass inits
		},
		insertConstraintBar: function() {
			// insert a div into query builder for this query
		}
};

function RangeQueryConstraint(queryCode, queryParams, datasetCode) {
	var instance = this;
	this._type = "range";
	this._queryCode = queryCode;
	this._queryParams = queryParams;
	this._datasetCode = datasetCode;
	// insert a JQuery UI slider into the query constraint div
	$('#'+datasetCode+'-query-constraints-table > tbody').append('<tr id="'+datasetCode+'-'+queryCode+'-query" class="query-constraint-row">'
																+'<td id="query-name">'+queryParams.label+': </td>'
																+'<td id="query-control"></td>'
																+'<td id="query-remove"><span class="clickable ui-icon ui-icon-close" title="Remove tract"></span></td>'
																+'</tr>');
	// add a spacer row as well here for aesthetic purposes (See tract table)
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
	
	$('#'+datasetCode+'-'+queryCode+'-query > #query-remove').on('click', function(event) {
		// reenable this query in the select
		$('#'+datasetCode+'-query-select option[value='+queryCode+']').prop('disabled', false);
		// remove query row and spacer row
		$('#'+datasetCode+'-'+queryCode+'-query').remove();
	});
}
RangeQueryConstraint.prototype.constructor = RangeQueryConstraint;

RangeQueryConstraint.prototype.insertSlider = function() {
	
};

function RadioQueryConstraint(queryCode, queryParams, datasetCode) {
	var instance = this;
	this._type = "radio";
	this._queryCode = queryCode;
	this._queryParams = queryParams;
	this._datasetCode = datasetCode;
	$('#'+datasetCode+'-query-constraints-table > tbody').append('<tr id="'+datasetCode+'-'+queryCode+'-query" class="query-constraint-row">'
																+'<td id="query-name">'+queryParams.label+': </td>'
																+'<td id="query-control"></td>'
																+'<td id="query-remove"><span class="clickable ui-icon ui-icon-close" title="Remove tract"></span></td>'
																+'</tr>');
	this._queryRow = $('#'+datasetCode+'-'+queryCode+'-query');
	$('#'+datasetCode+'-'+queryCode+'-query > #query-control').append('<form>');
	var queryValues = queryParams.options.values;
	var queryLabels = queryParams.options.labels;
	for (var i=0; i<queryValues.length; i++) {
		$('#'+datasetCode+'-'+queryCode+'-query > #query-control > form').append('<input '
																				+'type="radio" '
																				+'name="'+queryCode+'" value="'+queryValues[i]+'" '+(i==0?'checked':'')+'>'
																				+queryLabels[i]);
	}
	
	$('#'+datasetCode+'-'+queryCode+'-query > #query-remove').on('click', function(event) {
		// reenable this query in the select
		$('#'+datasetCode+'-query-select option[value='+queryCode+']').prop('disabled', false);
		// remove query row and spacer row
		$('#'+datasetCode+'-'+queryCode+'-query').remove();
	});
	
}
RadioQueryConstraint.prototype.constructor = RadioQueryConstraint;

RadioQueryConstraint.insertRadioButtons = function() {
	
};

function CheckboxQueryConstraint(queryCode, queryParams, datasetCode) {
	var instance = this;
	this._type = "checkbox";
	this._queryCode = queryCode;
	this._queryParams = queryParams;
	this._datasetCode = datasetCode;
	$('#'+datasetCode+'-query-constraints-table > tbody').append('<tr id="'+datasetCode+'-'+queryCode+'-query" class="query-constraint-row">'
																+'<td id="query-name">'+queryParams.label+': </td>'
																+'<td id="query-control">checkboxes here</td>'
																+'<td id="query-remove"><span class="clickable ui-icon ui-icon-close" title="Remove tract"></span></td>'
																+'</tr>');
	
	$('#'+datasetCode+'-'+queryCode+'-query > #query-remove').on('click', function(event) {
		// reenable this query in the select
		$('#'+datasetCode+'-query-select option[value='+queryCode+']').prop('disabled', false);
		// remove query row and spacer row
		$('#'+datasetCode+'-'+queryCode+'-query').remove();
	});
}
CheckboxQueryConstraint.prototype.constructor = CheckboxQueryConstraint;

CheckboxQueryConstraint.insertCheckboxes = function() {
	
};


