#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include "esp_wifi.h"

#define DEBUG 1

// ================= WIFI =================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ================= SUPABASE ==============
const char* SUPABASE_FUNCTION_URL = "https://vsmtftzxeqwjsghrubcj.supabase.co/functions/v1/ingest";
const char* DEVICE_TOKEN = "ESP32.Q1PlS.WROOM0XC1";

// ================= PINS ==================
#define ONE_WIRE_BUS 4
#define SOIL_PIN 32

#define EC_RX 21
#define EC_TX 22
#define NPK_RX 18
#define NPK_TX 19

// ============ CSMS CALIBRATION ===========
#define DRY_VAL 4095
#define WET_VAL 2040

// ================= INTERVALS =============
const uint32_t SEND_INTERVAL = 10000;

// ================= RS485 =================
#define RS485_TIMEOUT 120
#define RS485_RETRIES 3

// ================= COMMANDS ===============
const uint8_t CMD_ECPH[8] = {0x01,0x03,0x00,0x00,0x00,0x04,0x44,0x09};
const uint8_t CMD_NPK[8]  = {0x01,0x03,0x00,0x1E,0x00,0x03,0x65,0xCD};

// ================= SERIAL =================
HardwareSerial RS485_ECPH(2);
HardwareSerial RS485_NPK(1);

// ================= SENSORS ================
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// ============== DATA STRUCTURE ============
struct SensorData {
  float temperature;
  float moisture;
  float ec;
  float ph;
  int nitrogen;
  int phosphorus;
  int potassium;
};

SensorData data;

// ================= OFFLINE BUFFER =========
#define BUFFER_SIZE 10
String offlineBuffer[BUFFER_SIZE];
int bufferIndex = 0;

// ================= TIMERS =================
unsigned long lastSend = 0;

uint16_t modbusCRC(uint8_t *buf, int len){
  uint16_t crc = 0xFFFF;

  for (int pos = 0; pos < len; pos++)
  {
    crc ^= (uint16_t)buf[pos];

    for (int i = 0; i < 8; i++)
    {
      if (crc & 0x0001)
      {
        crc >>= 1;
        crc ^= 0xA001;
      }
      else
        crc >>= 1;
    }
  }
  return crc;
}

bool readBytesTimeout(HardwareSerial &serial, uint8_t *buffer, int length){
  unsigned long start = millis();
  int index = 0;

  while (index < length && millis() - start < RS485_TIMEOUT)
  {
    if (serial.available())
      buffer[index++] = serial.read();
  }

  return index == length;
}

float readTemperature(){
  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);

  if (t == DEVICE_DISCONNECTED_C)
    return NAN;

  return t;
}

float readMoisture(){
  int raw = analogRead(SOIL_PIN);
  float moisture = map(raw, DRY_VAL, WET_VAL, 0, 100);
  return constrain(moisture, 0, 100);
}

void readECPH() {
  uint8_t resp[13];
  
  while(RS485_ECPH.available()) RS485_ECPH.read();

  uint8_t CMD_SEN0603[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x04, 0x44, 0x09};

  for(int attempt = 0; attempt < RS485_RETRIES; attempt++) {
    RS485_ECPH.write(CMD_SEN0603, 8);
    RS485_ECPH.flush();

    if (readBytesTimeout(RS485_ECPH, resp, 13)) {
      uint16_t crc_calc = modbusCRC(resp, 11);
      uint16_t crc_recv = (resp[12] << 8) | resp[11];

      if(crc_calc == crc_recv && resp[0] == 0x01) {
        
        uint16_t ec_raw = (resp[7] << 8) | resp[8];
        uint16_t ph_raw = (resp[9] << 8) | resp[10];

        data.ec = (float)ec_raw / 1000.0;
        data.ph = ph_raw / 10.0;

        #if DEBUG
          Serial.printf("[SEN0603] EC: %.0f us/cm | PH: %.1f\n", data.ec, data.ph);
        #endif
        return;
      }
    }
    delay(200);
  }
  data.ec = NAN; data.ph = NAN;
}

void readNPK() {
  uint8_t resp[11];

  while(RS485_NPK.available()) RS485_NPK.read(); 

  #if DEBUG
    Serial.println("\n[NPK] Sending command...");
  #endif

  for(int attempt = 0; attempt < RS485_RETRIES; attempt++) {
    RS485_NPK.write(CMD_NPK, 8);
    RS485_NPK.flush();

    if (readBytesTimeout(RS485_NPK, resp, 11)) {
      #if DEBUG
        Serial.print("[NPK] Raw response: ");
        for(int i = 0; i < 11; i++) Serial.printf("%02X ", resp[i]);
        Serial.println();
      #endif

      if (resp[0] == 0x01 && resp[1] == 0x03) {
        uint16_t crc_calc = modbusCRC(resp, 9);
        uint16_t crc_recv = (resp[10] << 8) | resp[9];

        if(crc_calc == crc_recv) {
          data.nitrogen   = (resp[3] << 8) | resp[4];
          data.phosphorus = (resp[5] << 8) | resp[6];
          data.potassium  = (resp[7] << 8) | resp[8];
          #if DEBUG
            Serial.printf("[NPK] N: %d P: %d K: %d | SUCCESS\n", data.nitrogen, data.phosphorus, data.potassium);
          #endif
          return;
        }
      }
    }
    delay(100);
  }
  data.nitrogen = -1; data.phosphorus = -1; data.potassium = -1;
}

void readSensors(){
  data.temperature = readTemperature();
  data.moisture = readMoisture();

  readECPH();
  delay(500);
  readNPK();
}

bool sendPayload(String payload){
  HTTPClient http;
  http.begin(SUPABASE_FUNCTION_URL);
  http.addHeader("Content-Type","application/json");

  int code = http.POST(payload);

  http.end();

  return code == 200;
}

void sendData(){
  StaticJsonDocument<256> doc;

  doc["dev_token"] = DEVICE_TOKEN;
  doc["temp_c"] = data.temperature;
  doc["moist_pct"] = data.moisture;
  doc["ph"] = data.ph;
  doc["ec_ms"] = data.ec;
  doc["n_mgkg"] = data.nitrogen;
  doc["p_mgkg"] = data.phosphorus;
  doc["k_mgkg"] = data.potassium;

  String payload;
  serializeJson(doc, payload);

  if(WiFi.status() == WL_CONNECTED)
  {
    if(sendPayload(payload))
    {
#if DEBUG
      Serial.println("Sent to Supabase");
#endif

      for(int i=0;i<bufferIndex;i++)
        sendPayload(offlineBuffer[i]);

      bufferIndex = 0;
      return;
    }
  }

  if(bufferIndex < BUFFER_SIZE)
    offlineBuffer[bufferIndex++] = payload;
}

void connectWiFi(){
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);
  delay(1000);

  esp_wifi_set_max_tx_power(40); 

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(500);
    #if DEBUG
    Serial.print(".");
    #endif
  }

  #if DEBUG
  Serial.println("\nWiFi Connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  #endif
}

void setup(){
  Serial.begin(115200);

  tempSensor.begin();
  pinMode(SOIL_PIN, INPUT);

  RS485_ECPH.begin(9600, SERIAL_8N1, EC_RX, EC_TX);
  RS485_NPK.begin(9600, SERIAL_8N1, NPK_RX, NPK_TX);

  connectWiFi();
}

void loop(){
  if(WiFi.status() != WL_CONNECTED)
    connectWiFi();

  if(millis() - lastSend > SEND_INTERVAL)
  {
    readSensors();
    sendData();
    lastSend = millis();
  }
}
