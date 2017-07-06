"""empty message

Revision ID: ef098dbbf8d7
Revises: 503160b096f3
Create Date: 2017-07-01 13:27:12.396982

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ef098dbbf8d7'
down_revision = '503160b096f3'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_unique_constraint(None, 'dataset', ['name'])
    op.add_column('subject', sa.Column('edinburgh_handedness_raw', sa.Integer(), nullable=True))
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('subject', 'edinburgh_handedness_raw')
    op.drop_constraint(None, 'dataset', type_='unique')
    # ### end Alembic commands ###
