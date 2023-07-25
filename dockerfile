# Use an official Postgres runtime as a parent image
FROM postgres:latest

# The container will listen on the specified network ports at runtime
EXPOSE 5432

# Run the command to start postgres service when the container launches
CMD ["postgres"]

# Set the environment variable to let the container know where to store the database
ENV POSTGRES_DB=kong
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
