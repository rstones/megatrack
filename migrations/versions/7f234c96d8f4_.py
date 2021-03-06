"""empty message

Revision ID: 7f234c96d8f4
Revises: b199e8352ef4
Create Date: 2017-05-24 13:48:50.395860

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '7f234c96d8f4'
down_revision = 'b199e8352ef4'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('subject', 'dataset_id')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('subject', sa.Column('dataset_id', mysql.VARCHAR(length=12), nullable=False))
    # ### end Alembic commands ###
