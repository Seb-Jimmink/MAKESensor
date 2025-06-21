#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Update.h>
#include "secrets.h"

// --- GLOBAL DEBUG FLAG ---
#define DEBUG true
#define DEBUG_PRINT(x)    do { if (DEBUG) Serial.print(x); } while (0)
#define DEBUG_PRINTLN(x)  do { if (DEBUG) Serial.println(x); } while (0)

// --- RGB LED pins ---
#define RED_PIN   21
#define GREEN_PIN 22
#define BLUE_PIN  23


int rainbowHue = 0;
unsigned long lastRainbowStep = 0;
const int rainbowDelay = 1; // ms, controls speed

unsigned long lastSensorSend = 0;
const unsigned long sensorSendInterval = 500; // 500 ms

// --- WiFi reconnect handling ---
unsigned long lastWiFiReconnectAttempt = 0;
const unsigned long wifiReconnectInterval = 30000; // ms, 30 seconds

unsigned long lastMQTTReconnectAttempt = 0;
const unsigned long mqttReconnectInterval = 5000; // ms, 5 seconds


// --- Set RGB color ---
void setRGB(uint8_t r, uint8_t g, uint8_t b) {
  analogWrite(RED_PIN, r);
  analogWrite(GREEN_PIN, g);
  analogWrite(BLUE_PIN, b);
}

// --- HSV to RGB helper ---
void hsv2rgb(int h, int s, int v, uint8_t &r, uint8_t &g, uint8_t &b) {
  // Converts hue/sat/val to r/g/b (for rainbow animation)
  float hh = h / 60.0;
  int   i  = int(hh);
  float ff = hh - i;
  float p  = v * (1.0 - s / 255.0);
  float q  = v * (1.0 - (s / 255.0) * ff);
  float t  = v * (1.0 - (s / 255.0) * (1.0 - ff));

  switch(i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: default: r = v; g = p; b = q; break;
  }
}

// --- MQTT setup ---
WiFiClient espClient;
PubSubClient client(espClient);

// --- Get WiFi MAC address as string ---
String getMacAddress() {
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  mac.toLowerCase();
  return mac;
}

// --- Replace {mac} in MQTT topics ---
String expandTopic(const char* templ) {
  String topic = String(templ);
  topic.replace("{mac}", getMacAddress());
  return topic;
}

// --- OTA via HTTP ---
void performOTA(const char* firmware_url) {
  DEBUG_PRINT("Starting OTA update from: ");
  DEBUG_PRINTLN(firmware_url);

  WiFiClient updateClient;
  HTTPClient http;
  http.begin(updateClient, firmware_url);
  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    int contentLength = http.getSize();
    bool canBegin = Update.begin(contentLength);

    if (canBegin) {
      DEBUG_PRINTLN("Begin OTA update...");
      WiFiClient * stream = http.getStreamPtr();
      size_t written = Update.writeStream(*stream);

      if (written == contentLength) {
        DEBUG_PRINTLN("Written all bytes successfully");
      } else {
        DEBUG_PRINT("Written only: ");
        DEBUG_PRINT(written);
        DEBUG_PRINT("/");
        DEBUG_PRINTLN(contentLength);
      }

      if (Update.end()) {
        DEBUG_PRINTLN("OTA done!");
        if (Update.isFinished()) {
          DEBUG_PRINTLN("Update completed. Rebooting.");
          delay(1000);
          ESP.restart();
        } else {
          DEBUG_PRINTLN("Update not finished? Something went wrong!");
        }
      } else {
        DEBUG_PRINT("Update Error #: ");
        DEBUG_PRINTLN(Update.getError());
      }
    } else {
      DEBUG_PRINTLN("Not enough space for OTA");
    }
  } else {
    DEBUG_PRINT("Can't download firmware file. HTTP code: ");
    DEBUG_PRINTLN(httpCode);
  }
  http.end();
}

// --- MQTT callback: OTA trigger handler ---
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String recvTopic = String(topic);
  String expectedOtaTopic = expandTopic(ota_topic);

  if (recvTopic == expectedOtaTopic) {
    String url;
    for (unsigned int i = 0; i < length; i++) url += (char)payload[i];
    url.trim();
    DEBUG_PRINTLN("[OTA] OTA trigger received!");
    DEBUG_PRINT("[OTA] URL: "); DEBUG_PRINTLN(url);
    performOTA(url.c_str());
  }
}

