"""empty message

Revision ID: 23fe2b14fe74
Revises: 3994ee8f2cc4
Create Date: 2017-05-24 15:49:21.245500

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '23fe2b14fe74'
down_revision = '3994ee8f2cc4'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('dataset', sa.Column('code', sa.String(length=12), nullable=False))
    op.add_column('dataset', sa.Column('file_path', sa.String(length=20), nullable=False))
    op.drop_index('file_path_temp', table_name='dataset')
    op.drop_column('dataset', 'file_path_temp')
    op.drop_column('dataset', 'code_temp')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('dataset', sa.Column('code_temp', mysql.VARCHAR(length=12), nullable=False))
    op.add_column('dataset', sa.Column('file_path_temp', mysql.VARCHAR(length=20), nullable=False))
    op.create_index('file_path_temp', 'dataset', ['file_path_temp'], unique=True)
    op.drop_column('dataset', 'file_path')
    op.drop_column('dataset', 'code')
    # ### end Alembic commands ###