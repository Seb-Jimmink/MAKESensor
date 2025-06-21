-- init.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Firmware environment enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'firmware_environment') THEN
        CREATE TYPE firmware_environment AS ENUM ('production', 'development');
    END IF;
END$$;

-- Machines table
CREATE TABLE machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    supplier VARCHAR(255),
    location VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machine details table
CREATE TABLE machine_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    serial_number VARCHAR(100),
    current_job VARCHAR(255),
    install_date DATE,
    last_checkup_date DATE,
    next_checkup_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Components table
CREATE TABLE components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'OK',
    serial_number VARCHAR(100),
    manufacturer VARCHAR(255),
    replacement_cycle_hours INTEGER,
    last_checkup_date DATE,
    next_checkup_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensors table
CREATE TABLE sensors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID REFERENCES components(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sensor_type VARCHAR(100),
    microcontroller_type VARCHAR(100),
    manufacturer VARCHAR(255),
    mqtt_topic VARCHAR(255),
    status VARCHAR(50) DEFAULT 'NEW',
    last_seen TIMESTAMPTZ,
    calibration_date DATE,
    firmware_version VARCHAR(50),
    mac_address VARCHAR(100) UNIQUE NOT NULL,
    ip_address VARCHAR(100),
    install_date DATE,
    measurement_frequency INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensor fields table
CREATE TABLE sensor_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
    sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensor measurements table
CREATE TABLE sensor_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
    field_id UUID REFERENCES sensor_fields(id) ON DELETE CASCADE,
    value DOUBLE PRECISION NOT NULL,
    quality_flag VARCHAR(20) DEFAULT 'GOOD',
    source VARCHAR(50) DEFAULT 'sensor',
    batch_id VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Firmware files table with soft delete + per-file grace period
CREATE TABLE sensor_firmware_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id UUID REFERENCES sensors(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    file_size_bytes INTEGER NOT NULL,
    data BYTEA NOT NULL,
    environment firmware_environment DEFAULT 'production' NOT NULL,
    deleted_at TIMESTAMPTZ,
    deletion_grace_period INTERVAL DEFAULT INTERVAL '14 days',
    permanently_deleted BOOLEAN DEFAULT FALSE
);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER machines_updated_at_modtime
BEFORE UPDATE ON machines
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER machine_details_updated_at_modtime
BEFORE UPDATE ON machine_details
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER components_updated_at_modtime
BEFORE UPDATE ON components
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER sensors_updated_at_modtime
BEFORE UPDATE ON sensors
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER sensor_fields_updated_at_modtime
BEFORE UPDATE ON sensor_fields
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- Views

-- Machine + component + sensor hierarchy
CREATE OR REPLACE VIEW machine_component_sensor_hierarchy AS
SELECT
    m.id AS machine_id, m.name AS machine_name, m.location,
    c.id AS component_id, c.name AS component_name, c.status AS component_status, c.serial_number,
    s.id AS sensor_id, s.name AS sensor_name, s.status AS sensor_status, s.firmware_version, s.mac_address
FROM machines m
LEFT JOIN components c ON c.machine_id = m.id
LEFT JOIN sensors s ON s.component_id = c.id;

-- Latest measurement per sensor field
CREATE OR REPLACE VIEW latest_sensor_measurements AS
SELECT DISTINCT ON (sf.sensor_id, sf.id)
    s.id AS sensor_id,
    sf.id AS field_id,
    sf.field_name,
    sm.value,
    sm.timestamp,
    sm.quality_flag,
    sm.source,
    sm.batch_id
FROM sensor_fields sf
JOIN sensors s ON s.id = sf.sensor_id
LEFT JOIN sensor_measurements sm ON sm.field_id = sf.id
ORDER BY sf.sensor_id, sf.id, sm.timestamp DESC;

-- Firmware size summary per sensor (excluding soft-deleted)
CREATE OR REPLACE VIEW firmware_size_summary AS
SELECT
    s.id AS sensor_id,
    s.name AS sensor_name,
    s.mac_address,
    COUNT(f.id) AS firmware_count,
    SUM(f.file_size_bytes) AS total_firmware_size_bytes,
    pg_size_pretty(SUM(f.file_size_bytes)) AS total_firmware_size
FROM sensors s
LEFT JOIN sensor_firmware_files f ON f.sensor_id = s.id AND f.deleted_at IS NULL
GROUP BY s.id, s.name, s.mac_address
ORDER BY total_firmware_size_bytes DESC;