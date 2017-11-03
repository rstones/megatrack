
function QueryBuilder(containerId, rootPath) {
		var instance = this;
		this._rootPath = rootPath;
		this._data = {};
		this._datasetQueries = [];
		this._datasetTableId = 'dataset-table';
		this._currentQuery = {};
		this._queryInfoText = 'Subjects in current query: ';
		
		// insert div for query builder
		$('#'+containerId).append('<div id="query-builder-container">'
									+'<div class="dataset-select-container"><select id="add-dataset-select"><option value="default" disabled selected>Add dataset...</option></select></div>'
									+'<div id="update-query-button">Update</div>'
									+'<div id="query-info"></div>'
									+'<div class="clear"></div>'
									+'<hr>'
									+'<table id="dataset-table">'
									+'<tbody>'
									+'</tbody>'
									+'</table>'
									+'</div>');
		
		$('#query-info').html('<div id="query-report-text">'+instance._queryInfoText+'0</div>');
		
		// ajax call to get available datasets and associated query params
		$.ajax({
			url: instance._rootPath + '/dataset_select',
			dataType: 'json',
			success: function(data) {
				// populate dataset select and attach data to QueryBuilder object
				//instance._data = data;
				for (var i in data) {
					//$('#dataset-select').append('<li id="'+data[i].code+'"><div>'+data[i].name+'</div></li>');
					$('#add-dataset-select').append('<option id="'+data[i].code+'" value="'+data[i].code+'">'+data[i].name+'</option>');
					instance._data[data[i].code] = {
														"code": data[i].code,
														"name": data[i].name,
														"queryParams":JSON.parse(data[i].query_params)
													}
				}
			}
		});
		
		$('#add-dataset-select').change(function(event) {
			var datasetCode = event.currentTarget.value;
			$('#add-dataset-select option[value='+datasetCode+']').prop('disabled', true);
			$('#add-dataset-select option[value=default]').prop('selected', true);
			instance._datasetQueries.push(new DatasetQuery(instance._datasetTableId, datasetCode, instance._data[datasetCode], instance));
		});
		
		/*
		 * Add an Update button which constructs object of all currently selected queries and
		 * does request to server.
		 * Disable Update button if query has not been changed
		 * 
		 */
		var updateButton = $('#update-query-button');
		updateButton.addClass('update-query-button-disabled');
		updateButton.on('click', function() {
			var newQuery = instance.buildQueryObject();
			if (JSON.stringify(newQuery) != JSON.stringify(instance._currentQuery)) {
				$.event.trigger('query-update', newQuery); // trigger updating for tract explorer etc...
				// show loading gif in #query-info div here
				$('#query-info').html('<div id="query-report-text">'+instance._queryInfoText+'<div class="loading-gif"></div></div>');
				$.ajax({
					dataType: 'json',
					url: instance._rootPath + '/query_report?'+$.param(newQuery),
					success: function(data) {
						var totalSubjects = 0
						for (var key in data.dataset) {
							totalSubjects += data.dataset[key];
						}
						$('#query-info').html('<div id="query-report-text">'+instance._queryInfoText+totalSubjects+'</div>');
					} 
				});
				$.ajax({
					url: instance._rootPath + '/generate_mean_maps?'+$.param(newQuery),
					success: function(data) {
						// do nothing
					} 
				});
			}
			instance._currentQuery = newQuery;
			updateButton.removeClass('update-query-button-active');
			updateButton.addClass('update-query-button-disabled');
		});
		
		updateButton.on('query:change', function() {
			var newQuery = instance.buildQueryObject();
			// This object comparison will fail if two objects have the same properties
			// but ordered differently
			if ($.isEmptyObject(newQuery)) {
				updateButton.removeClass('update-query-button-active');
				updateButton.addClass('update-query-button-disabled');
			} else if (JSON.stringify(newQuery) != JSON.stringify(instance._currentQuery)) {
				updateButton.removeClass('update-query-button-disabled');
				updateButton.addClass('update-query-button-active');
			}
		});
		
		$('#dataset-table').on('change', 'input', function(event) {
			updateButton.trigger('query:change');
		});
		
};
QueryBuilder.prototype.constructor = QueryBuilder;

