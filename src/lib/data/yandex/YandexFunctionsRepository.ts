import { IFunctionsRepository } from '../interfaces';

// ============================================================================
// YANDEX FUNCTIONS REPOSITORY
//
// On Yandex Cloud, deployment is triggered via git push (post-receive hook),
// and backups are managed via scripts on the VM itself.
// These are no-ops / local implementations.
// ============================================================================

export class YandexFunctionsRepository implements IFunctionsRepository {

    async triggerDeploy(): Promise<void> {
        // On Yandex, deployment is automatic via git push.
        // This is a no-op; the admin UI can show a message instead.
        console.log('[YandexFunctions] Deploy is automatic via git push. No action needed.');
    }

    async triggerBackup(): Promise<{ success: boolean; message?: string }> {
        // Backup on Yandex is done via a local script on the VM.
        // We can call it via a local API route if needed in the future.
        try {
            const res = await fetch('/api/backup', { method: 'POST' });
            if (res.ok) {
                return { success: true, message: 'Backup initiated on the server.' };
            }
            return { success: false, message: 'Backup API returned an error.' };
        } catch {
            return { success: false, message: 'Could not reach the backup endpoint.' };
        }
    }
}
