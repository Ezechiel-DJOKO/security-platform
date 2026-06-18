import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET() {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ],
    });

    const page = await browser.newPage();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comparatif Outils d'Audit Open Source</title>
        <style>
          body { 
            font-family: 'Arial', 'Helvetica', sans-serif; 
            margin: 40px; 
            line-height: 1.6; 
            color: #1f2937;
          }
          h1 { 
            color: #1e40af; 
            text-align: center; 
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 15px;
          }
          .subtitle {
            text-align: center;
            color: #64748b;
            margin-bottom: 30px;
            font-size: 1.1rem;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 25px 0; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #cbd5e1; 
            padding: 14px 12px; 
            text-align: left; 
          }
          th { 
            background-color: #1e40af; 
            color: white; 
            font-weight: 600;
          }
          tr:nth-child(even) { 
            background-color: #f8fafc; 
          }
          .good { 
            color: #22c55e; 
            font-weight: bold; 
          }
          .excellent { 
            color: #15803d; 
            font-weight: bold; 
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.9rem;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <h1>Rapport Comparatif</h1>
        <p class="subtitle">Outils d'Audit de Sécurité Open Source - 2026</p>
        
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
              <td class="excellent">Excellent</td>
              <td>Scan rapide & templates</td>
              <td class="excellent">9.5</td>
            </tr>
            <tr>
              <td><strong>Nmap</strong></td>
              <td>Discovery & Cartographie</td>
              <td>C</td>
              <td>Moyen</td>
              <td class="excellent">Excellent</td>
              <td>Reconnaissance réseau</td>
              <td class="excellent">9.4</td>
            </tr>
            <tr>
              <td><strong>Trivy</strong></td>
              <td>Conteneurs / IaC</td>
              <td>Go</td>
              <td>Très facile</td>
              <td class="excellent">Excellent</td>
              <td>CI/CD & Docker / Kubernetes</td>
              <td class="excellent">9.3</td>
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
              <td><strong>OWASP ZAP</strong></td>
              <td>Web Application</td>
              <td>Java</td>
              <td>Facile</td>
              <td>Bon</td>
              <td>Tests d'intrusion web</td>
              <td>8.8</td>
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
          </tbody>
        </table>

        <h2 style="color: #1e40af; margin-top: 40px;">Recommandation Stratégique</h2>
        <p><strong>Stack recommandée :</strong> <strong>Nmap + Nuclei + Trivy + OWASP ZAP</strong></p>
        <p>Cette combinaison offre une excellente couverture pour la majorité des besoins en audit de sécurité moderne.</p>

        <div class="footer">
          <p>Généré automatiquement par la Plateforme de Sécurité • ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
      </body>
      </html>`;

    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 50, right: 40, bottom: 50, left: 40 },
    });

    // ✅ Correction du typage ici
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="comparatif-outils-audit-${new Date().toISOString().slice(0,10)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erreur génération comparatif:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du rapport comparatif' }, 
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}