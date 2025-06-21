Before first boot:

Make sure you have docker desktop installed.


For first boot:

Step 1. Change the server .env variables to your desire and to your machines local IPV4 IP address.

Step 1.1 POSTGRES_DB= {Fill in with an desierd databse name}
Step 1.2 POSTGRES_USER= (Fill in with an desierd database user name}
Step 1.3 POSTGRES_PASSWORD= {Fill in with an desierd database user password}
Step 1.4 POSTGRES_HOST= {Fill in a desierd database container name}
Step 1.5 MQTT_USER= {Fill in an desierd MQTT user name}
Step 1.6 MQTT_PASS= {Fill in an desierd MQTT user password}
Step 1.7 API_IP= {Fill in the IPV4 IP of the machine where the server is running}
Step 1.8 FRONTEND_IP= {Fill in the IPV4 IP of the machine where the frontend is running}

Step 2. Open the server folder where the docker-compse file is located.

Step 3. Run the following command 'docker compose up --build'.

Step 4. Change the frontend .env variables based on the server variables.

Step 5. Open the frontend folder where the docker-compse file is located.

Step 6. Run the following command 'docker compose up --build'. 

Step 7. If you did this every thing should run fine, the webpage is accessible on the IP your fronend is hosted. (If both containers are hosted on the same machine, the IP is the same as the IPV4 IP of the server)

Step 8. If you want to stop the docker containers, use the following keys when in the running terminal. CTRL+C


For subsuquent boots:

Step 1. Go to docker desktop and start the frontend and server containers.

or

Step 1. Open the server folder where the docker-compse file is located.

Step 2. Run 'docker compse down' in the terminal.

Step 3. Run 'docker compse up' in the terminal.

Step 4. Do the same 3 steps for the 'frontend' container.

Step 5. Stop the containers from running using CTRL+C in the terminal, or stop the containers in the docker desktop.
