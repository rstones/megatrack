from flask import current_app, Blueprint, render_template, request, send_file, jsonify, make_response

from megatrack import db, bcrypt
from megatrack.admin.models import User
from megatrack.models import Dataset, Tract, Subject, DatasetTracts

admin = Blueprint('admin', __name__)

@admin.route('/admin/login', methods=['POST'])
def login():
    try:
        user = User.query.filter(User.user_name == request.form['username']).first()
        if user and bcrypt.check_password_hash(user.password, request.form['password']):
            auth_token = user.encode_auth_token(user.user_id)
            if auth_token:
                responseObject = {
                    'status': 'success',
                    'message': 'Successfully logged in!',
                    'authToken': auth_token.decode()
                }
                return make_response(jsonify(responseObject)), 200
        else:
            return 'User does not exist or incorrect password used. Please try again.', 404
    except Exception as e:
        current_app.logger.error(e)
        return 'Log in failed. Please try again.', 500
    
@admin.route('/admin/tracts', methods=['GET','POST','PUT','DELETE'])
def modify_tracts():
    if request.method == 'GET':
        pass
    elif request.method == 'POST':
        pass
    elif request.method == 'PUT':
        pass
    elif request.method == 'DELETE':
        pass

@admin.route('/admin/datasets', methods=['GET','POST','PUT','DELETE'])
def modify_datasets():
    # get auth header and split to get the token string
    auth_header = request.headers.get('Authorization')
    auth_token = auth_header.split(" ")[1] if auth_header else ''
    
    if auth_token:
        # if auth token sent, deocde to get user id
        user_id = User.decode_auth_token(auth_token)
        # get user from database
        # is it necessary to check the user id exists in the database?
        # or is it sufficient that the token could be decoded using our secret key?
        # its useful to have the user name for logging purposes anyway 
        user = User.query.filter(User.user_id == user_id).first()
        
        if user:
            if request.method == 'GET':
                try:
                    datasets = Dataset.query.all()
                    response_object = {
                        'message': 'Successfully retrieved dataset records',
                        'datasets': datasets
                    }
                    current_app.logger.info(f'User {user.user_name} retrieved all dataset records.')
                    return make_response(jsonify(response_object)), 200
                except Exception as e:
                    current_app.logger.error(f'Error occurred while user "{user.user_name}" was attempting to get all dataset records.')
                    current_app.logger.error(e)
                    return 'An error occurred while getting datasets.', 500
                
            elif request.method == 'POST':
                form = request.form
                try:
                    dataset = Dataset(form['code'], form['name'], form['filePath'], form['queryParams'])
                    db.session.add(dataset)
                    db.session.commit()
                    current_app.logger.info(f'User "{user.user_name}" inserted a new dataset with code "{dataset.code}"')
                    return 'New dataset successfully created.', 201
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f'Error occurred while user "{user.user_name}" was attempting to insert dataset.')
                    current_app.logger.error(e)
                    return 'An error occurred while creating a dataset record.', 500
                
            elif request.method == 'PUT':
                form = request.form
                try:
                    dataset = Dataset.query.filter(Dataset.code == form['code']).first()
                    if dataset:
                        dataset.name = form['name']
                        dataset.file_path = form['filePath']
                        dataset.query_params = form['queryParams']
                        db.session.commit()
                        current_app.logger.info(f'User {user.user_name} updated dataset {dataset.code}.')
                        return 'Dataset successfully updated.', 200
                    else:
                        raise Exception('Can\'t update dataset that doesn\'t exist.')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f'Error occurred while user {user.user_name} was attempting to update dataset {dataset}.')
                    current_app.logger.error(e)
                    return 'An error occurred while updating dataset.', 500
            
            elif request.method == 'DELETE':
                code = request.args['code']
                if code:
                    try:
                        dataset = Dataset.query.filter(Dataset.code == code).first()
                        if dataset:
                            Dataset.query.filter(Dataset.code == code).delete()
                            db.session.commit()
                        else:
                            raise Exception(f'Cannot delete dataset with code "{code}" since a record doesn\'t exist.')
                        current_app.logger.info(f'User {user.user_name} deleted dataset {code}.')
                        return 'Dataset successfully deleted.', 200
                    except Exception as e:
                        db.session.rollback()
                        current_app.logger.error(f'Error occurred while user {user.user_name} was attempting to delete dataset with code {code}.')
                        current_app.logger.error(e)
                        return 'An error occurred while deleting dataset.', 500
                else:
                    current_app.logger.warn('No code sent with dataset DELETE request')
                    return 'No dataset code was sent with DELETE request.', 400
         
        else:
            current_app.logger.warn(f'No user with id "{user_id}" found in database.')
            return 'Invalid user id passed with authentication token', 401
    else:
        current_app.logger.warn('No authentication token sent with request to /datasets')
        return 'No authentication token sent with request.', 401