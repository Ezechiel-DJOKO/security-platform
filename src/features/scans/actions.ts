'use server';

import { scanService } from './service';
import { ScanInput } from './types';
import { revalidatePath } from 'next/cache';

export async function lancerScanAction(input: ScanInput) {
  try {
    const scan = await scanService.lancerScan(input);
    
    revalidatePath('/(dashboard)/scans');
    revalidatePath('/(dashboard)/actifs');
    
    return { success: true, scan };
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erreur lors du lancement du scan';
    return { success: false, error: message };
  }
}