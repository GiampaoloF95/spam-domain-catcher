use crate::domain;
use reqwest::header::AUTHORIZATION;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
pub struct SpamEmail {
    pub subject: String,
    pub sender_name: String,
    pub sender_address: String,
    pub spf_domain: Option<String>,
    pub dkim_domain: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GraphResponse {
    value: Vec<Message>,
}

#[derive(Deserialize, Debug)]
struct Message {
    subject: Option<String>,
    sender: Option<Sender>,
    #[serde(rename = "internetMessageHeaders")]
    headers: Option<Vec<Header>>,
}

#[derive(Deserialize, Debug)]
struct Header {
    name: String,
    value: String,
}

#[derive(Deserialize, Debug)]
struct Sender {
    #[serde(rename = "emailAddress")]
    email_address: Option<EmailAddress>,
}

#[derive(Deserialize, Debug)]
struct EmailAddress {
    name: Option<String>,
    address: Option<String>,
}

pub async fn fetch_spam_emails(access_token: &str) -> Result<Vec<SpamEmail>, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://graph.microsoft.com/v1.0/me/mailFolders/junkEmail/messages")
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .query(&[
            ("$select", "sender,subject,internetMessageHeaders"),
            ("$top", "50"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to request emails: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Graph API error: {}", res.status()));
    }

    let body = res
        .text()
        .await
        .map_err(|e| format!("Failed to read body: {}", e))?;

    // Debug print body length
    println!("Fetched {} bytes", body.len());

    let response: GraphResponse =
        serde_json::from_str(&body).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let emails = response
        .value
        .into_iter()
        .map(|msg| {
            let subject = msg.subject.unwrap_or_else(|| "(No Subject)".to_string());
            let (name, address) = if let Some(sender) = msg.sender {
                if let Some(ea) = sender.email_address {
                    (
                        ea.name.unwrap_or_else(|| "Unknown".to_string()),
                        ea.address.unwrap_or_else(|| "Unknown".to_string()),
                    )
                } else {
                    ("Unknown".to_string(), "Unknown".to_string())
                }
            } else {
                ("Unknown".to_string(), "Unknown".to_string())
            };

            let mut spf_domain = None;
            let mut dkim_domain = None;

            if let Some(headers) = msg.headers {
                for h in headers {
                    if h.name.eq_ignore_ascii_case("Authentication-Results") {
                        if spf_domain.is_none() {
                            spf_domain = domain::extract_spf_domain(&h.value);
                        }
                        if dkim_domain.is_none() {
                            dkim_domain = domain::extract_dkim_domain(&h.value);
                        }
                    }
                }
            }

            SpamEmail {
                subject,
                sender_name: name,
                sender_address: address,
                spf_domain,
                dkim_domain,
            }
        })
        .collect();

    Ok(emails)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserProfile {
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub mail: Option<String>,
    #[serde(rename = "userPrincipalName")]
    pub user_principal_name: Option<String>,
}

pub async fn fetch_user_profile(access_token: &str) -> Result<UserProfile, String> {
    let client = reqwest::Client::new();
    let res = client
        .get("https://graph.microsoft.com/v1.0/me")
        .header(AUTHORIZATION, format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Failed to fetch profile: {}", res.status()));
    }

    let profile = res.json::<UserProfile>().await.map_err(|e| e.to_string())?;
    Ok(profile)
}
