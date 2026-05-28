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
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}
