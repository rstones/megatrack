from setuptools import setup

setup(
    name='megatrack',
    packages=['megatrack'],
    include_package_data=True,
    install_requires=[
        'flask', 'numpy', 'nibabel',
    ],
)