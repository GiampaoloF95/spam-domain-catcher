// function extract_domain removed as it is unused.

pub fn extract_spf_domain(header: &str) -> Option<String> {
    // Look for smtp.mailfrom=VALUE
    extract_key_value(header, "smtp.mailfrom=").or_else(|| extract_key_value(header, "smtp.helo="))
}

pub fn extract_dkim_domain(header: &str) -> Option<String> {
    // Look for header.d=VALUE
    extract_key_value(header, "header.d=")
}

fn extract_key_value(text: &str, key: &str) -> Option<String> {
    if let Some(start) = text.find(key) {
        let rest = &text[start + key.len()..];
        // Value ends at ';' or end of string.
        // Also sometimes values are quoted, but usually domains in Auth-Results are not.
        let end = rest.find(';').unwrap_or(rest.len());
        let val = &rest[..end].trim();
        if !val.is_empty() {
            return Some(val.to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_spf() {
        let header = "spf=pass (sender IP is 66.103.218.102) smtp.mailfrom=manage.staging.evertonfc.com; dkim=pass";
        assert_eq!(
            extract_spf_domain(header),
            Some("manage.staging.evertonfc.com".to_string())
        );
    }

    #[test]
    fn test_extract_dkim() {
        let header = "dkim=pass (signature was verified) header.d=mindestumfang.precisionwoodworksnj.com;dmarc=pass";
        assert_eq!(
            extract_dkim_domain(header),
            Some("mindestumfang.precisionwoodworksnj.com".to_string())
        );
    }

    #[test]
    fn test_extract_none() {
        let header = "spf=neutral (google.com: 1.2.3.4 is neither permitted nor denied by best guess record for domain of user@example.com) smtp.mailfrom=user@example.com";
        // This simple parser looks for specific keys, let's verify it works for typical MS header format
        // The parser expects 'smtp.mailfrom=VALUE;' or to end of string.
        assert_eq!(
            extract_spf_domain(header),
            Some("user@example.com".to_string())
        );
        assert_eq!(extract_dkim_domain(header), None);
    }

    #[test]
    fn test_extract_helo_fallback() {
        let header = "spf=fail (sender IP is 9.141.15.171) smtp.helo=inuslsx.linksredirection.org; dkim=none";
        assert_eq!(
            extract_spf_domain(header),
            Some("inuslsx.linksredirection.org".to_string())
        );
    }
}
