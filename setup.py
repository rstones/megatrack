from setuptools import setup

setup(
    name='megatrack',
    version='0.0.0',
    packages=['megatrack'],
    include_package_data=True,
    install_requires=[
        'flask', 'flask_sqlalchemy', 'flask_script', 'flask_migrate', 'flask_jsontools', 'pymysql'
    ],
)