// --- WiFi connect helper ---
bool connectToWiFi(unsigned long timeoutMs) {
  DEBUG_PRINT("Connecting to WiFi ");
  DEBUG_PRINTLN(ssid);

  if (ssid == "eduroam") {
    WiFi.begin(ssid, WPA2_AUTH_PEAP, identity, username, password);
  } else {
    WiFi.begin(ssid, password);
  }

  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < timeoutMs) {
    delay(500);
    DEBUG_PRINT(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    DEBUG_PRINTLN("\nWiFi connected!");
    DEBUG_PRINT("IP address: ");
    DEBUG_PRINTLN(WiFi.localIP());
    return true;
  } else {
    DEBUG_PRINTLN("\nWiFi connect failed after " + String(timeoutMs / 1000) + " seconds.");
    return false;
  }
}

// --- MQTT connect helper ---
void reconnectMQTT() {
  while (!client.connected()) {
    String clientId = getMacAddress();
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      DEBUG_PRINT("MQTT connected with client ID: ");
      DEBUG_PRINTLN(clientId);

      // Subscribe to OTA topic
      String expandedOtaTopic = expandTopic(ota_topic);
      client.subscribe(expandedOtaTopic.c_str());
      DEBUG_PRINT("Subscribed to OTA topic: ");
      DEBUG_PRINTLN(expandedOtaTopic);

    } else {
      DEBUG_PRINT("MQTT connection failed, rc=");
      DEBUG_PRINT(client.state());
      DEBUG_PRINTLN(" trying again in " + String(mqttReconnectInterval / 1000) + " seconds");
      delay(2000);
    }
  }
}

// --- Publish device info as JSON ---
void publishDeviceInfo() {
  // Sends device info (MAC, IP, firmware version) as JSON via MQTT
  String mac = getMacAddress();
  String ip = WiFi.localIP().toString();

  StaticJsonDocument<192> doc;
  doc["mac"] = mac;
  doc["ip"] = ip;
  doc["firmware_version"] = firmware_version;

  char payload[192];
  serializeJson(doc, payload);

  String topic = expandTopic(sensor_info_topic);

  bool success = client.publish(topic.c_str(), payload, true);

  DEBUG_PRINT("Published device info to ");
  DEBUG_PRINT(topic);
  DEBUG_PRINT(": ");
  DEBUG_PRINTLN(payload);
  if (!success) DEBUG_PRINTLN("MQTT publish failed!");
}

// --- Publish sensor data as JSON ---
void sendData() {
  int value = analogRead(8); // Read analog sensor (pin 8)

  StaticJsonDocument<64> doc;
  doc["Orgineel😀"] = value;

  char payload[64];
  serializeJson(doc, payload);

  String topic = expandTopic(sensor_data_topic);
  if (topic != "") {
    bool success = client.publish(topic.c_str(), payload);
    DEBUG_PRINT("Published sensor data to ");
    DEBUG_PRINT(topic);
    DEBUG_PRINT(": ");
    DEBUG_PRINTLN(payload);
    if (!success) DEBUG_PRINTLN("MQTT publish failed!");
  } else {
    DEBUG_PRINTLN("No sensor_data_topic set, not publishing data.");
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);

  connectToWiFi(wifiReconnectInterval);  // First WiFi connection

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  reconnectMQTT();

  publishDeviceInfo(); // Send device info on startup
}

void loop() {
  unsigned long now = millis();

  // --- Rainbow LED animation ---
  if (now - lastRainbowStep > rainbowDelay) {
    lastRainbowStep = now;
    uint8_t r, g, b;
    hsv2rgb(rainbowHue, 255, 16, r, g, b);
    setRGB(r, g, b);
    rainbowHue = (rainbowHue + 1) % 360;
  }

  // --- Sensor data every 500ms ---
  if (now - lastSensorSend > sensorSendInterval) {
    lastSensorSend = now;
    sendData();
  }

  // --- WiFi reconnect logic ---
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiReconnectAttempt > wifiReconnectInterval) {
      lastWiFiReconnectAttempt = millis();
      DEBUG_PRINTLN("Trying WiFi reconnect for " + String(wifiReconnectInterval / 1000) + " seconds");
      bool connected = connectToWiFi(wifiReconnectInterval);
      if (connected) {
        publishDeviceInfo(); // Publish if successful
      } else {
        DEBUG_PRINTLN("WiFi reconnect attempt failed. Will try again");
      }
    }
  }

  // --- MQTT reconnect if needed, with interval ---
  if ((!client.connected()) && (WiFi.status() == WL_CONNECTED)) {
    if (millis() - lastMQTTReconnectAttempt > mqttReconnectInterval) {
      lastMQTTReconnectAttempt = millis();
      reconnectMQTT();
    }
  } else {
    client.loop();
  }
}