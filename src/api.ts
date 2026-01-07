import { invoke } from "@tauri-apps/api/core";

export interface SpamEmail {
    subject: string;
    sender_name: string;
    sender_address: string;
    spf_domain?: string;
    dkim_domain?: string;
    received_date?: string;
}

export async function login(clientId: string): Promise<string> {
    return await invoke("login", { clientId });
}

export interface UserProfile {
    display_name: string;
    mail?: string;
    user_principal_name?: string;
}

export function getSpamDomains(token: string, limit?: number): Promise<SpamEmail[]> {
    return invoke('get_spam_domains', { token, limit });
}

export function getUserInfo(token: string): Promise<UserProfile> {
    return invoke('get_user_info', { token });
}
