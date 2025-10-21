    use serde::{Serialize, Deserialize};

    #[derive(Debug, Serialize, Deserialize, Clone)]
    pub struct FactureItem {
        pub description: String,
        pub quantity: f64,
        pub prix_unitaire: f64,
        pub frais_service_unitaire: f64,
        pub total: f64,
    }

    #[derive(Debug, Serialize, Deserialize, Clone)]
    pub struct Facture {
        pub id: Option<i64>,
        pub facture_number: String,
        pub client_name: String,
        pub client_address: Option<String>,
        pub client_ice: Option<String>,
        pub date: String,
        pub items: Vec<FactureItem>,
        #[serde(rename = "r#type")] // Handle JS 'type' keyword
        pub r#type: String,
        pub show_margin: bool,
        pub prix_total_hors_frais: f64,
        pub total_frais_service_ht: f64,
        pub tva: f64,
        pub total: f64,
        pub notes: Option<String>,
    }
    
    // The structure for creating a facture, which might not have an ID yet.
    #[derive(Debug, Deserialize)]
    pub struct FactureData {
        pub facture_number: Option<String>,
        pub client_name: String,
        pub client_address: Option<String>,
        pub client_ice: Option<String>,
        pub date: String,
        pub items: Vec<FactureItem>,
        #[serde(rename = "r#type")]
        pub r#type: String,
        pub show_margin: bool,
        pub prix_total_hors_frais: f64,
        pub total_frais_service_ht: f64,
        pub tva: f64,
        pub total: f64,
        pub notes: Option<String>,
    }

    #[derive(Debug, Serialize)]
    pub struct Pagination {
        pub current_page: i64,
        pub total_pages: i64,
        pub total_count: i64,
    }

    #[derive(Debug, Serialize)]
    pub struct PaginatedResponse {
        pub data: Vec<Facture>,
        pub pagination: Pagination,
    }

    #[derive(Debug, Serialize, Deserialize)]
    pub struct Theme {
        pub styles: serde_json::Value,
    }
    
