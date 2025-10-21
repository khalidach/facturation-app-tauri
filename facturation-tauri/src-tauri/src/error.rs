    use serde::{Serialize};

    #[derive(Debug, thiserror::Error)]
    pub enum Error {
        #[error(transparent)]
        Sqlite(#[from] rusqlite::Error),
        #[error(transparent)]
        Json(#[from] serde_json::Error),
        #[error("Database connection not available")]
        DbConnection,
        #[error("Not Found")]
        NotFound,
    }

    impl Serialize for Error {
        fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: serde::Serializer,
        {
            serializer.serialize_str(self.to_string().as_ref())
        }
    }
    
