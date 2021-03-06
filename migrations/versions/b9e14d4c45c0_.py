"""empty message

Revision ID: b9e14d4c45c0
Revises: 594ceb1b2f91
Create Date: 2017-05-24 15:45:27.994515

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'b9e14d4c45c0'
down_revision = '594ceb1b2f91'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('dataset', sa.Column('code', sa.String(length=12), nullable=False))
    op.drop_column('dataset', 'code_temp')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('dataset', sa.Column('code_temp', mysql.VARCHAR(length=12), nullable=False))
    op.drop_column('dataset', 'code')
    # ### end Alembic commands ###
