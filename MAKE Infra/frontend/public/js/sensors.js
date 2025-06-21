// sensors.js

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const sensorsOverviewList = document.getElementById("sensors-overview-list");
  const machineSelect = document.getElementById("machine-select");
  const machineComponentsList = document.getElementById("machine-components-list");
  const sensorMessage = document.getElementById("sensor-message");

  // Sensor Modal
  const sensorModal = document.getElementById("sensor-modal");
  const sensorForm = document.getElementById("sensor-form");
  const sensorModalTitle = document.getElementById("sensor-modal-title");
  const sensorIdInput = document.getElementById("sensor-id");
  const sensorNameInput = document.getElementById("sensor-name");
  const sensorTypeInput = document.getElementById("sensor-type");
  const sensorMcuInput = document.getElementById("sensor-mcu");
  const sensorManuInput = document.getElementById("sensor-manufacturer");
  const sensorMqttInput = document.getElementById("sensor-mqtt-topic");
  const sensorStatusInput = document.getElementById("sensor-status");
  const sensorComponentSelect = document.getElementById("sensor-component-id");
  const sensorMachineSelect = document.getElementById('sensor-machine-id');
  const sensorCancelBtn = document.getElementById("sensor-cancel-btn");
  const sensorDeleteBtn = document.getElementById("sensor-delete-btn");

  // Fields Modal
  const fieldsModal = document.getElementById("fields-modal");
  const fieldsList = document.getElementById("fields-list");
  const addFieldForm = document.getElementById("add-field-form");
  const fieldNameInput = document.getElementById("field-name");
  const fieldUnitInput = document.getElementById("field-unit");
  const saveFieldBtn = document.getElementById("save-field-btn");
  const cancelEditFieldBtn = document.getElementById("cancel-edit-field-btn");
  const closeFieldsModalBtn = document.getElementById("close-fields-modal");

  // Firmware Modal
  const firmwareModal = document.getElementById("firmware-modal");
  const firmwareModalClose = document.getElementById("firmware-modal-close");
  const firmwareModalSensorName = document.getElementById("firmware-modal-sensor-name");
  const firmwareModalMac = document.getElementById("firmware-modal-mac");
  const firmwareCurrentVersion = document.getElementById("firmware-current-version");
  const firmwareCurrentType = document.getElementById("firmware-current-type");
  const firmwareCurrentDate = document.getElementById("firmware-current-date");
  const firmwareTotalSize = document.getElementById("firmware-total-size");
  const firmwareUploadForm = document.getElementById("firmware-upload-form");
  const firmwareUploadVersion = document.getElementById("firmware-upload-version");
  const firmwareUploadType = document.getElementById("firmware-upload-type");
  const firmwareUploadFile = document.getElementById("firmware-upload-file");
  const firmwareUploadStatus = document.getElementById("firmware-upload-status");
  const firmwareFilterEnv = document.getElementById("firmware-filter-env");
  const firmwareFilterVersion = document.getElementById("firmware-filter-version");
  const firmwareFilterDate = document.getElementById("firmware-filter-date");
  const firmwareFilterSize = document.getElementById("firmware-filter-size");
  const firmwareClearFilters = document.getElementById("firmware-clear-filters");
  const firmwareSortKey = document.getElementById("firmware-sort-key");
  const firmwareSortDir = document.getElementById("firmware-sort-dir");
  const firmwareSectionProd = document.getElementById("firmware-section-production");
  const firmwareSectionDev = document.getElementById("firmware-section-development");
  const firmwareSectionDeleted = document.getElementById("firmware-section-deleted");

  // --- State ---
  let allSensors = [];
  let allMachines = [];
  let allComponents = [];
  let firmwareList = [];
  let firmwareSensor = null;

  function showSensorMessage(msg, type = "") {
    sensorMessage.textContent = msg;
    sensorMessage.className = type ? type : "";
    setTimeout(() => { sensorMessage.textContent = ""; sensorMessage.className = ""; }, 3200);
  }

  // === LOAD ALL DATA ===
  async function loadEverything() {
    await Promise.all([fetchSensors(), fetchMachines(), fetchComponents()]);
    renderSensorsOverview();
    populateMainMachineSelect();
    renderMachineComponents();
  }

  // --- COMPONENTS ---
  async function fetchSensors() {
    try {
      const res = await fetch("/api/sensor");
      allSensors = await res.json();
    } catch {
      allSensors = [];
      showMsg("Failed to load sensors", "error");
    }
  }
  async function fetchMachines() {
    try {
      const res = await fetch("/api/machines");
      allMachines = await res.json();
    } catch {
      allMachines = [];
      showMsg("Failed to load machines", "error");
    }
  }
  async function fetchComponents() {
    try {
      const res = await fetch("/api/components");
      allComponents = await res.json();
    } catch {
      allComponents = [];
      showMsg("Failed to load components", "error");
    }
  }

  function showMsg(msg, type = "") {
    sensorMessage.textContent = msg;
    sensorMessage.className = type ? type : "";
    setTimeout(() => { sensorMessage.textContent = ""; sensorMessage.className = ""; }, 3200);
  }

  // === RENDER SENSORS OVERVIEW (TOP) ===
  function renderSensorsOverview() {
    sensorsOverviewList.innerHTML = "";
    allSensors
      .filter(sensor => sensor.status === "PENDING")
      .forEach(sensor => {
        sensorsOverviewList.appendChild(createSensorCard(sensor));
      });
  }

  function createSensorCard(sensor) {
    const card = document.createElement("div");
    card.className = "sensor-card";
    let editBtnLabel = (sensor.status === "PENDING") ? "Append" : "Edit";
    let fieldsBtnHtml = (sensor.status === "ACTIVE")
      ? '<button class="fields-btn">Fields</button>'
      : '';
    let firmwareBtnHtml = (sensor.status === "ACTIVE")
      ? '<button class="firmware-btn">Firmware</button>'
      : '';
    card.innerHTML = `
      <strong>${sensor.name || "(unnamed)"}</strong>
      <small>Status: ${sensor.status || "-"} | MAC: ${sensor.mac_address || "-"} | IP: ${sensor.ip_address || "-"}</small>
      <small>Last Seen: ${sensor.last_seen ? new Date(sensor.last_seen).toLocaleString() : "-"}</small>
      <div>
        <button class="sensor-edit-btn">${editBtnLabel}</button>
        ${fieldsBtnHtml}
        ${firmwareBtnHtml}
        <button class="sensor-delete-btn">Delete</button>
      </div>
    `;
    card.querySelector(".sensor-edit-btn").onclick = () => openSensorModal(sensor);
    if (sensor.status === "ACTIVE") {
      card.querySelector(".fields-btn").onclick = () => openFieldsModal(sensor.id, sensor.name);
      card.querySelector(".firmware-btn").onclick = () => openFirmwareModal(sensor);
    }
    card.querySelector(".sensor-delete-btn").onclick = async () => {
      if (!confirm("Delete this sensor?")) return;
      await fetch(`/api/sensor/${sensor.id}`, { method: "DELETE" });
      await loadEverything();
    };
    return card;
  }

  // === MACHINES/COMPONENT TREE ===
  function populateMainMachineSelect(selectedMachineId) {
    const select = document.getElementById("machine-select");
    select.innerHTML = "";
    allMachines.forEach(machine => {
      const opt = document.createElement("option");
      opt.value = machine.id;
      opt.textContent = machine.name;
      if (machine.id === selectedMachineId) opt.selected = true;
      select.appendChild(opt);
    });
  }
  machineSelect.onchange = renderMachineComponents;
  function renderMachineComponents() {
    const machineId = machineSelect.value || (allMachines[0] && allMachines[0].id);
    const comps = allComponents.filter(c => c.machine_id === machineId);
    machineComponentsList.innerHTML = "";
    comps.forEach(comp => {
      const div = document.createElement("div");
      div.className = "component-block";
      div.innerHTML = `<h3>${comp.name} <span class="comp-status">[${comp.status}]</span></h3>`;
      const compSensors = allSensors.filter(s => s.component_id === comp.id);
      if (compSensors.length) {
        compSensors.forEach(sensor => {
          div.appendChild(createSensorCard(sensor));
        });
      } else {
        div.innerHTML += `<em>No sensors assigned.</em>`;
      }
      machineComponentsList.appendChild(div);
    });
  }
  function populateComponentSelect(selectedMachineId, selectedComponentId = "") {
    sensorComponentSelect.innerHTML = "";
    const filtered = allComponents.filter(c => c.machine_id === selectedMachineId);
    filtered.forEach(component => {
      const opt = document.createElement("option");
      opt.value = component.id;
      opt.textContent = component.name + (component.status ? ` [${component.status}]` : "");
      opt.selected = component.id === selectedComponentId;
      sensorComponentSelect.appendChild(opt);
    });
    if (filtered.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No components found";
      sensorComponentSelect.appendChild(opt);
    }
  }
  function populateMachineSelect(selectedMachineId = "") {
    sensorMachineSelect.innerHTML = "";
    allMachines.forEach(machine => {
      const opt = document.createElement("option");
      opt.value = machine.id;
      opt.textContent = machine.name;
      opt.selected = (machine.id === selectedMachineId);
      sensorMachineSelect.appendChild(opt);
    });
  }
  sensorMachineSelect.onchange = function() {
    const machineId = sensorMachineSelect.value;
    populateComponentSelect(machineId, "");
    if (sensorComponentSelect.options.length > 0) {
      sensorComponentSelect.value = sensorComponentSelect.options[0].value;
    }
  };

  // --- SENSOR MODAL ---
  async function openSensorModal(sensor) {
    await Promise.all([fetchMachines(), fetchComponents()]);
    let selectedMachineId = "";
    if (sensor.component_id) {
      const comp = allComponents.find(c => c.id === sensor.component_id);
      if (comp) selectedMachineId = comp.machine_id;
    }
    selectedMachineId = selectedMachineId || (allMachines[0] && allMachines[0].id);
    populateMachineSelect(selectedMachineId);
    populateComponentSelect(selectedMachineId, sensor.component_id);

    sensorModal.style.display = "flex";
    sensorModalTitle.textContent = sensor.component_id ? "Edit Sensor" : "Assign Sensor";
    sensorIdInput.value = sensor.id;
    sensorNameInput.value = sensor.name || "";
    sensorTypeInput.value = sensor.sensor_type || "";
    sensorMcuInput.value = sensor.microcontroller_type || "";
    sensorManuInput.value = sensor.manufacturer || "";
    sensorMqttInput.value = sensor.mqtt_topic || "";
    sensorStatusInput.value = sensor.status || "PENDING";
    sensorMachineSelect.value = selectedMachineId;
    sensorComponentSelect.value = sensor.component_id || (allComponents[0] ? allComponents[0].id : "");
    sensorDeleteBtn.style.display = sensor.id ? "inline-block" : "none";

    try {
      const res = await fetch(`/api/sensor/${sensor.id}`);
      if (res.ok) {
        const latest = await res.json();
        sensorNameInput.value = latest.name || "";
        sensorTypeInput.value = latest.sensor_type || "";
        sensorMcuInput.value = latest.microcontroller_type || "";
        sensorManuInput.value = latest.manufacturer || "";
        sensorMqttInput.value = latest.mqtt_topic || "";
        sensorStatusInput.value = latest.status || "PENDING";
        sensorComponentSelect.value = latest.component_id || (allComponents[0] ? allComponents[0].id : "");
      }
    } catch {}
  }

  sensorCancelBtn.onclick = () => {
    sensorModal.style.display = "none";
    sensorForm.reset();
  };
  sensorModal.onclick = (e) => {
    if (e.target === sensorModal) {
      sensorModal.style.display = "none";
      sensorForm.reset();
    }
  };
  sensorForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = sensorIdInput.value;
    const payload = {
      name: sensorNameInput.value.trim(),
      sensor_type: sensorTypeInput.value.trim(),
      microcontroller_type: sensorMcuInput.value.trim(),
      manufacturer: sensorManuInput.value.trim(),
      mqtt_topic: sensorMqttInput.value.trim(),
      status: sensorStatusInput.value,
      component_id: sensorComponentSelect.value,
    };
    try {
      const res = await fetch(`/api/sensor/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showSensorMessage("Sensor updated", "success");
        sensorModal.style.display = "none";
        await fetchSensors();
        renderSensorsOverview();
        renderMachineComponents();
      } else {
        showSensorMessage("Failed to update sensor", "error");
      }
    } catch {
      showSensorMessage("Error updating sensor", "error");
    }
  };
  sensorDeleteBtn.onclick = async () => {
    const id = sensorIdInput.value;
    if (!id) return;
    if (!confirm("Delete this sensor?")) return;
    try {
      const res = await fetch(`/api/sensor/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSensorMessage("Sensor deleted", "success");
        sensorModal.style.display = "none";
        await fetchSensors();
        renderSensorsOverview();
        renderMachineComponents();
      } else {
        showSensorMessage("Failed to delete sensor", "error");
      }
    } catch {
      showSensorMessage("Failed to delete sensor", "error");
    }
  };

  // --- FIELDS MODAL ---
  let activeSensorId = null;
  let currentSensorFields = [];
  function openFieldsModal(sensorId, sensorName) {
    fieldsModal.style.display = "flex";
    fieldsModal.querySelector("h2").innerHTML = `Manage MQTT Fields<br><small style="font-weight:normal;font-size:1em;">for <b>${sensorName}</b></small>`;
    activeSensorId = sensorId;
    fetchSensorFields(sensorId);
    addFieldForm.reset();
    addFieldForm.removeAttribute("data-edit-id");
    saveFieldBtn.textContent = "Add Field";
    cancelEditFieldBtn.style.display = "none";
  }
  closeFieldsModalBtn.onclick = () => {
    fieldsModal.style.display = "none";
    addFieldForm.reset();
    addFieldForm.removeAttribute("data-edit-id");
  };
  fieldsModal.onclick = (e) => {
    if (e.target === fieldsModal) {
      fieldsModal.style.display = "none";
      addFieldForm.reset();
      addFieldForm.removeAttribute("data-edit-id");
    }
  };

  async function fetchSensorFields(sensorId) {
    try {
      const res = await fetch(`/api/sensor/${sensorId}/fields`);
      currentSensorFields = await res.json();
      renderSensorFields();
    } catch {
      currentSensorFields = [];
      renderSensorFields();
    }
  }
  function renderSensorFields() {
    fieldsList.innerHTML = "";
    if (!currentSensorFields.length) {
      fieldsList.innerHTML = "<em>No fields defined for this sensor.</em>";
      return;
    }
    currentSensorFields.forEach(field => {
      const div = document.createElement("div");
      div.className = "sensor-field";
      div.innerHTML = `
        <span><b>${field.field_name}</b> (${field.unit || "-"})</span>
        <button class="edit-field-btn" title="Edit">✎</button>
        <button class="delete-field-btn" title="Delete">🗑️</button>
      `;
      div.querySelector(".edit-field-btn").onclick = () => {
        fieldNameInput.value = field.field_name;
        fieldUnitInput.value = field.unit || "";
        addFieldForm.setAttribute("data-edit-id", field.id);
        saveFieldBtn.textContent = "Save Field";
        cancelEditFieldBtn.style.display = "inline-block";
        fieldNameInput.focus();
      };
      div.querySelector(".delete-field-btn").onclick = async () => {
        if (!confirm("Delete this field?")) return;
        try {
          await fetch(`/api/sensor/${activeSensorId}/fields/${field.id}`, { method: "DELETE" });
          fetchSensorFields(activeSensorId);
        } catch {}
      };
      fieldsList.appendChild(div);
    });
  }
  addFieldForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = fieldNameInput.value.trim();
    const unit = fieldUnitInput.value.trim();
    const editId = addFieldForm.getAttribute("data-edit-id");
    if (!name) return;
    try {
      if (editId) {
        await fetch(`/api/sensor/${activeSensorId}/fields/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field_name: name, unit })
        });
        addFieldForm.removeAttribute("data-edit-id");
        saveFieldBtn.textContent = "Add Field";
        cancelEditFieldBtn.style.display = "none";
      } else {
        await fetch(`/api/sensor/${activeSensorId}/fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field_name: name, unit })
        });
      }
      addFieldForm.reset();
      fetchSensorFields(activeSensorId);
    } catch {}
  };
  cancelEditFieldBtn.onclick = () => {
    addFieldForm.reset();
    addFieldForm.removeAttribute("data-edit-id");
    saveFieldBtn.textContent = "Add Field";
    cancelEditFieldBtn.style.display = "none";
  };

  // === FIRMWARE MODAL LOGIC ===

  function displayVersion(version) {
    if (!version) return "";
    return version.startsWith("V") ? version : `V${version}`;
  }

  function openFirmwareModal(sensor) {
    firmwareSensor = sensor;
    firmwareModalSensorName.textContent = sensor.name || "(unnamed)";
    firmwareModalMac.textContent = sensor.mac_address || "";
    firmwareUploadStatus.textContent = "";
    firmwareUploadVersion.value = "";
    firmwareUploadType.value = "development";
    firmwareUploadFile.value = "";
    loadAndRenderFirmware(sensor.id);
    firmwareModal.style.display = "flex";
  }
  firmwareModalClose.onclick = () => { firmwareModal.style.display = "none"; };
  firmwareModal.onclick = (e) => {
    if (e.target === firmwareModal) firmwareModal.style.display = "none";
  };

  async function loadAndRenderFirmware(sensorId) {
    try {
      const res = await fetch(`/api/firmware/sensor/${sensorId}?show=all`);
      firmwareList = await res.json();
      renderFirmwareModal();
    } catch {
      firmwareList = [];
      renderFirmwareModal();
      firmwareUploadStatus.textContent = "Failed to load firmware list.";
    }
  }

  function renderFirmwareModal() {
    // --- FILTERING ---
    let filtered = firmwareList.slice();
    if (firmwareFilterEnv.value === "production")
      filtered = filtered.filter(f => f.environment === "production" && !f.deleted_at);
    else if (firmwareFilterEnv.value === "development")
      filtered = filtered.filter(f => f.environment === "development" && !f.deleted_at);
    else if (firmwareFilterEnv.value === "deleted")
      filtered = filtered.filter(f => f.deleted_at);

    if (firmwareFilterVersion.value)
      filtered = filtered.filter(f => f.version && f.version.toLowerCase().includes(firmwareFilterVersion.value.toLowerCase()));
    if (firmwareFilterDate.value)
      filtered = filtered.filter(f => f.uploaded_at && f.uploaded_at.startsWith(firmwareFilterDate.value));
    if (firmwareFilterSize.value)
      filtered = filtered.filter(f => (f.file_size_bytes || 0) >= parseInt(firmwareFilterSize.value) * 1024);

    // --- SORTING ---
    const sortKey = firmwareSortKey.value;
    const sortDir = firmwareSortDir.value;
    filtered.sort((a, b) => {
      let x = a[sortKey], y = b[sortKey];
      if (sortKey === "uploaded_at") { x = new Date(x); y = new Date(y); }
      if (x == null) return 1;
      if (y == null) return -1;
      if (x < y) return sortDir === "asc" ? -1 : 1;
      if (x > y) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    // --- GROUPS ---
    const prodFiltered = filtered.filter(f => f.environment === "production" && !f.deleted_at);
    const devFiltered = filtered.filter(f => f.environment === "development" && !f.deleted_at);
    const deletedFiltered = filtered.filter(f => f.deleted_at);

    // --- TABLE RENDER ---
    firmwareSectionProd.innerHTML = sectionFirmwareTable(prodFiltered, "Production Firmware", "No production firmware found.");
    firmwareSectionDev.innerHTML = sectionFirmwareTable(devFiltered, "Development Firmware", "No development firmware found.");
    firmwareSectionDeleted.innerHTML = sectionFirmwareTable(deletedFiltered, "Recently Deleted", "No deleted firmware.");

    // --- HEADER ---
    const current = prodFiltered[0] || devFiltered[0];
    firmwareCurrentVersion.textContent = current ? displayVersion(current.version) : "-";
    firmwareCurrentType.textContent = current ? current.environment : "";
    firmwareCurrentType.className = "badge " + (current && current.environment === "production" ? "badge-prod" : "badge-dev");
    firmwareCurrentDate.textContent = current ? (current.uploaded_at ? new Date(current.uploaded_at).toLocaleString() : "-") : "";
    const totalBytes = firmwareList.reduce((sum, f) => sum + (f.file_size_bytes || 0), 0);
    firmwareTotalSize.textContent = formatSize(totalBytes);

    // --- Attach actions for all new rows ---
    document.querySelectorAll(".ota-btn").forEach(btn => {
      btn.onclick = async () => { await triggerFirmwareOTA(btn.dataset.id); };
    });
    document.querySelectorAll(".perma-delete-btn").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Permanently delete this firmware file?")) return;
        await permaDeleteFirmware(btn.dataset.id);
      };
    });
    document.querySelectorAll(".soft-delete-btn").forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Soft-delete this production firmware (will be deleted in 14 days)?")) return;
        await softDeleteFirmware(btn.dataset.id);
      };
    });
    document.querySelectorAll(".restore-btn").forEach(btn => {
      btn.onclick = async () => { await restoreFirmware(btn.dataset.id); };
    });
  }

  function sectionFirmwareTable(rows, label, emptyMsg) {
    if (!rows.length) return `<div class="firmware-section-header">${label}<div class="empty-msg">${emptyMsg}</div></div>`;
    let html = `<div class="firmware-section-header">${label}</div>
    <table class="firmware-table">
      <thead>
        <tr>
          <th>Version</th>
          <th>Type</th>
          <th>Upload Date</th>
          <th>Size</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>`;
    rows.forEach(fw => {
      const isProd = fw.environment === "production";
      const deleted = fw.deleted_at;
      html += `<tr${deleted ? ' class="deleted"' : ''}>
        <td>${displayVersion(fw.version)}</td>
        <td><span class="badge ${isProd ? 'badge-prod' : 'badge-dev'}">${fw.environment}</span></td>
        <td>${fw.uploaded_at ? new Date(fw.uploaded_at).toLocaleString() : "-"}</td>
        <td>${formatSize(fw.file_size_bytes)}</td>
        <td>${deleted
              ? `Deleted<br><button class="restore-btn" data-id="${fw.id}">Restore</button>`
              : "Active"}
        </td>
        <td>
          ${!deleted ? `<button class="ota-btn" data-id="${fw.id}">OTA</button>` : ""}
          ${deleted ? (isProd ? "" : `<button class="perma-delete-btn" data-id="${fw.id}">Delete Forever</button>`)
                    : (isProd
                      ? `<button class="soft-delete-btn" data-id="${fw.id}">Delete</button>`
                      : `<button class="perma-delete-btn" data-id="${fw.id}">Delete Forever</button>`)}
        </td>
      </tr>`;
    });
    html += "</tbody></table>";
    return html;
  }

  // --- FIRMWARE FILTERS ---
  firmwareFilterEnv.onchange =
  firmwareFilterVersion.oninput =
  firmwareFilterDate.oninput =
  firmwareFilterSize.oninput =
  firmwareSortKey.onchange =
  firmwareSortDir.onchange = renderFirmwareModal;
  firmwareClearFilters.onclick = () => {
    firmwareFilterEnv.value = "";
    firmwareFilterVersion.value = "";
    firmwareFilterDate.value = "";
    firmwareFilterSize.value = "";
    renderFirmwareModal();
  };

  // --- FIRMWARE UPLOAD ---
  firmwareUploadForm.onsubmit = async e => {
    e.preventDefault();
    if (!firmwareUploadFile.files.length) {
      firmwareUploadStatus.textContent = "No file selected";
      return;
    }
    firmwareUploadStatus.textContent = "Uploading...";
    const formData = new FormData();
    formData.append("firmware", firmwareUploadFile.files[0]);
    formData.append("version", firmwareUploadVersion.value.replace(/^V/i, ""));
    formData.append("environment", firmwareUploadType.value);

    let firmwareId;
    try {
      const res = await fetch(`/api/firmware/sensor/${firmwareSensor.id}`, { method: "POST", body: formData });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "Upload failed");
      firmwareId = data.firmwareId;
      firmwareUploadStatus.textContent = "Upload successful!";
      await loadAndRenderFirmware(firmwareSensor.id);
      if (firmwareId) await triggerFirmwareOTA(firmwareId);
    } catch (err) {
      firmwareUploadStatus.textContent = "Upload failed: " + err.message;
    }
  };

  async function triggerFirmwareOTA(firmwareId) {
    firmwareUploadStatus.textContent = "Triggering OTA...";
    try {
      const res = await fetch("/api/firmware/ota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensorId: firmwareSensor.id, firmwareId })
      });
      const data = await res.json();
      firmwareUploadStatus.textContent = data.ok
        ? "OTA triggered!"
        : (data.message || "OTA failed");
    } catch (err) {
      firmwareUploadStatus.textContent = "OTA failed: " + err.message;
    }
  }

  async function permaDeleteFirmware(firmwareId) {
    try {
      const res = await fetch(`/api/firmware/${firmwareId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadAndRenderFirmware(firmwareSensor.id);
    } catch (err) {
      firmwareUploadStatus.textContent = "Delete failed: " + err.message;
    }
  }
  async function softDeleteFirmware(firmwareId) {
    try {
      const res = await fetch(`/api/firmware/${firmwareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undelete: false })
      });
      if (!res.ok) throw new Error("Soft delete failed");
      await loadAndRenderFirmware(firmwareSensor.id);
    } catch (err) {
      firmwareUploadStatus.textContent = "Soft delete failed: " + err.message;
    }
  }
  async function restoreFirmware(firmwareId) {
    try {
      const res = await fetch(`/api/firmware/${firmwareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undelete: true })
      });
      if (!res.ok) throw new Error("Restore failed");
      await loadAndRenderFirmware(firmwareSensor.id);
    } catch (err) {
      firmwareUploadStatus.textContent = "Restore failed: " + err.message;
    }
  }

  function formatSize(bytes) {
    if (!bytes) return "-";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  setInterval(() => {
    if (
      sensorModal.style.display !== "flex" &&
      fieldsModal.style.display !== "flex" &&
      firmwareModal.style.display !== "flex"
    ) {
      loadEverything();
    }
  }, 15000);

  loadEverything();
});
