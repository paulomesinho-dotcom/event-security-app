const fs = require('fs');

let content = fs.readFileSync('src/components/LocationManager.tsx', 'utf8');

// 1. Remove const dates = ["10/jul", ...];
content = content.replace(/const dates = \["10\/jul", "11\/jul", "12\/jul"\];\n/g, '');

// 2. Add an Add Date function to the component
const addDateFunc = `
  const handleAddDate = () => {
    const newDate = prompt("Introduza a data (ex: 2026-08-15 ou 15/ago):");
    if (!newDate) return;
    if (draftShifts[newDate]) {
      alert("Esta data já existe.");
      return;
    }
    setDraftShifts((prev: any) => ({
      ...prev,
      [newDate]: { manha: { start: "", end: "" }, tarde: { start: "", end: "" } }
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveDate = (dateToRemove: string) => {
    if (!confirm(\`Remover os horários do dia \${dateToRemove}?\`)) return;
    setDraftShifts((prev: any) => {
      const copy = { ...prev };
      delete copy[dateToRemove];
      return copy;
    });
    setHasUnsavedChanges(true);
  };
`;
content = content.replace(/const closeDrawer = \(\) => \{/, addDateFunc + '\n  const closeDrawer = () => {');

// 3. Update openCreateDrawer
const createDrawerOld = `const initial: any = {};
    for (const d of dates) {
      initial[d] = { manha: { start: "", end: "" }, tarde: { start: "", end: "" } };
    }
    setDraftShifts(initial);`;
const createDrawerNew = `setDraftShifts({});`;
content = content.replace(createDrawerOld, createDrawerNew);

// 4. Update openEditDrawer
const editDrawerOld = `const initial: any = {};
    for (const d of dates) {
      initial[d] = { manha: { start: "", end: "" }, tarde: { start: "", end: "" } };
      for (const p of periods) {
        const existing = loc.customShifts?.[d]?.[p] || { start: "", end: "" };
        initial[d][p] = { ...existing };
      }
    }
    setDraftShifts(initial);`;
const editDrawerNew = `const initial: any = {};
    if (loc.customShifts) {
      for (const d of Object.keys(loc.customShifts)) {
        initial[d] = { manha: { start: "", end: "" }, tarde: { start: "", end: "" } };
        for (const p of periods) {
          const existing = loc.customShifts[d]?.[p] || { start: "", end: "" };
          initial[d][p] = { ...existing };
        }
      }
    }
    setDraftShifts(initial);`;
content = content.replace(editDrawerOld, editDrawerNew);

// 5. Update render
const renderOld = `{dates.map(date => (
                    <div key={date} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        <h5 style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "var(--color-primary)" }}>Dia {date}</h5>`;
const renderNew = `{Object.keys(draftShifts).sort().map(date => (
                    <div key={date} style={{ background: "var(--color-bg)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", position: "relative" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                          <h5 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-primary)" }}>Dia {date}</h5>
                          {!isReadOnly && (
                            <button onClick={() => handleRemoveDate(date)} style={{ background: "transparent", border: "none", color: "var(--color-danger)", cursor: "pointer", padding: "0.2rem", display: "flex" }} title="Remover Dia">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>`;
content = content.replace(renderOld, renderNew);

// 6. Add "Add Date" button under "Horários de Turnos" header
const headerOld = `<h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Clock size={14} /> Horários de Turnos (Opcional)
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>`;
const headerNew = `<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.7, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Clock size={14} /> Horários de Turnos (Opcional)
                  </h4>
                  {!isReadOnly && (
                    <button onClick={handleAddDate} className="btn btn-secondary" style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem", borderRadius: "var(--radius-full)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Plus size={14} /> Adicionar Dia
                    </button>
                  )}
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>`;
content = content.replace(headerOld, headerNew);

fs.writeFileSync('src/components/LocationManager.tsx', content);
console.log("Updated LocationManager.tsx");
