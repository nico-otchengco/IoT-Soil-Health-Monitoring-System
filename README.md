# Smart Soil Health Monitoring System

A full-stack IoT-based system designed for **real-time soil health analysis** and **data-driven agricultural decision-making**.  
This project integrates embedded systems, cloud infrastructure, and a web-based dashboard to monitor and analyze critical soil parameters.

---

## Overview

The system collects and processes soil data including:

- Soil Moisture  
- Electrical Conductivity (EC)  
- pH Level  
- Nitrogen (N)  
- Phosphorus (P)  
- Potassium (K)  
- Temperature  

Data is transmitted from the device to the cloud and visualized through a web dashboard, enabling users to monitor soil conditions and make informed decisions such as **crop selection and soil treatment**.

---

## Key Features

- **Real-Time Monitoring** – Live sensor readings from the field  
- **Data Visualization** – Interactive graphs and historical logs  
- **Crop Recommendation System** – Suggests alternative crops based on soil condition  
- **Soil Treatment Insights** – Provides recommendations to improve soil quality  
- **Cloud Integration** – Centralized data storage and access via Supabase  

---

## System Architecture

Sensors → ESP32 → RS485 (Modbus RTU) → WiFi → Supabase → Web Dashboard


---

## Hardware Components

- ESP32 NodeMCU-32S  
- Capacitive Soil Moisture Sensor v1.2  
- MAX485 to TTL Converter Module  
- DS18B20 Waterproof Temperature Sensor  
- SEN603 MODBUS-RTU RS485 EC & pH Sensor  
- SEN605 MODBUS-RTU RS485 NPK Sensor  

---

## Software & Technologies

- **Embedded Systems:** Arduino (ESP32)  
- **Communication Protocol:** Modbus RTU (RS485)  
- **Frontend:** React + Typescript 
- **Backend / Database:** Supabase  
- **Data Handling:** REST API  

---

## Advanced Features

### Offline Data Buffering
- Ensures **zero data loss** during network interruptions  
- Sensor readings are stored locally and automatically synced once connection is restored  

---

### Dual RS485 Bus (Parallel Sensor Communication)
- Utilizes **two hardware UART interfaces**  
- Separates EC/pH and NPK sensors to avoid communication conflicts  
- Improves system stability and performance  

---

### Modbus CRC Validation
- Implements **CRC16 checksum verification**  
- Ensures only valid sensor data is processed  
- Prevents corrupted readings from affecting analytics  

---

### RS485 Retry Mechanism
- Automatic retry system for sensor communication  
- Handles intermittent noise and unstable connections  
- Increases reliability in real-world deployment  

---

## Dashboard Features

- Real-time sensor data monitoring  
- Historical data logs  
- Graph-based visualization  
- Crop recommendation system  
- Soil treatment suggestions  

