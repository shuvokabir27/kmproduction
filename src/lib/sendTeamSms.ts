// Shop-only build: SMS notifications removed.
export async function sendTeamSms(_msg: string): Promise<void> { /* no-op */ }
export async function notifyTeamOnOrder(_order: any): Promise<void> { /* no-op */ }
export default sendTeamSms;
