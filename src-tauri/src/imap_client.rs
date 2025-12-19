use futures::stream::StreamExt;
use tokio::net::TcpStream;

async fn connect_imap(
    server: &str,
    port: u16,
) -> std::result::Result<async_imap::Client<async_native_tls::TlsStream<TcpStream>>, String> {
    let tcp = TcpStream::connect((server, port))
        .await
        .map_err(|e| format!("TCP Connection failed to {}:{}: {}", server, port, e))?;

    let tls = async_native_tls::TlsConnector::new();
    let tls_stream = tls
        .connect(server, tcp)
        .await
        .map_err(|e| format!("TLS handshake failed: {}", e))?;

    let mut client = async_imap::Client::new(tls_stream);

    // Crucial: Consume the initial greeting from the server
    client
        .read_response()
        .await
        .ok_or_else(|| "Server closed connection unexpectedly".to_string())?
        .map_err(|e| format!("Failed to read greeting: {}", e))?;

    // DEBUG: Check capabilities to see if LOGIN is allowed
    let caps = client
        .capabilities()
        .await
        .map_err(|e| format!("Failed to fetch capabilities: {}", e))?;

    println!("DEBUG: Server Capabilities: {:?}", caps);

    // Check for LOGINDISABLED
    if caps.has_str("LOGINDISABLED") {
        return Err(
            "Server specifically disables LOGIN (Basic Auth). This account likely requires OAuth2."
                .to_string(),
        );
    }

    Ok(client)
}

pub async fn check_login(
    email: &str,
    password: &str,
    server: &str,
    port: u16,
) -> std::result::Result<String, String> {
    let client = connect_imap(server, port).await?;

    // We must read the greeting first, Client::new doesn't do it automatically?
    // Actually Client::new just wraps the stream. We need to perform login.
    // Wait, async-imap Client::new takes a stream and assumes it's connected?
    // Usually one calls `client.read_response()` or similar?
    // `async_imap::Client::new` wraps the stream.
    // Then we call `login`.

    // NOTE: `async-imap` Client expects to perform the initial handshake (reading greeting) implicitly or explicit?
    // The `async_imap::connect` helper usually reads the greeting.
    // If we use `Client::new`, we might need to verify the state.
    // However, `login` should handle it.

    // Let's try direct login.
    println!("DEBUG: Attempting IMAP login for user: '{}'", email);
    let mut session = client
        .login(email, password)
        .await
        .map_err(|(e, _)| format!("Login failed: {}", e))?;

    session.logout().await.ok();

    Ok("Login successful".to_string())
}

pub async fn fetch_spam_emails(
    email: &str,
    password: &str,
    server: &str,
    port: u16,
) -> std::result::Result<Vec<String>, String> {
    let client = connect_imap(server, port).await?;

    let mut session = client
        .login(email, password)
        .await
        .map_err(|(e, _)| format!("Login failed: {}", e))?;

    // Select Junk folder
    let folder_name = "Junk";
    if let Err(_) = session.select(folder_name).await {
        session
            .select("Junk Email")
            .await
            .map_err(|e| format!("Could not open Junk folder: {}", e))?;
    }

    let mut senders = Vec::new();
    {
        let mut messages_stream = session
            .fetch("1:*", "ENVELOPE")
            .await
            .map_err(|e| format!("Fetch failed: {}", e))?;

        while let Some(msg) = messages_stream.next().await {
            if let Ok(msg) = msg {
                if let Some(envelope) = msg.envelope() {
                    if let Some(from) = &envelope.from {
                        if let Some(addr) = from.first() {
                            let updated_sender = format!(
                                "{}@{}",
                                String::from_utf8_lossy(addr.mailbox.as_deref().unwrap_or(b"")),
                                String::from_utf8_lossy(addr.host.as_deref().unwrap_or(b""))
                            );
                            senders.push(updated_sender);
                        }
                    }
                }
            }
        }
    }
    session.logout().await.ok();

    Ok(senders)
}
