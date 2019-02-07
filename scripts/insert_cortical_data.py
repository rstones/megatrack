import pickle
from megatrack import application, db
from megatrack.models import CorticalLabel

def float_string_to_int_range(s, range):
    ''' Takes a string representing a number between 0 and 1 (inclusive)
    and scales it to an integer between 0 and range '''
    return int(float(s) * range)

def rgb_to_hex(r, g, b):
    ''' Takes integers between 0-255 (inclusive) and returns hex string '''
    return '0x%02x%02x%02x' % (r, g, b)

def run():
    with open('data/extracted_data.pkl', 'rb') as f:
        data = pickle.load(f)
    
    for atlas_name in data.keys():
        print(f'Adding data from atlas: {atlas_name}')
        for region in data[atlas_name]:
            red = float_string_to_int_range(region[2], 255)
            green = float_string_to_int_range(region[3], 255)
            blue = float_string_to_int_range(region[4], 255)
            cl = CorticalLabel(
                    atlas_name,
                    region[1],
                    region[0],
                    rgb_to_hex(red, green, blue)
                    )
            db.session.add(cl)
        db.session.commit()

if __name__ == '__main__':
    db.create_all(app=application)
    application.app_context().push()
    run()
