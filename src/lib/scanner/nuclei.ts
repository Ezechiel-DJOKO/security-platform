import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runNucleiScan(target: string, options: { severity?: string } = {}) {
  try {
    console.log(`🚀 Lancement du scan Nuclei sur : ${target}`);

    // Commande Nuclei de base
    const command = `nuclei -u ${target} -json -silent ${options.severity ? `-severity ${options.severity}` : ''}`;

    const { stdout, stderr } = await execAsync(command, { timeout: 120000 }); // 2 minutes max

    if (stderr) {
      console.warn("Nuclei warnings:", stderr);
    }

    // Parser les résultats JSON
    const results = stdout
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    console.log(`✅ Scan Nuclei terminé : ${results.length} résultats trouvés`);

    return {
      success: true,
      results,
      rawOutput: stdout,
      command
    };

  } catch (error: any) {
    console.error("❌ Erreur Nuclei:", error.message);
    return {
      success: false,
      error: error.message,
      results: []
    };
  }
}
