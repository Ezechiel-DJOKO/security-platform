import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

/**
 * 1. Fonction requise par scan-actions.ts (Ligne 38)
 * Lance un scan global en arrière-plan
 */
export async function triggerScanBackground(target: string): Promise<void> {
  const scriptPath = 'python-scanner/scan.py'
  
  // Exécution asynchrone en tâche de fond (détachée)
  exec(`python3 ${scriptPath} ${target}`, (error, stdout, stderr) => {
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
export async function triggerNucleiScan(target: string): Promise<any> {
  try {
    // Si vous avez un script spécifique pour nuclei, changez le chemin ici
    const scriptPath = 'python-scanner/scan.py' 
    const { stdout } = await execPromise(`python3 ${scriptPath} ${target} --scanner nuclei`)
    
    return JSON.parse(stdout)
  } catch (error: any) {
    console.error(`[Nuclei Scan] Erreur sur ${target}:`, error.message)
    return { error: error.message, vulnerabilities: [] }
  }
}
