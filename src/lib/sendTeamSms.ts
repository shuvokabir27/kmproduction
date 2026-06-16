// Shop-only build: SMS notifications removed (no-op stubs).
export async function sendTeamSms(_arg: string | { phone?: string; message?: string }): Promise<void> { /* no-op */ }
export async function notifyTeamOnOrder(_order: any): Promise<void> { /* no-op */ }
export default sendTeamSms;
