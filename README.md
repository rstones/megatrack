Web application to display Megatrack neuroimaging data.

To run in development requires a config file, environment variables, local database, nginx config and neuroimaging data directory.

Docker is used to provide an environment consistent with that in production. To start the development containers
```bash
sudo docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Database migrations should be generated from within the megatrack container. Use the following to open a shell inside the running container
```bash
docker exec -it <megatrack_container_name> sh
```
Then from within the container run
```sh
flask db migrate
```
to generate the migration file. The migrations folder should be loaded into the container as a volume so when you exit the container the newly generated files are ready to be commited to your local git repo. Be sure to check the migration files before commiting as alembic will not detect all changes to the schema (eg. change of primary key) and data may need to be inserted into new columns (if they are part of a foreign key etc...). Also make sure the rollback script is going to undo the database changes reliably.

New migration files are then applied automatically on instantiation of the containers.
