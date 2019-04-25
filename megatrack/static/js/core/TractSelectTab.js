var mgtrk = mgtrk || {};

mgtrk.TractSelectTab = (function() {
    
    const TractSelectTab = {};
    
    TractSelectTab.init = (_parent) => {
    
        const tractSelectTab = {
            data: {},
            availableTracts: {},
            currentDatasetMethod: []
        };
        
        tractSelectTab.templates = (removeIcons) => {
            
            const contentTemplate = function(state, wrapperId, contentsId) {
                $(`#${contentsId}`).append(`<div id="${wrapperId}" class="tract-select-tab">
                                                <div class="dataset-query-builder-container">
                                                    <div class="dataset-select-container">
                                                        <select id="dataset-select">
                                                            <option value="default" disabled selected>Add dataset...</option>
                                                        </select>
                                                        <select id="add-constraint-select" disabled>
                                                            <option value="default" disabled selected>Add constraint...</option>
                                                        </select>
                                                    </div>
                                                    <div class="constraints-table-container"> <!-- formerly .dataset-table-wrapper -->
                                                        <table id="constraints-table"> <!-- formerly .dataset-table -->
                                                            <tbody>
                                                            
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                                <div class="tract-select-container">
                                                    <select id="tract-select" disabled>
                                                        <option value="default" disabled selected>Select tract...</option>
                                                    </select>
                                                    <div id="add-tract-query-button" class="button-disabled">
                                                        <span id="add-tract-query-button-text">Add</span>
                                                    </div>
                                                </div>
                                            </div>`);
                                            
                                            
                                            
                // ajax call to get available datasets and associated query params
                $.ajax({
                    url: _parent.rootPath + '/dataset_select',
                    dataType: 'json',
                    success: function(data) {
                        // populate dataset select and attach data to QueryBuilder object
                        for (let i = 0; i < data.length; i++) {
                            let datasetCode = data[i].code;
                            tractSelectTab.data[datasetCode] = {
                                methods: data[i].methods,
                                queryParams: JSON.parse(data[i].query_params)
                            };
                            for (let j = 0; j < data[i].methods.length; j++) {
                                let methodCode = data[i].methods[j];
                                let datasetMethodName = `${data[i].name} (${methodCode})`;
                                tractSelectTab.data[datasetCode][methodCode] = {name: datasetMethodName};
                                $('#dataset-select').append(
                                            `<option id="${datasetCode}-${methodCode}" value='["${datasetCode}","${methodCode}"]'>${datasetMethodName}</option>`
                                            );
                            }
                            
                        }
                    }
                });
                
                $.ajax({
                    dataType: 'json',
                    url: _parent.rootPath + '/tract_select',
                    success: function(data) {
                        for (let tractCode in data) {
                            $('#tract-select').append(`<option id="${tractCode}" value="${tractCode}">${data[tractCode].name}</option>`);
                            data[tractCode].disabled = false;
                            tractSelectTab.availableTracts[tractCode] = data[tractCode];
                        }
                    }
                });
                
                $('#dataset-select').change(function(event) {
                    const targetVal = JSON.parse(event.currentTarget.value);
                    tractSelectTab.currentDatasetMethod = targetVal;
                    const datasetCode = targetVal[0];
                    const methodCode = targetVal[1];
                    
                    // disable currently selected option
                    $(`#add-dataset-select option#${datasetCode}-${methodCode}`).prop('disabled', true);
                    
                    // enable and repopulate constraints select with available
                    // options for selected dataset
                    const $addConstSelect = $(`#add-constraint-select`);
                    const constraints = tractSelectTab.data[datasetCode].queryParams;
                    $('#add-constraint-select > option[value!=default]').remove();
                    for (let key in constraints) {
                        $addConstSelect.append(
                            `<option id="${key}" value="${key}">${constraints[key].label}</option>`
                        );
                    }
                    $addConstSelect.prop('disabled', false);
                    
                    // clear the constraints table
                    $('#constraints-table > tbody').children().remove();
                    
                    // disable tract select and Add button
                    $('#tract-select').prop('disabled', true);
                    $('#add-tract-query-button').prop('disabled', true);
                    
                    // disable/enable allowed tracts for selected dataset in the tract select
                    $('#tract-select > option').each(function(idx, el) {
                        const tractCode = $(this).attr('id');
                        const tract = tractSelectTab.availableTracts[tractCode];
                        if (!tract) { return; }
                        if (!tract.datasets[datasetCode]) {
                            $(this).prop('disabled', true);
                        } else if (tract.datasets[datasetCode] && tract.datasets[datasetCode].indexOf(methodCode) == -1) {
                            $(this).prop('disabled', true);
                        } else {
                            $(this).prop('disabled', false);
                        }
                    });
                });
                
                $('#add-constraint-select').change(function(event) {
                    const constraintCode = event.currentTarget.value;
                    
                    const datasetSelectVal = JSON.parse($('#dataset-select').val());
                    const datasetCode = datasetSelectVal[0];
                    const methodCode = datasetSelectVal[1];
                    
                    const constraints = tractSelectTab.data[datasetCode].queryParams[constraintCode];
                    
                    // add constraint to constraints table
                    $('#constraints-table > tbody').append(
                        `<tr id="${constraintCode}-constraint" class="query-constraint-row"
                                        data-constraint-code="${constraintCode}" data-constraint-type="${constraints.type}">
                            <td id="query-name" class="query-constraint-table-cell">${constraints.label}</td>
                            <td id="query-control" class="query-constraint-table-cell"></td>
                            <td id="query-remove" class="query-constraint-table-cell"><div class="clickable remove-icon" title="Remove constraint"></div></td>
                         </tr>
                         <tr id="${constraintCode}-spacer" class="query-constraint-spacer-row">
                            <td></td><td></td><td></td>       
                         </tr>`
                    );
                    
                    $(`#${constraintCode}-constraint > #query-remove`).click(function(event) {
                        // remove the relevant row from the constraints table
                        $(`tr#${constraintCode}-constraint`).remove();
                        $(`tr#${constraintCode}-spacer`).remove();
                        
                        // enable the option in constraint select
                        $(`#add-constraint-select > option[value=${constraintCode}]`).prop('disabled', false); 
                    });
                    
                    const rangeConstraint = function() {
                        const instance = this;
                        const controlCell = $(`#${constraintCode}-constraint > #query-control`);
                        controlCell.append('<div id="query-range-slider"></div>');
                        const $slider = $(`#${constraintCode}-constraint > #query-control > #query-range-slider`);
                        $slider.append('<div id="query-range-min-handle" class="ui-slider-handle query-slider-handle"></div>');
                        $slider.append('<div id="query-range-max-handle" class="ui-slider-handle query-slider-handle"></div>');
                        const minHandle = $slider.find('#query-range-min-handle');
                        const maxHandle = $slider.find('#query-range-max-handle');
                        $slider.slider({
                            range: true,
                            min: constraints.options.min,
                            max: constraints.options.max,
                            values: [constraints.options.initMin, constraints.options.initMax],
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
                                // $('#update-query-button').trigger('constraint:change');
                                /*
                                    Trigger a constraint:change event on the appropriate element here?
                                */
                            }
                        });
                    };
                    
                    const radioConstraint = function() {
                        //queryConstraint.queryRow = $('#'+queryConstraint.datasetCode+'-'+queryConstraint.queryCode+'-query');
                        $(`#${constraintCode}-constraint > #query-control`).append('<form>');
                        const queryValues = constraints.options.values;
                        const queryLabels = constraints.options.labels;
                        for (let i=0; i<queryValues.length; i++) {
                            $(`#${constraintCode}-constraint > #query-control > form`).append(
                                    `<input type="radio" class="query-constraint" 
                                        name="${constraintCode}" value="${queryValues[i]}" ${(i===0?'checked':'')}>
                                        <label class="query-constraint-checkbox-label">${queryLabels[i]}</label></form>`);
                        }
                    };
                    
                    const checkboxConstraint = function() {
                        //queryConstraint.queryRow = $(`#${datasetCode}-${methodCode}-${queryConstraint.queryCode}-query`);
                        $(`#${constraintCode}-constraint > #query-control`).append('<form>');
                        const queryValues = constraints.options.values;
                        const queryLabels = constraints.options.labels;
                        for (let i=0; i<queryValues.length; i++) {
                            $(`#${constraintCode}-constraint > #query-control > form`).append(
                                    `<input type="checkbox" class="query-constraint"
                                        name="${constraintCode}" value="${queryValues[i]}" checked>
                                        <label class="query-constraint-checkbox-label">${queryLabels[i]}</label></form>`);
                        }
                    };
                    
                    // add functionality specific to constraint type
                    switch (constraints.type) {
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
                    
                    // disable the selected constraint in the select and reset
                    // select to default option
                    $(`#add-constraint-select > option[value=${constraintCode}]`).prop('disabled', true);
                    $('#add-constraint-select > option[value=default]').prop('selected', true);
                    
                    // enable tract select and disable tracts not available for this dataset
                    $('#tract-select').prop('disabled', false);
                    
                });
                
                $('#tract-select').change(function(event) {
                    // enable Add button
                    $('#add-tract-query-button').removeClass('button-disabled');
                    $('#add-tract-query-button').addClass('button');
                });
                
                $('#add-tract-query-button').click(function(event) {
                    if (!$('#add-tract-query-button').hasClass('button-disabled')) {
                        // build the new query and send the request for a given tract
                        // loop over rows in #constraints-table
                        // get query id and values depending on range, checkbox, radio
                        const datasetCode = tractSelectTab.currentDatasetMethod[0];
                        const methodCode = tractSelectTab.currentDatasetMethod[1];
                        const newQuery = {};
                        newQuery[datasetCode] = {
                                'method': methodCode,
                                'constraints': {}
                        };
                        
                        const constraints = newQuery[datasetCode].constraints;
                        
                        $('#constraints-table > tbody > tr.query-constraint-row').each(function(idx, el) {
                             // get constraint name and type
                             const constraintCode = $(this).attr('data-constraint-code');
                             const constraintType = $(this).attr('data-constraint-type');
                             
                             constraints[constraintCode] = {
                                'type': constraintType
                             };
                             
                             // switch on type 'range', 'radio', 'checkbox'
                             // add object to constraints
                             switch (constraintType) {
                                 case "radio":
                                    constraints[constraintCode].value = $(this).find(`input[name="${constraintCode}"]:checked`).val();
                                    break;
                                 case "checkbox":
                                    const vals = [];
                                    $(this).find(`input[name="${constraintCode}"]:checked`).each(function(idx, el) {
                                        vals.push($(this).val());
                                    });
                                    
                                    if (vals.length > 0) {
                                        constraints[constraintCode].values = vals;
                                    } else{
                                        delete constraints[constraintCode];
                                    }
                                    
                                    break;
                                 case "range":
                                    const $slider = $(this).find('#query-range-slider');
                                    constraints[constraintCode].min = $slider.slider('values', 0);
                                    constraints[constraintCode].max = $slider.slider('values', 1);
                                    break;
                             }
                        });
                        
                        // add new tract query to tract tabs panel (trigger an event for this)
                       
                        // update renderers with returned tract (trigger an event for this)
                    }
                });
            };
              
            
            const headerTemplate = function(state, wrapperId) {
                $(`#${wrapperId}`).append('Tract');
            };
            
            return {
                header: headerTemplate,
                content: contentTemplate
            };
        };
        
        return tractSelectTab;
        
    };
    
    return TractSelectTab;
    
})();