import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Types pour les résultats Nuclei
interface NucleiResult {
  template: string;
  host: string;
  severity: string;
  info: Record<string, unknown>;
  [key: string]: unknown;
}

interface ScanOutput {
  success: boolean;
  results: NucleiResult[];
  rawOutput?: string;
  command?: string;
  error?: string;
}

export async function runNucleiScan(
  target: string,
  options: { severity?: string } = {}
): Promise<ScanOutput> {
  try {
    console.log(`🚀 Lancement du scan Nuclei sur : ${target}`);

    const command = `nuclei -u ${target} -json -silent ${options.severity ? `-severity ${options.severity}` : ''}`;

    const { stdout, stderr } = await execAsync(command, { timeout: 120000 });

    if (stderr) {
      console.warn("Nuclei warnings:", stderr);
    }

    const results = stdout
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        try {
          return JSON.parse(line) as NucleiResult;
        } catch {
          return null;
        }
      })
      .filter((item): item is NucleiResult => item !== null);

    console.log(`✅ Scan Nuclei terminé : ${results.length} résultats trouvés`);

    return {
      success: true,
      results,
      rawOutput: stdout,
      command
    };

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Erreur Nuclei:", err.message);
    return {
      success: false,
      error: err.message,
      results: []
    };
  }
}