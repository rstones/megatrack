from megatrack import app, db
from megatrack.models import Dataset

db.create_all(app=app)
app.app_context().push()

# get BRC Atlas dataset
brc = db.session.query(Dataset).get('BRC_ATLAS')
brc.query_params = '{'\
			+'"gender": {'\
				 +'"label":"Gender",'\
				 +'"type": "checkbox",'\
				 +'"options" :{'\
								+'"values": ["M", "F"],'\
								+'"labels": ["Male", "Female"]'\
							+'}'\
			+'},'\
			+'"age": {'\
					+'"label":"Age",'\
					+'"type": "range",'\
					+'"options": {'\
									+'"min": 18,'\
									+'"max": 99,'\
									+'"initMin": 40,'\
									+'"initMax": 60'\
								+'}'\
			+'},'\
			+'"edinburgh_handedness_raw": {'\
					+'"label":"Edinburgh Handedness",'\
					+'"type": "range",'\
					+'"options": {'\
									+'"min": -100,'\
									+'"max": 100,'\
									+'"initMin": 0,'\
									+'"initMax": 100'\
								+'}'\
			+'},'\
			+'"ravens_iq_raw": {'\
					+'"label":"Ravens IQ",'\
					+'"type": "range",'\
					+'"options": {'\
									+'"min": 0,'\
									+'"max": 60,'\
									+'"initMin": 30,'\
									+'"initMax": 60'\
								+'}'\
			+'}'\
		+'}'

db.session.commit()