QueryBuilder.prototype.buildQueryObject = function() {
	var newQuery = {};
	var queries = this._datasetQueries;
	for (var i=0; i<queries.length; i++) {
		if (Object.keys(queries[i]._constraints).length > 0 && !queries[i]._excluded) {
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
		
	}
	return newQuery;
}

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
	this._excluded = false;
	
	$('#'+tableId+' > tbody').append('<tr id="'+this._dataset.code+'-query" class="dataset-query-row"><td class="dataset-query-cell">'
			+'<div class="dataset-query-heading">'+this._dataset.name+'</div>'
			+'<div class="dataset-query-constraint-select"><select id="'+this._dataset.code+'-query-select"><option value="default" disabled selected>Add constraint...</option></select></div>'
			+'<div class="dataset-exclude"><form><input id="'+this._dataset.code+'-exclude" type="checkbox"><label class="dataset-exclude-label" for="'+this._dataset.code+'-exclude">Exclude</label></form></div>'
			//+'<div class="dataset-remove"><span id="'+this._dataset.code+'-remove" class="clickable ui-icon ui-icon-close" title="Remove dataset"></span></div>'
			+'<div class="dataset-remove"><div id="'+this._dataset.code+'-remove" class="clickable remove-icon dataset-remove-icon" title="Remove dataset"></div></div>'
			+'<div class="clear"></div>'
			+'<table id="'+this._dataset.code+'-query-constraints-table" class="query-constraints-table"><tbody></tbody></table>'
			+'</td></tr>'
			+'<tr id="'+this._dataset.code+'-spacer" class="dataset-spacer-row"><td></td></tr>');
	
	// populate query select menu from query builder data for this dataset
	for (var key in dataset.queryParams) {
		$('#'+instance._dataset.code+'-query-select').append('<option id="'+key+'" value="'+key+'">'+instance._dataset.queryParams[key].label+'</option>');
	}
	// on query select, init a new QueryConstraint and add to list, disable that query from select
	$('#'+this._dataset.code+'-query-select').change(function(event) {
		var queryCode = event.currentTarget.value;
		instance._constraints[queryCode] = new QueryConstraint(instance._dataset.queryParams[queryCode].type, queryCode, instance._dataset.queryParams[queryCode], instance._dataset.code, instance);
		
		// disable current query from select
		$('#'+instance._dataset.code+'-query-select option[value='+queryCode+']').prop('disabled', true);
		// set selected value to 'Add query field...
		$('#'+instance._dataset.code+'-query-select option[value=default]').prop('selected', true);
		$('#update-query-button').trigger('query:change');
		return false;
	});
	
	// on exclude checkbox being ticked, disable the dataset from future queries
	$('#'+this._dataset.code+'-exclude').on('change', function() {
		if ($('#'+instance._dataset.code+'-exclude').prop('checked')) {
			// switch class to excluded style for this dataset
			$('#'+instance._dataset.code+'-query').addClass('dataset-query-row-excluded');
			// disable the "Add constraint..." select
			$('#'+instance._dataset.code+'-query-select').prop('disabled', true);
			// switch the class of the query constraint rows to excluded style, disable their inputs
			$('#'+instance._dataset.code+'-query-constraints-table').find('input').each(function(){
																						$(this).prop('disabled', true);
																					});
			$('#'+instance._dataset.code+'-query-constraints-table').find('.ui-slider').each(function() {
				$(this).slider('option', 'disabled', true);
			});
			// disable the remove icons of the query constraint rows
			$('#'+instance._dataset.code+'-query-constraints-table').find('.remove-icon').each(function() {
				$(this).removeClass('clickable');
				$(this).removeClass('remove-icon');
				$(this).addClass('remove-icon-disabled');
			});
			
			// exclude in all future updates (ie. in buildQuery function), set a flag on the DatasetQuery obj for this
			instance._excluded = true;
			// enable "Update" button
			$('#update-query-button').trigger('query:change');
		} else {
			$('#'+instance._dataset.code+'-query').removeClass('dataset-query-row-excluded');
			$('#'+instance._dataset.code+'-query-select').prop('disabled', false);
			$('#'+instance._dataset.code+'-query-constraints-table').find('input').each(function(){
																						$(this).prop('disabled', false);
																					});
			$('#'+instance._dataset.code+'-query-constraints-table').find('.ui-slider').each(function() {
				$(this).slider('option', 'disabled', false);
			});
			$('#'+instance._dataset.code+'-query-constraints-table').find('.remove-icon-disabled').each(function() {
				$(this).addClass('clickable');
				$(this).removeClass('remove-icon-disabled');
				$(this).addClass('remove-icon');
			});
			instance._excluded = false;
			// enable "Update" button
			$('#update-query-button').trigger('query:change');
		}
	});
	
	$('#'+this._dataset.code+'-remove').on('click', function(event) {
		$('#add-dataset-select option[value='+instance._dataset.code+']').prop('disabled', false);
		var datasetQueries = instance._parent._datasetQueries;
		for (var i=0; i<datasetQueries.length; i++) {
			if (datasetQueries[i].code == this._datasetId) {
				datasetQueries.splice(i, 1);
				break;
			}
		}
		$('#'+instance._dataset.code+'-query').remove();
		$('#update-query-button').trigger('query:change');
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
																+'<td id="query-name" class="query-constraint-table-cell">'+queryParams.label+'</td>'
																+'<td id="query-control" class="query-constraint-table-cell"></td>'
																//+'<td id="query-remove" class="query-constraint-table-cell"><span class="clickable ui-icon ui-icon-close" title="Remove constraint"></span></td>'
																+'<td id="query-remove" class="query-constraint-table-cell"><div class="clickable remove-icon" title="Remove constraint"></div></td>'
																+'</tr>'
																+'<tr id="'+datasetCode+'-'+queryCode+'-spacer" class="query-constraint-spacer-row"><td></td><td></td><td></td></tr>');
	
	// listener to remove constraint from query
	$('#'+datasetCode+'-'+queryCode+'-query > #query-remove').on('click', function(event) {
		if (!parent._excluded) {
			// remove constraint from parent object
			delete instance._parent._constraints[queryCode];
			// reenable this query in the select
			$('#'+datasetCode+'-query-select option[value='+queryCode+']').prop('disabled', false);
			// remove query row and spacer row
			$('#'+datasetCode+'-'+queryCode+'-query').remove();
			$('#'+datasetCode+'-'+queryCode+'-spacer').remove();
			$('#update-query-button').trigger('query:change');
		}
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
	this._sliderDiv.append('<div id="query-range-min-handle" class="ui-slider-handle query-slider-handle"></div>');
	this._sliderDiv.append('<div id="query-range-max-handle" class="ui-slider-handle query-slider-handle"></div>');
	var minHandle = $('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control > #query-range-slider > #query-range-min-handle');
	var maxHandle = $('#'+this._datasetCode+'-'+this._queryCode+'-query > #query-control > #query-range-slider > #query-range-max-handle');
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
			$('#update-query-button').trigger('query:change');
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
																				+'class="query-constraint" '
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
																				+'class="query-constraint" '
																				+'name="'+this._queryCode+'" value="'+queryValues[i]+'" checked>'
																				+'<label class="query-constraint-checkbox-label">'+queryLabels[i]+'</label>');
	}
}

