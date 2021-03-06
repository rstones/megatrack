"""empty message

Revision ID: c759ff0e68b6
Revises: 8fd00885914f
Create Date: 2017-11-15 16:55:39.202297

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c759ff0e68b6'
down_revision = '8fd00885914f'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('dataset_tracts', sa.Column('tract_code', sa.String(length=10), nullable=False))
    op.create_foreign_key(None, 'dataset_tracts', 'tract', ['tract_code'], ['code'])
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'dataset_tracts', type_='foreignkey')
    op.drop_column('dataset_tracts', 'tract_code')
    # ### end Alembic commands ###
