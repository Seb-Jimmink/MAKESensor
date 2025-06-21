#pragma once

// Wi-Fi
const char* ssid = "ssid"; // ssid user
const char* password = "pass"; // ssid pass

// Eduroam
// const char* ssid = "user";
// const char* password = "pass";
const char* identity = "student@mail.com";  // Replace with your eduroam identity
const char* username = "student@mail.com";  // Same as identity in many cases


// MQTT
const char* mqtt_user = "MQTT_User";
const char* mqtt_pass = "MQTT_Pass";

const char* mqtt_server = "Local_Ip";  // host_ip
const int mqtt_port = 1883;
const char* sensor_info_topic = "devices/{mac}/info";
const char* ota_topic = "devices/{mac}/ota";
const char* sensor_data_topic = "Frontend_Sensor_Topic";

const char* firmware_version = "1.0";