## Before first boot:

Make sure you have docker desktop installed, open and running.

## For windows
Make sure all docker files and files than end in .sh are set to LF line endings and it can be so that port :80 is a protected port, if that is an issue then go to the frontend folder, select docker-compose.yml and change:
  80:80 to **AnyPort**:80

## For first boot:

*If you run both containers on the same device make sure to use your local IPV4 adress for all ip fields.*

**Step 1.** Change the server .env variables to your desire and to your machines local IPV4 IP address.

**Step 1.1** POSTGRES_DB= {Fill in with the desired databse name}

**Step 1.2** POSTGRES_USER= {Fill in with the desired database user name}

**Step 1.3** POSTGRES_PASSWORD= {Fill in with the desired database user password}

**Step 1.4** POSTGRES_HOST= {Fill in the desired database instance name}

**Step 1.5** MQTT_USER= {Fill in the desired MQTT user name}

**Step 1.6** MQTT_PASS= {Fill in the desired MQTT user password}

**Step 1.7** API_IP= {Fill in the IPV4 IP of the machine where the server is running}

**Step 1.8** FRONTEND_IP= {Fill in the IPV4 IP of the machine where the frontend is running}

**Step 2.** Open a terminal for the server folder where the docker-compose file is located.

**Step 3.** Run the following command 'docker compose up --build'.

**Step 4.** Change the frontend .env variables based on the server variables.

**Step 4.1** BACKEND_HOST= {Fill in with the server API IPV4 IP address}

**Step 5.** Open a terminal for the frontend folder where the docker-compose file is located.

**Step 6.** Run the following command 'docker compose up --build'. 

**Step 7.** If you did this every thing should run fine, the webpage should be accessible on the IP your fronend is hosted. (If you changed the port from 80 you will have to access the site through that port, so IPV4:**SelectedPort**)

**Step 8.** If you want to stop the docker containers, use the following keys when in the running terminals. **CTRL+C**

*or*

**Step 8.** Open docker desktop and stop the containers.



## For subsuquent boots:

**Step 1.** Go to docker desktop and start the frontend and server containers.

*or*

**Step 1.** Open a terminal for the server folder where the docker-compse file is located.

**Step 2.** Run 'docker compse down' in the terminal.

**Step 3.** Run 'docker compse up' in the terminal.

**Step 4.** Do the same 3 steps for the 'frontend' container.

**Step 5.** Stop the containers from running using **CTRL+C** in both terminals

*or*

**Step 5.** Stop the containers in the docker desktop frontend.



## For fresh start:

**Step 1.** Open a terminal for the server folder wehere the docker-compose file is located.

**Step 2.** Run the follwoing command "docker compose down -v --rmi all", do this for both containers.

**Step 3.** *(Only for server)* Delete all the cert file in the mosquitto broker manually, leave the generate-certs.sh file.

**Step 4.** Remove the .env credentials if confedential/desierd.


