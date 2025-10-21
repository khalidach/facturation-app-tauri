import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const emptyItem = {
  description: "",
  quantity: 1,
  prix_unitaire: 0,
  frais_service_unitaire: 0,
};

// Renaming fields to match Rust's snake_case convention
// This will be important when we send data to the backend.
const toSnakeCase = (obj) => {
  const newObj = {};
  for (const key in obj) {
    const newKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    newObj[newKey] = obj[key];
  }
  return newObj;
};

export default function FactureForm({
  onSave,
  onCancel,
  existingFacture,
  showMarginOnNew = true,
}) {
  const [type, setType] = useState("facture");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientICE, setClientICE] = useState("");
  const [date, setDate] = useState(new Date());
  const [items, setItems] = useState([emptyItem]);
  const [notes, setNotes] = useState("");
  const [showMargin, setShowMargin] = useState(showMarginOnNew);
  const [factureNumber, setFactureNumber] = useState("");

  useEffect(() => {
    if (existingFacture) {
      setType(existingFacture.type); // 'type' is a reserved keyword in Rust
      setClientName(existingFacture.client_name);
      setClientAddress(existingFacture.client_address || "");
      setClientICE(existingFacture.client_ice || "");
      const dateParts = existingFacture.date.split("-");
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      setDate(new Date(year, month, day));
      setShowMargin(existingFacture.show_margin ?? true);
      setFactureNumber(existingFacture.facture_number || "");

      // Items from rust are already parsed.
      setItems(
        existingFacture.items.length > 0 ? existingFacture.items : [emptyItem]
      );
      setNotes(existingFacture.notes || "");
    } else {
      setType("facture");
      setClientName("");
      setClientAddress("");
      setClientICE("");
      setDate(new Date());
      setItems([emptyItem]);
      setNotes("");
      setShowMargin(showMarginOnNew);
      setFactureNumber("");
    }
  }, [existingFacture, showMarginOnNew]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    if (!showMargin) {
      item.frais_service_unitaire = 0;
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const calculatedTotals = useMemo(() => {
    let prixTotalHorsFrais = 0;
    let totalFraisServiceTTC = 0;

    const itemsWithTotals = items.map((item) => {
      const quantite = Number(item.quantity) || 0;
      const prixUnitaire = Number(item.prix_unitaire) || 0;
      const fraisServiceUnitaireTTC = showMargin
        ? Number(item.frais_service_unitaire) || 0
        : 0;
      const montantTotal =
        quantite * prixUnitaire + quantite * fraisServiceUnitaireTTC;
      prixTotalHorsFrais += quantite * prixUnitaire;
      totalFraisServiceTTC += quantite * fraisServiceUnitaireTTC;
      return { ...item, total: montantTotal };
    });

    const totalFraisServiceHT = totalFraisServiceTTC / 1.2;
    const tva = totalFraisServiceHT * 0.2;
    const totalFacture = prixTotalHorsFrais + totalFraisServiceTTC;

    return {
      itemsWithTotals,
      prixTotalHorsFrais,
      totalFraisServiceHT,
      tva,
      totalFacture,
    };
  }, [items, showMargin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalItems = calculatedTotals.itemsWithTotals.map((item) => ({
      description: item.description,
      quantity: Number(item.quantity),
      prix_unitaire: Number(item.prix_unitaire),
      frais_service_unitaire: Number(item.frais_service_unitaire),
      total: Number(item.total),
    }));

    const dateForBackend = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];

    // Construct the payload with snake_case keys for Rust
    const payload = {
      facture_number: factureNumber,
      client_name: clientName,
      client_address: clientAddress,
      client_ice: clientICE,
      date: dateForBackend,
      items: finalItems,
      type: type, // Use r#type for rust
      show_margin: showMargin,
      prix_total_hors_frais: calculatedTotals.prixTotalHorsFrais,
      total_frais_service_ht: calculatedTotals.totalFraisServiceHT,
      tva: calculatedTotals.tva,
      total: calculatedTotals.totalFacture,
      notes: notes,
    };

    onSave(payload);
  };

  const gridColsClass = showMargin ? "grid-cols-12" : "grid-cols-10";
  const descColSpan = showMargin ? "md:col-span-4" : "md:col-span-4";
  const priceColSpan = showMargin ? "md:col-span-2" : "md:col-span-2";
  const totalColSpan = showMargin ? "md:col-span-2" : "md:col-span-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <style>{`
        .toggle-checkbox:checked { right: 0; border-color: #3b82f6; }
        .toggle-checkbox:checked + .toggle-label { background-color: #3b82f6; }
      `}</style>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <label
          htmlFor="show-margin-toggle"
          className="font-medium text-gray-700"
        >
          Display Service Fees & TVA
        </label>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input
            type="checkbox"
            name="show-margin-toggle"
            id="show-margin-toggle"
            checked={showMargin}
            onChange={(e) => {
              const checked = e.target.checked;
              setShowMargin(checked);
              if (!checked) {
                setItems(
                  items.map((item) => ({ ...item, frais_service_unitaire: 0 }))
                );
              }
            }}
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
          />
          <label
            htmlFor="show-margin-toggle"
            className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
          ></label>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Document Number
          </label>
          <input
            type="text"
            value={factureNumber}
            onChange={(e) => setFactureNumber(e.target.value)}
            placeholder="Auto-generated if left empty"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100"
            disabled={!!existingFacture}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Document Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="facture">Invoice</option>
            <option value="devis">Quote</option>
          </select>
        </div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
        Client Info
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Client Name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Client Address
          </label>
          <input
            type="text"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">ICE</label>
          <input
            type="text"
            value={clientICE}
            onChange={(e) => setClientICE(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <DatePicker
            selected={date}
            onChange={(d) => setDate(d)}
            dateFormat="dd/MM/yyyy"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            required
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
          />
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Items</h3>
      <div className="space-y-4">
        <div
          className={`hidden md:grid ${gridColsClass} gap-2 text-sm font-medium text-gray-500`}
        >
          <div className={descColSpan}>DESIGNATION</div>
          <div className="col-span-1 text-center">QU</div>
          <div className={`${priceColSpan} text-left`}>PRIX UNITAIRE</div>
          {showMargin && (
            <div className="col-span-2 text-left">FRAIS. SCE UNITAIRE</div>
          )}
          <div className={`${totalColSpan} text-left`}>MONTANT TOTAL</div>
          <div className="col-span-1"></div>
        </div>
        {calculatedTotals.itemsWithTotals.map((item, index) => (
          <div
            key={index}
            className={`grid ${gridColsClass} gap-2 items-center`}
          >
            <div className={`col-span-12 ${descColSpan}`}>
              <textarea
                placeholder="Description"
                value={item.description}
                onChange={(e) =>
                  handleItemChange(index, "description", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none overflow-hidden"
                rows={1}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                required
              />
            </div>
            <div className="col-span-4 md:col-span-1">
              <input
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  handleItemChange(index, "quantity", Number(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center"
                required
              />
            </div>
            <div className={`col-span-8 ${priceColSpan}`}>
              <input
                type="number"
                value={item.prix_unitaire}
                onChange={(e) =>
                  handleItemChange(
                    index,
                    "prix_unitaire",
                    Number(e.target.value)
                  )
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                required
              />
            </div>
            {showMargin && (
              <div className="col-span-8 md:col-span-2">
                <input
                  type="number"
                  value={item.frais_service_unitaire}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "frais_service_unitaire",
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-right"
                  required
                />
              </div>
            )}
            <div className={`col-span-10 ${totalColSpan}`}>
              <div className="w-full px-3 py-2 text-right font-medium bg-gray-100 rounded-md">
                {item.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div className="col-span-2 md:col-span-1 flex items-end justify-end">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-red-500 hover:text-red-700 p-2"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </button>
      </div>

      <div className="flex justify-end mt-6">
        <div className="w-full max-w-sm space-y-2 text-sm">
          {showMargin && (
            <>
              <div className="flex justify-between p-2 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-600">
                  Prix Total H. Frais de SCE
                </span>
                <span className="font-semibold text-gray-800">
                  {calculatedTotals.prixTotalHorsFrais.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}{" "}
                  MAD
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="font-medium text-gray-600">
                  Frais de Service Hors TVA
                </span>
                <span className="font-semibold text-gray-800">
                  {calculatedTotals.totalFraisServiceHT.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}{" "}
                  MAD
                </span>
              </div>
              <div className="flex justify-between p-2">
                <span className="font-medium text-gray-600">TVA 20%</span>
                <span className="font-semibold text-gray-800">
                  {calculatedTotals.tva.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  MAD
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2 p-2 bg-gray-100 rounded-md">
            <span>Total Facture</span>
            <span>
              {calculatedTotals.totalFacture.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              MAD
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any notes here..."
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
        ></textarea>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {existingFacture
            ? "Update Document"
            : type === "facture"
            ? "Create Invoice"
            : "Create Quote"}
        </button>
      </div>
    </form>
  );
}
