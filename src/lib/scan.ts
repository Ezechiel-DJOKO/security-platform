import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

// Type pour le résultat du scan
interface ScanResult {
  error?: string;
  vulnerabilities: unknown[];
  [key: string]: unknown;
}

/**
 * 1. Fonction requise par scan-actions.ts (Ligne 38)
 * Lance un scan global en arrière-plan
 */
export async function triggerScanBackground(target: string): Promise<void> {
  const scriptPath = 'python-scanner/scan.py'
  
  // Exécution asynchrone en tâche de fond (détachée)
  exec(`python3 ${scriptPath} ${target}`, (error) => {
    if (error) {
      console.error(`[Scan Background] Erreur sur ${target}:`, error.message)
      return
    }
    console.log(`[Scan Background] Réussi pour ${target}`)
  })
}

/**
 * 2. Fonction requise par route.ts (Ligne 45)
 * Lance spécifiquement le scanner Nuclei
 */
export async function triggerNucleiScan(target: string): Promise<ScanResult> {
  try {
    const scriptPath = 'python-scanner/scan.py' 
    const { stdout } = await execPromise(`python3 ${scriptPath} ${target} --scanner nuclei`)
    
    return JSON.parse(stdout) as ScanResult
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error(`[Nuclei Scan] Erreur sur ${target}:`, err.message)
    return { error: err.message, vulnerabilities: [] }
  }
}