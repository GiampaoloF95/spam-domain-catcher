use oauth2::basic::BasicClient;
use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, CsrfToken, PkceCodeChallenge, RedirectUrl, Scope,
    TokenUrl,
};
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use tauri::{Emitter, Manager, Window};
use url::Url;

pub async fn perform_login(window: Window, client_id: String) -> Result<String, String> {
    let client = BasicClient::new(
        ClientId::new(client_id.clone()),
        None,
        AuthUrl::new("https://login.microsoftonline.com/common/oauth2/v2.0/authorize".to_string())
            .map_err(|e| e.to_string())?,
        Some(
            TokenUrl::new("https://login.microsoftonline.com/common/oauth2/v2.0/token".to_string())
                .map_err(|e| e.to_string())?,
        ),
    )
    .set_redirect_uri(
        // Microsoft Native Apps allow http://localhost:<port>
        // We remove /callback to comply with strict matching if paths aren't registered.
        RedirectUrl::new("http://localhost:15678".to_string()).map_err(|e| e.to_string())?,
    );

    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let (auth_url, _csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new(
            "https://graph.microsoft.com/Mail.Read".to_string(),
        ))
        .add_scope(Scope::new(
            "https://graph.microsoft.com/User.Read".to_string(),
        ))
        .set_pkce_challenge(pkce_challenge)
        .url();

    println!("Opening login window for: {}", auth_url);

    // Create a new Webview Window for the login
    let login_window = tauri::WebviewWindowBuilder::new(
        &window,
        "login_auth",
        tauri::WebviewUrl::External(auth_url.clone()),
    )
    .title("Sign In - Microsoft")
    .inner_size(600.0, 700.0)
    .resizable(true)
    .build();

    if let Err(e) = login_window {
        println!("Failed to create login window: {}", e);
        // Fallback to notifying frontend if window creation fails
        let _ = window.emit("oauth-url", auth_url.to_string());
    }

    // Start local server to listen for the code
    let listener = TcpListener::bind("127.0.0.1:15678").map_err(|e| e.to_string())?;

    // Accept one connection
    let (mut stream, _) = listener.accept().map_err(|e| e.to_string())?;

    let mut reader = BufReader::new(&stream);
    let mut request_line = String::new();
    reader
        .read_line(&mut request_line)
        .map_err(|e| e.to_string())?;

    // Request line is like "GET /?code=... HTTP/1.1"
    let redirect_path = request_line
        .split_whitespace()
        .nth(1)
        .ok_or("Invalid request")?;

    // Construct full URL to parse the query parameters
    let url = Url::parse(&format!("http://localhost:15678{}", redirect_path))
        .map_err(|e| e.to_string())?;

    let code_pair = url
        .query_pairs()
        .find(|(key, _)| key == "code")
        .ok_or("No code found in redirect")?;

    let code = AuthorizationCode::new(code_pair.1.into_owned());

    // Exchange the code with a POST request to the Token URL
    // We use manual reqwest here to have better control over parameters (public client)
    // and to inspect the error body if it fails.
    let client_http = reqwest::Client::new();
    let params = [
        ("client_id", client_id.as_str()),
        // ("scope", "https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read"), // Optional in v2 code flow
        ("code", code.secret()),
        ("redirect_uri", "http://localhost:15678"),
        ("grant_type", "authorization_code"),
        ("code_verifier", pkce_verifier.secret()),
    ];

    let res = client_http
        .post("https://login.microsoftonline.com/common/oauth2/v2.0/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("Token request network failed: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_else(|_| "No body".to_string());
        println!("Token exchange error body: {}", body);
        return Err(format!(
            "Token exchange failed ({}) - check terminal for details",
            status
        ));
    }

    let body_text = res
        .text()
        .await
        .map_err(|e| format!("Failed to read token body: {}", e))?;

    // Parse JSON
    let json: serde_json::Value = serde_json::from_str(&body_text)
        .map_err(|e| format!("Failed to parse token JSON: {}", e))?;

    let access_token = json["access_token"]
        .as_str()
        .ok_or("No access_token in response")?
        .to_string();

    let message = "Login successful! You can close this window.";
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Length: {}\r\n\r\n{}",
        message.len(),
        message
    );
    stream
        .write_all(response.as_bytes())
        .map_err(|e| e.to_string())?;

    // Close the login window
    if let Some(login_win) = window.get_webview_window("login_auth") {
        let _ = login_win.close();
    }

    Ok(access_token)
}
