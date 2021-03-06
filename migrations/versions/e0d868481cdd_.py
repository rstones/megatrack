"""empty message

Revision ID: e0d868481cdd
Revises: 6dacf0a3a80d
Create Date: 2018-06-28 16:37:57.992070

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e0d868481cdd'
down_revision = '6dacf0a3a80d'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('method',
    sa.Column('code', sa.String(length=12), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('description', sa.String(length=1000), nullable=True),
    sa.PrimaryKeyConstraint('code'),
    sa.UniqueConstraint('name')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('method')
    # ### end Alembic commands ###
