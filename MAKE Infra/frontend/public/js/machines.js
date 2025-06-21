// machines.js

document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const machinesList = document.getElementById("machines-list");
  const message = document.getElementById("message");

  // Modal for add/edit machine
  const machineModal = document.getElementById("machine-modal");
  const machineForm = document.getElementById("machine-form");
  const openAddMachineBtn = document.getElementById("open-add-machine-modal");
  const cancelMachineBtn = document.getElementById("cancel-machine-btn");
  const machineModalTitle = document.getElementById("machine-modal-title");
  const editMachineIdInput = document.getElementById("edit-machine-id");

  // Detail modal
  const detailModal = document.getElementById("machine-detail-modal");
  const detailForm = document.getElementById("machine-detail-form");
  const closeDetailModalBtn = document.getElementById("close-detail-modal");
  const deleteDetailBtn = document.getElementById("delete-detail-btn");

  let activeMachineId = null;
  let activeDetailId = null;

  // Message utility
  function showMessage(text, type = "") {
    message.textContent = text;
    message.className = type ? type : "";
    setTimeout(() => { message.textContent = ""; message.className = ""; }, 3000);
  }

  // ---------- Machines CRUD ----------
  async function fetchMachines() {
    machinesList.innerHTML = "<em>Loading...</em>";
    try {
      const res = await fetch("/api/machines");
      if (!res.ok) throw new Error("Failed to load");
      const machines = await res.json();
      machinesList.innerHTML = "";
      if (machines.length === 0) {
        machinesList.innerHTML = "<em>No machines yet.</em>";
        return;
      }
      machines.forEach(machine => {
        machinesList.appendChild(renderMachineCard(machine));
      });
    } catch (err) {
      machinesList.innerHTML = "<em>Error loading machines</em>";
      showMessage("Could not load machines", "error");
    }
  }

  function renderMachineCard(machine) {
    const card = document.createElement("div");
    card.className = "machine-card";
    card.innerHTML = `
      <strong>${machine.name}</strong>
      <small>Supplier: ${machine.supplier || "-"}</small>
      <small>Location: ${machine.location || "-"}</small>
      <small>Description: ${machine.description || "-"}</small>
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
      <button class="details-btn">Machine Details</button>
      <div class="components-list" id="components-for-${machine.id}"></div>
      <form class="add-component-form" data-machine-id="${machine.id}" autocomplete="off">
        <input type="text" name="name" placeholder="Component name" required>
        <input type="text" name="status" placeholder="Status (e.g. OK)" required>
        <button type="submit">Add Component</button>
      </form>
    `;

    // Open edit modal
    card.querySelector(".edit-btn").onclick = () => {
      openMachineModal("edit", machine);
    };

    // Delete machine
    card.querySelector(".delete-btn").onclick = async () => {
      if (!confirm("Delete this machine and all its components/details?")) return;
      try {
        const res = await fetch(`/api/machines/${machine.id}`, { method: "DELETE" });
        if (res.ok) {
          showMessage("Machine deleted", "success");
          fetchMachines();
        } else {
          showMessage("Failed to delete machine", "error");
        }
      } catch {
        showMessage("Failed to delete machine", "error");
      }
    };

    // Show machine details modal
    card.querySelector(".details-btn").onclick = () => {
      openDetailModal(machine.id);
    };

    // Add component to machine
    card.querySelector(".add-component-form").onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value.trim();
      const status = form.status.value.trim() || "OK";
      if (!name) return;
      try {
        const resp = await fetch("/api/components", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            status,
            machine_id: machine.id,
          }),
        });
        if (resp.ok) {
          form.reset();
          fetchComponentsForMachine(machine.id, card);
          showMessage("Component added!", "success");
        } else {
          const msg = (await resp.json()).error || "Error adding component";
          showMessage(msg, "error");
        }
      } catch (err) {
        showMessage("Error adding component", "error");
      }
    };

    // Fetch and show components
    fetchComponentsForMachine(machine.id, card);

    return card;
  }

  // Modal logic for add/edit machine
  function openMachineModal(mode, machine) {
    machineModal.style.display = "flex";
    machineForm.reset();
    if (mode === "edit" && machine) {
      machineModalTitle.textContent = "Edit Machine";
      machineForm["name"].value = machine.name || "";
      machineForm["supplier"].value = machine.supplier || "";
      machineForm["location"].value = machine.location || "";
      machineForm["description"].value = machine.description || "";
      editMachineIdInput.value = machine.id;
    } else {
      machineModalTitle.textContent = "Add Machine";
      editMachineIdInput.value = "";
    }
  }

  openAddMachineBtn.onclick = () => openMachineModal("add");

  cancelMachineBtn.onclick = () => {
    machineModal.style.display = "none";
    machineForm.reset();
    editMachineIdInput.value = "";
  };

  machineModal.onclick = (e) => {
    if (e.target === machineModal) {
      machineModal.style.display = "none";
      machineForm.reset();
      editMachineIdInput.value = "";
    }
  };

  machineForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = editMachineIdInput.value;
    const name = machineForm["name"].value.trim();
    const supplier = machineForm["supplier"].value.trim();
    const location = machineForm["location"].value.trim();
    const description = machineForm["description"].value.trim();

    if (!name) return showMessage("Name is required", "error");

    try {
      let res;
      if (id) {
        res = await fetch(`/api/machines/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, supplier, location, description }),
        });
      } else {
        res = await fetch("/api/machines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, supplier, location, description }),
        });
      }
      if (res.ok) {
        fetchMachines();
        showMessage(id ? "Machine updated" : "Machine added!", "success");
        machineModal.style.display = "none";
        machineForm.reset();
        editMachineIdInput.value = "";
      } else {
        showMessage("Failed to save machine", "error");
      }
    } catch {
      showMessage("Error saving machine", "error");
    }
  };

  // -------- Components CRUD (as before) --------
  async function fetchComponentsForMachine(machineId, cardElem) {
    const listDiv = cardElem ? cardElem.querySelector(`#components-for-${machineId}`) : document.getElementById(`components-for-${machineId}`);
    if (!listDiv) return;
    listDiv.innerHTML = "<em>Loading...</em>";
    try {
      const res = await fetch(`/api/machines/${machineId}/components`);
      const components = await res.json();
      if (!Array.isArray(components) || !components.length) {
        listDiv.innerHTML = "<em>No components yet.</em>";
        return;
      }
      listDiv.innerHTML = "";
      components.forEach(comp => {
        listDiv.appendChild(renderComponentCard(comp, machineId));
      });
    } catch {
      listDiv.innerHTML = "<em>Error loading components.</em>";
    }
  }

  function renderComponentCard(comp, machineId) {
    const card = document.createElement("div");
    card.className = "component-card";
    card.innerHTML = `<strong>${comp.name}</strong> (${comp.status || "OK"})
      <button class="edit-component">Edit</button>
      <button class="delete-component">Delete</button>
    `;

    // Edit component
    card.querySelector(".edit-component").onclick = async () => {
      const newName = prompt("Component name:", comp.name);
      const newStatus = prompt("Component status:", comp.status || "OK");
      if (newName && (newName !== comp.name || newStatus !== comp.status)) {
        try {
          const res = await fetch(`/api/components/${comp.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, status: newStatus }),
          });
          if (res.ok) {
            fetchComponentsForMachine(machineId);
            showMessage("Component updated", "success");
          } else {
            showMessage("Update failed", "error");
          }
        } catch {
          showMessage("Error updating component", "error");
        }
      }
    };

    // Delete component
    card.querySelector(".delete-component").onclick = async () => {
      if (!confirm("Delete this component?")) return;
      try {
        const res = await fetch(`/api/components/${comp.id}`, { method: "DELETE" });
        if (res.ok) {
          fetchComponentsForMachine(machineId);
          showMessage("Component deleted", "success");
        } else {
          showMessage("Failed to delete", "error");
        }
      } catch {
        showMessage("Failed to delete", "error");
      }
    };

    return card;
  }

  // --------- Machine Details Modal (CRUD, unchanged) ---------
  async function openDetailModal(machineId) {
    detailModal.style.display = "flex";
    detailForm.reset();
    detailForm["machine_id"].value = machineId;
    activeMachineId = machineId;
    activeDetailId = null;

    // Fetch existing details for this machine
    try {
      const res = await fetch(`/api/machines/${machineId}/details`);
      const details = await res.json();
      if (details && details.length > 0) {
        const detail = details[0];
        for (let key of ["serial_number","current_job","install_date","last_checkup_date","next_checkup_date","notes"]) {
          if (detailForm[key]) detailForm[key].value = detail[key] || "";
        }
        detailForm["detail_id"].value = detail.id;
        activeDetailId = detail.id;
        deleteDetailBtn.style.display = "inline-block";
      } else {
        deleteDetailBtn.style.display = "none";
      }
    } catch {
      showMessage("Error fetching details", "error");
      deleteDetailBtn.style.display = "none";
    }
  }

  closeDetailModalBtn.onclick = () => { detailModal.style.display = "none"; };

  detailModal.onclick = (e) => {
    if (e.target === detailModal) detailModal.style.display = "none";
  };

  detailForm.onsubmit = async (e) => {
    e.preventDefault();
    const form = detailForm;
    const payload = {
      serial_number: form.serial_number.value.trim(),
      current_job: form.current_job.value.trim(),
      install_date: form.install_date.value,
      last_checkup_date: form.last_checkup_date.value,
      next_checkup_date: form.next_checkup_date.value,
      notes: form.notes.value.trim(),
      machine_id: activeMachineId,
    };
    try {
      let url = `/api/machines/${activeMachineId}/details`;
      let method = "POST";
      if (activeDetailId) {
        url = `/api/machines/details/${activeDetailId}`;
        method = "PATCH";
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showMessage("Detail saved", "success");
        detailModal.style.display = "none";
      } else {
        showMessage("Error saving detail", "error");
      }
    } catch {
      showMessage("Error saving detail", "error");
    }
  };

  deleteDetailBtn.onclick = async () => {
    if (!activeDetailId) return;
    if (!confirm("Delete this detail?")) return;
    try {
      const res = await fetch(`/api/machines/details/${activeDetailId}`, { method: "DELETE" });
      if (res.ok) {
        showMessage("Detail deleted", "success");
        detailModal.style.display = "none";
      } else {
        showMessage("Failed to delete", "error");
      }
    } catch {
      showMessage("Failed to delete", "error");
    }
  };

  // Initial load
  fetchMachines();
});
