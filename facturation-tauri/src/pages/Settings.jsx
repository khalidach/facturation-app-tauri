import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { Save } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

const api = {
  getSettings: () => invoke("get_settings"),
  updateSettings: (data) => invoke("update_settings", { settings: data }),
};

export default function Settings() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({});

  const { data: initialSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });

  useEffect(() => {
    if (initialSettings) {
      const transformedSettings = {};
      for (const key in initialSettings) {
        transformedSettings[key] = initialSettings[key] || "";
      }
      setSettings(transformedSettings);
    }
  }, [initialSettings]);

  const { mutate: updateSettings, isPending } = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved successfully!");
    },
    onError: (error) => {
      toast.error(error || "Failed to save settings.");
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings((prev) => ({ ...prev, logo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateSettings(settings);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const companyFields = [
    { key: "ice", label: "ICE" },
    { key: "if", label: "IF" },
    { key: "rc", label: "RC" },
    { key: "patente", label: "Patente" },
    { key: "cnss", label: "CNSS" },
    { key: "address", label: "Address" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "bank_name", label: "Bank Name" },
    { key: "rib", label: "RIB" },
    { key: "type_societe", label: "Type of Societe" },
    { key: "capital", label: "Capital" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your company and invoice settings.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
          Facturation Settings
        </h2>

        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 border-b pb-2">
            Company Info
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                Agency Name
              </label>
              <input
                type="text"
                name="agency_name"
                value={settings.agency_name || ""}
                onChange={handleChange}
                className="mt-1 block w-full input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                Agency Logo
              </label>
              <input
                type="file"
                name="logo"
                onChange={handleFileChange}
                accept="image/*"
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {settings.logo && (
                <img
                  src={settings.logo}
                  alt="Logo Preview"
                  className="mt-4 h-20 w-auto rounded-md shadow-sm"
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                  {field.label}
                </label>
                <input
                  type="text"
                  name={field.key}
                  value={settings[field.key] || ""}
                  onChange={handleChange}
                  className="mt-1 block w-full input"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-sm disabled:bg-gray-400"
          >
            <Save className="w-5 h-5 mr-2" />
            {isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
