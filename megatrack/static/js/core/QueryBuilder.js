var mgtrk = mgtrk || {};

mgtrk.QueryBuilder = (function() {

    const QueryBuilder = {};
    
    /**
     * Initialise a query builder object.
     *
     * @param {Object} _parent        The parent object.
     */
    QueryBuilder.init = (_parent) => {
        
        const containerId = _parent.queryBuilderId;
        
        const queryBuilder = {};
        
        queryBuilder.data = {};
        queryBuilder.datasetQueries = [];
        queryBuilder.datasetTableId = 'dataset-table';
        //queryBuilder.currentQuery = {};
        queryBuilder.queryInfoText = 'Subjects in current query: ';
        
        const buildQueryObject = function() {
            const newQuery = {};
            let queries = queryBuilder.datasetQueries;
            for (let i=0; i<queries.length; i++) {
                if (Object.keys(queries[i].constraints).length > 0 && !queries[i].excluded) {
                    newQuery[queries[i].datasetCode] = {
                                                            "method":$(`#${queries[i].datasetCode}-method-select`).val(),
                                                            "constraints": {}
                                                        };
                    for (let key in queries[i].constraints) {
                        let constraint = queries[i].constraints[key];
                        newQuery[queries[i].datasetCode].constraints[key] = {"type": queries[i].constraints[key].type};
                        switch (newQuery[queries[i].datasetCode].constraints[key].type) {
                            case "radio":
                                newQuery[queries[i].datasetCode].constraints[key].value = constraint.queryRow.find(`input[name="${key}"]:checked`).val();
                                break;
                            case "range":
                                newQuery[queries[i].datasetCode].constraints[key].min = $(constraint.sliderDiv).slider('values',0);
                                newQuery[queries[i].datasetCode].constraints[key].max = $(constraint.sliderDiv).slider('values',1);
                                break;
                            case "checkbox":
                                // not sure if the following selector + .val() gets all the vals or just one. need to check.
                                var vals = [];
                                constraint.queryRow.find(`input[name="${key}"]:checked`).each(function() {
                                                                                                    vals.push($(this).val());
                                                                                                });
                                if (vals.length > 0) {
                                    newQuery[queries[i].datasetCode].constraints[key].values = vals;
                                } else {
                                    // This is a bit of a hack to get round if there are no checkboxes selected.
                                    // I've got a bit of a dilemma about what's most logical for users when
                                    // querying a column on a set of two fixed values. Radio button and have user
                                    // remove constraint when they want to include all values. Or checkboxes and have
                                    // all checked and none checked meaning the same thing of include all values. Or all
                                    // checkboxes empty meaning no query?
                                    delete newQuery[queries[i].datasetCode].constraints[key];
                                }
                                break;
                        }
                    }
                }
                
            }
            return newQuery;
        };
        
        const addDatasetQuery = (tableId, datasetCode, dataset) => {
            
            const datasetQuery = {
                datasetCode: datasetCode,
                dataset: dataset,
                constraints: {},
                excluded: false
            };
            
            
            $(`#${tableId} > tbody`).append(`
                    <tr id="${datasetQuery.dataset.code}-query" class="dataset-query-row">
                        <td class="dataset-query-cell">
                            <div class="dataset-query-heading">${datasetQuery.dataset.name}</div>
                            <div class="dataset-query-constraint-select">
                                <select id="${datasetQuery.dataset.code}-query-select">
                                    <option value="default" disabled selected>Add constraint...</option>
                                </select>
                            </div>
                            <div class="dataset-query-method-select">
                                <select id="${datasetQuery.dataset.code}-method-select" class="select-small">
                                    <option value="default" disabled selected>Method...</option>
                                </select>
                            </div>       
                            <div class="dataset-remove">
                                <div id="${datasetQuery.dataset.code}-remove" class="clickable remove-icon dataset-remove-icon" title="Remove dataset"></div>
                            </div>
                            <div class="clear"></div>
                            <table id="${datasetQuery.dataset.code}-query-constraints-table" class="query-constraints-table"><tbody></tbody></table>
                        </td>
                    </tr>
                    <tr id="${datasetQuery.dataset.code}-spacer" class="dataset-spacer-row"><td></td></tr>`);
            
            // populate query select menu from query builder data for this dataset
            for (let key in dataset.queryParams) {
                $(`#${datasetQuery.dataset.code}-query-select`).append(`<option id="${key}" value="${key}">${datasetQuery.dataset.queryParams[key].label}</option>`);
            }
            
            // populate method select menu
            for (let i=0; i<datasetQuery.dataset.methods.length; i++) {
                const methodCode = datasetQuery.dataset.methods[i];
                $(`#${datasetQuery.dataset.code}-method-select`).append(`<option id="" value="${methodCode}">${methodCode}</option>`);
            }
            if ($(`#${datasetQuery.dataset.code}-method-select option[value=DTI]`)) {
                $(`#${datasetQuery.dataset.code}-method-select option[value=DTI]`).prop('selected', true);
            } else {
                $(`#${datasetQuery.dataset.code}-method-select option[value=${datasetQuery.dataset.methods[0]}]`).prop('selected', true);
            }
            
            // on query select, init a new QueryConstraint and add to list, disable that query from select
            $(`#${datasetQuery.dataset.code}-query-select`).change(function(event) {
                var queryCode = event.currentTarget.value;
                datasetQuery.constraints[queryCode] = addQueryConstraint(datasetQuery.dataset.queryParams[queryCode].type,
                                                                         queryCode, 
                                                                         datasetQuery.dataset.queryParams[queryCode],
                                                                         datasetQuery.dataset.code,
                                                                         datasetQuery
                                                                        );
                
                // disable current query from select
                $(`#${datasetQuery.dataset.code}-query-select option[value=${queryCode}]`).prop('disabled', true);
                // set selected value to 'Add query field...
                $(`#${datasetQuery.dataset.code}-query-select option[value=default]`).prop('selected', true);
                $('#update-query-button').trigger('constraint:change');
                return false;
                
                /*
                 * enable 'Update' button
                 * add constraint to dataset
                 */
                
            });
            
            // on method select, enable update query button
            $(`#${datasetQuery.dataset.code}-method-select`).change(function(event) {
                $('#update-query-button').trigger('constraint:change');
            });
            
            $('#'+datasetQuery.dataset.code+'-remove').on('click', function(event) {
                /*
                 * Remove current dataset from table
                 * Change dataset select default to 'Add dataset...' and enable all datasets
                 * Fire 'dataset:remove' event to trigger removal of tracts in renderers and TractSelect?
                 */
                $(`#add-dataset-select option[value=${datasetCode}]`).prop('disabled', false);
                $(`#add-dataset-select option[value=default`).html('Add dataset...');
                removeDatasetQuery(datasetQuery.dataset.code);
                
                // for now trigger dataset:change which will clear the renderers and TractTabs
                // since only one dataset can be selected at a time
                // eventually will need to enable #update-query-button
                // but disable it for now
                //$('#update-query-button').trigger('constraint:change');
                const updateButton = $('#update-query-button');
                updateButton.removeClass('update-query-button-active');
                updateButton.removeClass('clickable');
                updateButton.addClass('update-query-button-disabled');
                $(document).trigger('dataset:change', [datasetCode]);
                $('#query-info').html(`<span id="query-info-text">${queryBuilder.queryInfoText}0</span>`);
                _parent.currentQuery = {};
            });
            
            return datasetQuery;
            
        };
        
        const removeDatasetQuery = (datasetCode) => {
              var datasetQueries = queryBuilder.datasetQueries;
              for (let i=datasetQueries.length; i--;) {
                  if (datasetQueries[i].datasetCode === datasetCode) {
                      datasetQueries.splice(i,1);
                      break;
                  }
              }
              $(`#${datasetCode}-query`).remove();
              $(`#${datasetCode}-spacer`).remove();
        };
        
        const addQueryConstraint = (type, queryCode, queryParams, datasetCode, parent) => {
        
            const queryConstraint = {
                type: type,
                queryCode: queryCode,
                queryParams: queryParams,
                datasetCode: datasetCode,
                parent: parent
            };
            
            $(`#${datasetCode}-query-constraints-table > tbody`).append(`<tr id="${datasetCode}-${queryCode}-query" class="query-constraint-row">
                                                                            <td id="query-name" class="query-constraint-table-cell">${queryParams.label}</td>
                                                                            <td id="query-control" class="query-constraint-table-cell"></td>
                                                                            <td id="query-remove" class="query-constraint-table-cell"><div class="clickable remove-icon" title="Remove constraint"></div></td>
                                                                         </tr>
                                                                         <tr id="${datasetCode}-${queryCode}-spacer" class="query-constraint-spacer-row">
                                                                            <td></td><td></td><td></td>       
                                                                         </tr>`);
            
            // listener to remove constraint from query
            $(`#${datasetCode}-${queryCode}-query > #query-remove`).on('click', function(event) {
                if (!queryConstraint.parent.excluded) {
                    // remove constraint from parent object
                    delete queryConstraint.parent.constraints[queryCode];
                    // reenable this query in the select
                    $(`#${datasetCode}-query-select option[value=${queryCode}]`).prop('disabled', false);
                    // remove query row and spacer row
                    $(`#${datasetCode}-${queryCode}-query`).remove();
                    $(`#${datasetCode}-${queryCode}-spacer`).remove();
                    $('#update-query-button').trigger('constraint:change');
                }
                
                /*
                 * enable 'Update' button if there are still other constraints active
                 * disable 'Update' button if no more constraints active
                 * remove constraint from dataset
                 */
            });
            
            const rangeConstraint = function() {
                var instance = this;
                var controlCell = $(`#${queryConstraint.datasetCode}-${queryConstraint.queryCode}-query > #query-control`);
                controlCell.append('<div id="query-range-slider"></div>');
                queryConstraint.sliderDiv = $(`#${queryConstraint.datasetCode}-${queryConstraint.queryCode}-query > #query-control > #query-range-slider`);
                queryConstraint.sliderDiv.append('<div id="query-range-min-handle" class="ui-slider-handle query-slider-handle"></div>');
                queryConstraint.sliderDiv.append('<div id="query-range-max-handle" class="ui-slider-handle query-slider-handle"></div>');
                var minHandle = $(`#${queryConstraint.datasetCode}-${queryConstraint.queryCode}-query > #query-control > #query-range-slider > #query-range-min-handle`);
                var maxHandle = $(`#${queryConstraint.datasetCode}-${queryConstraint.queryCode}-query > #query-control > #query-range-slider > #query-range-max-handle`);
                queryConstraint.sliderDiv.slider({
                    range: true,
                    min: queryConstraint.queryParams.options.min,
                    max: queryConstraint.queryParams.options.max,
                    values: [queryConstraint.queryParams.options.initMin, queryConstraint.queryParams.options.initMax],
                    create: function() {
                        minHandle.text($(this).slider("values",0));
                        maxHandle.text($(this).slider("values",1));
                    },
                    slide: function(event, ui) {
                        // update range slider handle labels
                        minHandle.text(ui.values[0]);
                        maxHandle.text(ui.values[1]);
                    },
                    stop: function(event, ui) {
                        $('#update-query-button').trigger('constraint:change');
                    }
                });
            };
            
            const radioConstraint = function() {
                queryConstraint.queryRow = $('#'+queryConstraint.datasetCode+'-'+queryConstraint.queryCode+'-query');
                $('#'+queryConstraint.datasetCode+'-'+queryConstraint.queryCode+'-query > #query-control').append('<form>');
                var queryValues = queryConstraint.queryParams.options.values;
                var queryLabels = queryConstraint.queryParams.options.labels;
                for (let i=0; i<queryValues.length; i++) {
                    $(`#${queryConstraint.datasetCode}-${queryConstraint.queryCode}-query > #query-control > form`).append(`<input
                                                                                            type="radio" 
                                                                                            class="query-constraint" 
                                                                                            name="${queryConstraint.queryCode}" value="${queryValues[i]}" ${(i===0?'checked':'')}>
                                                                                            ${queryLabels[i]}`);
                }
            };
            
            const checkboxConstraint = function() {
                queryConstraint.queryRow = $('#'+queryConstraint.datasetCode+'-'+queryConstraint.queryCode+'-query');
                $(`#${queryConstraint.datasetCode}-${queryConstraint.queryCode}-query > #query-control`).append('<form>');
                var queryValues = queryConstraint.queryParams.options.values;
                var queryLabels = queryConstraint.queryParams.options.labels;
                for (let i=0; i<queryValues.length; i++) {
                    $(`#${queryConstraint.datasetCode}-${queryConstraint.queryCode}-query > #query-control > form`).append(`<input 
                                                                                            type="checkbox" 
                                                                                            class="query-constraint" 
                                                                                            name="${queryConstraint.queryCode}" value="${queryValues[i]}" checked>
                                                                                            <label class="query-constraint-checkbox-label">${queryLabels[i]}</label></form>`);
                }
            };
            
            // add functionality specific to constraint type
            switch (queryConstraint.type) {
                case "radio":
                    radioConstraint();
                    break;
                case "range":
                    rangeConstraint();
                    break;
                case "checkbox":
                    checkboxConstraint();
                    break;
            }
            
            return queryConstraint;
        };
        
        
        
        // insert div for query builder
        $(`#${containerId}`).append(`<div id="query-builder-container">
                                    <div class="dataset-select-container">
                                        <select id="add-dataset-select">
                                            <option value="default" disabled selected>Add dataset...</option>
                                        </select>
                                    </div>
                                    <div id="update-query-button"><span id="update-query-button-text">Update</span></div>
                                    <div id="query-info"></div>
                                    <div class="clear"></div>
                                    <hr>
                                    <div id="dataset-table-wrapper">
                                    <table id="dataset-table">
                                    <tbody>
                                    </tbody>
                                    </table>
                                    </div>
                                    </div>`);
        
        $('#query-info').html('<span id="query-info-text">'+queryBuilder.queryInfoText+'0</span>');
        
        // ajax call to get available datasets and associated query params
        $.ajax({
            url: _parent.rootPath + '/dataset_select',
            dataType: 'json',
            success: function(data) {
                // populate dataset select and attach data to QueryBuilder object
                //instance._data = data;
                for (let i in data) {
                    //$('#dataset-select').append('<li id="'+data[i].code+'"><div>'+data[i].name+'</div></li>');
                    $('#add-dataset-select').append('<option id="'+data[i].code+'" value="'+data[i].code+'">'+data[i].name+'</option>');
                    queryBuilder.data[data[i].code] = {
                                                        "code": data[i].code,
                                                        "methods": data[i].methods,
                                                        "name": data[i].name,
                                                        "queryParams":JSON.parse(data[i].query_params)
                                                    };
                }
            }
        });
        
        $('#add-dataset-select').change(function(event) {
            const datasetCode = event.currentTarget.value;
            
            /*
             * Remove any current dataset from the query builder table
             * Insert new dataset into the table
             * Change the select default to 'Change dataset...' and disable selected dataset
             * Fire 'dataset:change' so TractSelect can update with tracts available for current dataset
             */
            if (queryBuilder.datasetQueries.length) {
                var oldDatasetCode = queryBuilder.datasetQueries[0].datasetCode;
                removeDatasetQuery(oldDatasetCode);
                $(`#add-dataset-select option[value=${oldDatasetCode}]`).prop('disabled', false);
                queryBuilder.datasetQueries = [];
            }
            queryBuilder.datasetQueries.push(addDatasetQuery(queryBuilder.datasetTableId, datasetCode, queryBuilder.data[datasetCode]));
            $(`#add-dataset-select option[value=${datasetCode}]`).prop('disabled', true);
            $('#add-dataset-select option[value=default]').html('Change dataset...');
            $('#add-dataset-select option[value=default]').prop('selected', true);
            
            $(document).trigger('dataset:change', [datasetCode]);
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
            if (updateButton.hasClass('update-query-button-active')) {
                var newQuery = buildQueryObject();
                if (JSON.stringify(newQuery) != JSON.stringify(_parent.currentQuery)) {
                    $(document).trigger('query:update', newQuery); // trigger updating for tract explorer etc...
                    // show loading gif in #query-info div here
                    $('#query-info').html('<span id="query-info-text">'+queryBuilder.queryInfoText+'<div class="loading-gif"></div></span>');
                    $.ajax({
                        dataType: 'json',
                        url: _parent.rootPath + '/query_report?'+$.param(newQuery),
                        success: function(data) {
                            var totalSubjects = 0;
                            for (let key in data.dataset) {
                                totalSubjects += data.dataset[key];
                            }
                            $('#query-info').html('<span id="query-info-text">'+queryBuilder.queryInfoText+totalSubjects+'</span>');
                            
                            if (totalSubjects === 0) {
                                $(document).trigger('query:zero'); // calls listener in TractSelect
                            }
                            // *******************
                            // if totalSubjects > 0 need to reenable tract tabs, tracts etc if already disabled
                            // *******************
                        }
                    });
                    $.ajax({
                        url: _parent.rootPath + '/generate_mean_maps?'+$.param(newQuery),
                        success: function(data) {
                            // do nothing
                        } 
                    });
                }
                _parent.currentQuery = newQuery;
                updateButton.removeClass('update-query-button-active');
                updateButton.removeClass('clickable');
                updateButton.addClass('update-query-button-disabled');
            }
        });
        
        updateButton.on('constraint:change', function() {
            var newQuery = buildQueryObject();
            // This object comparison with stringify will fail if two objects
            // have the same properties but ordered differently
            if ($.isEmptyObject(newQuery) || JSON.stringify(newQuery) == JSON.stringify(_parent.currentQuery)) {
                updateButton.removeClass('update-query-button-active');
                updateButton.removeClass('clickable');
                updateButton.addClass('update-query-button-disabled');
            } else {
                updateButton.removeClass('update-query-button-disabled');
                updateButton.addClass('update-query-button-active');
                updateButton.addClass('clickable');
            }
        });
        
        $('#dataset-table').on('change', 'input', function(event) {
            updateButton.trigger('constraint:change');
            
            /*
             * Enable 'Update' button
             */
        });
        
        return {
                    currentQuery: null,
                    queryBuilder: queryBuilder
                };
    };
    
    return QueryBuilder;
})();



