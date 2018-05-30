$(document).ready(function() {
    // show log in form
    // form should submit action to log in route and obtain an auth token to be saved in localStorage
    // on successful log in, remove the log in form and show a "Log out" button
    
    $('#admin-login-form').submit(function(event) {
        event.preventDefault();
        $.ajax({
            url: '/megatrack/login',
            type: 'POST',
            dataType: 'json',
            data: $('#admin-login-form').serialize(),
            success: function(data) {
                localStorage.setItem('authToken', data.authToken);
                $('#admin-login-container').remove();
                $('#content').append('<div id="admin-tabs-container">'
                    +'<div id="admin-tabs">'
                        +'<ul>'
                            +'<li><a href="#datasets-tab">Datasets</a></li>'
                            +'<li><a href="#tracts-tab">Tracts</a></li>'
                            +'<li><a href="#subjects-tab">Subjects</a></li>'
                        +'</ul>'
                        +'<div id="datasets-tab">This is the datasets tab</div>'
                        +'<div id="tracts-tab">This is the tracts tab</div>'
                        +'<div id="subjects-tab">This is the subjects tab</div>'
                    +'</div>'   
                +'</div>');
                
                $('#admin-tabs').tabs();
                constructDatasetsTab();
                
            },
            error: function(xhr) {
                $('#admin-login-error-message').html(xhr.responseText);
            }
        });
    });
    
    var constructDatasetsTab = function() {
        $('#datasets-tab').append('<div id="datasets-tab-left-column">'
                                        +'<table id="datasets-table">'
                                            +'<thead></thead><tbody></tbody>'
                                        +'</table>'
                                    +'</div>'
                                    +'<div id="datasets-tab-right-column">'
                                    +'</div>');
                                    
        $.ajax({
            url: '/megatrack/datasets',
            method: 'GET',
            dataType: 'json',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Bearer '+localStorage.getItem('authToken'));  
            },
            success: function(data) {
                // populate #datasets-table
                for (i=0; i<data.datasets.length; i++) {
                    dataset = data.datasets[i];
                    $('#datasets-table > tbody').append('<tr>'
                                                            +'<td>'+dataset.code+'</td>'
                                                            +'<td>'+dataset.name+'</td>'
                                                            +'<td>'+dataset.file_path+'</td>'
                                                            +'<td>'+dataset.query_params+'</td>'
                                                            +'<td>Update</td>'
                                                            +'<td>Delete</td>'
                                                        +'</tr>');
                }
            },
            error: function(xhr) {
                
            }
        });
    };
    // show tabs for each table we need to update: Datasets, Tracts, Subjects
    // For the Datasets and Tracts tabs show the available data in a paginated table in left column
    // each row should have an update and remove icon
    // each table should have an 'Add Dataset/Tract" button at the top
    
    // clicking on remove icon opens alert to double check the user wants to delete that record
    // clicking on update opens a form prefilled with the current data for the user to change
    // clicking on "Add" button opens empty form for user to fill
    // forms go in the right column
    
    // Subjects tab should have functionality to upload a csv file containing subject records
    // the data is first validated before inserting into database 
});