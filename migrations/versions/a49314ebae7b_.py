"""empty message

Revision ID: a49314ebae7b
Revises: 3300935dbc12
Create Date: 2017-05-24 12:52:16.139834

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'a49314ebae7b'
down_revision = '3300935dbc12'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('subject', sa.Column('subject_id', sa.String(length=12), nullable=False))
    op.alter_column('subject', 'age',
               existing_type=mysql.INTEGER(display_width=11),
               nullable=False)
    op.alter_column('subject', 'dataset_id',
               existing_type=mysql.VARCHAR(length=12),
               nullable=False)
    op.alter_column('subject', 'file_path',
               existing_type=mysql.VARCHAR(length=20),
               nullable=False)
    op.alter_column('subject', 'gender',
               existing_type=mysql.VARCHAR(length=1),
               nullable=False)
    op.drop_index('dataset_id', table_name='subject')
    op.create_unique_constraint(None, 'subject', ['subject_id'])
    op.drop_column('subject', 'dataset')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('subject', sa.Column('dataset', mysql.VARCHAR(length=12), nullable=True))
    op.drop_constraint(None, 'subject', type_='unique')
    op.create_index('dataset_id', 'subject', ['dataset_id'], unique=True)
    op.alter_column('subject', 'gender',
               existing_type=mysql.VARCHAR(length=1),
               nullable=True)
    op.alter_column('subject', 'file_path',
               existing_type=mysql.VARCHAR(length=20),
               nullable=True)
    op.alter_column('subject', 'dataset_id',
               existing_type=mysql.VARCHAR(length=12),
               nullable=True)
    op.alter_column('subject', 'age',
               existing_type=mysql.INTEGER(display_width=11),
               nullable=True)
    op.drop_column('subject', 'subject_id')
    # ### end Alembic commands ###
