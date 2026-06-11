import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET() {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comparatif Outils d'Audit Open Source</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #1e40af; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 25px 0; }
          th, td { border: 1px solid #666; padding: 12px; text-align: left; }
          th { background-color: #1e40af; color: white; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .good { color: #22c55e; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Rapport Comparatif - Outils d'Audit de Sécurité Open Source</h1>
        <p style="text-align: center;">Généré le ${new Date().toLocaleDateString('fr-FR')}</p>

        <table>
          <thead>
            <tr>
              <th>Outil</th>
              <th>Type</th>
              <th>Langage</th>
              <th>Facilité d'utilisation</th>
              <th>Performances</th>
              <th>Meilleur pour</th>
              <th>Note /10</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Nuclei</strong></td>
              <td>Scan vulnérabilités</td>
              <td>Go</td>
              <td>Très facile</td>
              <td class="good">Excellent</td>
              <td>Scan rapide & templates</td>
              <td class="good">9.5</td>
            </tr>
            <tr>
              <td><strong>OpenVAS</strong></td>
              <td>Scanner complet</td>
              <td>C</td>
              <td>Moyen</td>
              <td>Très bon</td>
              <td>Audit réseau complet</td>
              <td>8.7</td>
            </tr>
            <tr>
              <td><strong>Trivy</strong></td>
              <td>Conteneurs / IaC</td>
              <td>Go</td>
              <td>Très facile</td>
              <td class="good">Excellent</td>
              <td>CI/CD & Docker</td>
              <td class="good">9.3</td>
            </tr>
            <tr>
              <td><strong>OWASP ZAP</strong></td>
              <td>Web App</td>
              <td>Java</td>
              <td>Facile</td>
              <td>Bon</td>
              <td>Tests d'intrusion web</td>
              <td>8.8</td>
            </tr>
            <tr>
              <td><strong>Metasploit</strong></td>
              <td>Exploitation</td>
              <td>Ruby</td>
              <td>Complexe</td>
              <td>Excellent</td>
              <td>Pentest avancé</td>
              <td>9.0</td>
            </tr>
            <tr>
              <td><strong>Nmap</strong></td>
              <td>Discovery</td>
              <td>C</td>
              <td>Moyen</td>
              <td class="good">Excellent</td>
              <td>Reconnaissance réseau</td>
              <td class="good">9.4</td>
            </tr>
          </tbody>
        </table>

        <h2>Recommandation Stratégique</h2>
        <p><strong>Stack recommandée :</strong> Nmap + Nuclei + Trivy + ZAP</p>
        <p>Cette combinaison couvre la majorité des besoins en audit de sécurité moderne.</p>
      </body>
      </html>`;

    await page.setContent(html);
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 40, right: 40, bottom: 40, left: 40 },
    });

    await browser.close();

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comparatif-outils-audit-${new Date().toISOString().slice(0,10)}.pdf"`,
      },
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur génération comparatif' }, { status: 500 });
  }
}