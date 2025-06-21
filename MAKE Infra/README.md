Before first boot:

Make sure you have docker desktop installed.


For first boot:

Step 1. Change the server .env variables to you're desire and or correct IP.

Step 2. Open the server folder where the docker-compse file is located.

Step 3. Run the following command 'docker compose up --build'.

Step 4. Change the frontend .env variables based on the server varibles.

Step 5. Open the frontend folder where the docker-compse file is located.

Step 6. Run the following command 'docker compose up --build'. 

Step 7. If you did this every thing schould run file, the webpage is accecable on your the IP you're fronend is hosted.

Step 8. If you want to stop the docker containers, do the following command in the terminal. CTRL+C


For subsucent boots:

Step 1. Open the server folder where the docker-compse file is located.

Step 2. Run 'docker compse down' in the terminal.

Step 3. Run 'docker compse up' in the terminal.

Step 4. Do the same 3 steps for the 'frontend' container.

Step 5. Stop the containers from running using CTRL+C in the terminal, or stop the containers in the docker desktop.
