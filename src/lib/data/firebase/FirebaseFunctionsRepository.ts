import { app } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { IFunctionsRepository } from '../interfaces';

export class FirebaseFunctionsRepository implements IFunctionsRepository {
    private functions = getFunctions(app);

    async triggerDeploy(): Promise<void> {
        const triggerDeployCallable = httpsCallable(this.functions, 'triggerDeploy');
        await triggerDeployCallable();
    }

    async triggerBackup(): Promise<{ success: boolean; message?: string }> {
        const triggerBackupCallable = httpsCallable(this.functions, 'triggerBackup');
        const response = await triggerBackupCallable();
        return response.data as { success: boolean; message?: string };
    }
}
