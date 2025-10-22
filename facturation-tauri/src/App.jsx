import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import Facturation from "@/pages/Facturation.jsx";
import Settings from "@/pages/Settings.jsx";
import Theme from "@/pages/Theme.jsx";
import { Settings as SettingsIcon, FileText, Palette } from "lucide-react";

const queryClient = new QueryClient();

export default function App() {
  const [activeTab, setActiveTab] = useState("facturation");

  return (
    <div>
      <h1 style={{ color: "black", padding: "20px" }}>Hello from Tauri!</h1>
    </div>
  );
}
