const { chromium } = require('playwright');
import * as fs from 'fs';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';
import { SnykService, SnykMetrics } from '../services/snyk.service';

interface SonarQubeProjectResponse {
  components: Array<{
    name: string;
    key: string;
  }>;
}

interface SonarQubeQualityGateResponse {
  projectStatus: {
    status: string;
    conditions?: Array<{
      status: string;
      metricKey: string;
      actualValue: string;
    }>;
  };
}

interface SonarQubeMetricsResponse {
  component: {
    key: string;
    name: string;
    measures: Array<{
      metric: string;
      value: string;
      bestValue?: boolean;
    }>;
  };
}

interface SonarQubeReport {
  projectName: string;
  branch: string;
  reportDate: string;
  sizeRating: string;
  linesOfCode: number;
  qualityGate: string;
  reliability: {
    grade: string;
    bugs: number;
    newBugs: number;
  };
  security: {
    grade: string;
    vulnerabilities: number;
    securityHotspots: number;
    newVulnerabilities: number;
    newSecurityHotspots: number;
  };
  maintainability: {
    grade: string;
    codeSmells: number;
    debtRatio: string;
    newCodeSmells: number;
    debtRatioOnNewCode: string;
  };
  coverage: {
    percentage: string;
    unitTests: number;
    newCoverage: number;
  };
  duplications: {
    percentage: string;
    duplicatedBlocks: number;
    newDuplications: number;
  };
  snyk?: SnykMetrics;
}

// Logo paths
const LOGO_NUAGE_PATH = 'E:\\nuage\\allan\\cypress_login_captcha_mfa\\reports\\assets\\logo-inverse-127x23-nuageit.png';
const LOGO_AWS_PATH = 'E:\\nuage\\allan\\cypress_login_captcha_mfa\\reports\\assets\\awsconsultingpartner2-1.png';

// Read and convert logos to base64
const LOGO_NUAGE = `<img src="data:image/png;base64,${fs.readFileSync(LOGO_NUAGE_PATH).toString('base64')}" width="127" height="45" />`;
const LOGO_AWS = `<img src="data:image/png;base64,${fs.readFileSync(LOGO_AWS_PATH).toString('base64')}" width="200" height="60" />`;

async function generateSonarQubeReport(sonarQubeUrl: string, projectKey: string, authToken: string, snykProjectId: string): Promise<void> {
  // Configurar viewport e background color
  const viewport = {width: 1024, height: 1440}; // A4 size at 96 DPI

  const browser = await chromium.launch({
    args: ['--disable-web-security', '--force-color-profile=srgb', '--force-device-scale-factor=2']
  });
  const context = await browser.newContext({
    viewport,
    colorScheme: 'dark',
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  try {
    // Buscar dados do projeto e quality gate
    const [projectResponse, qualityGateResponse] = await Promise.all([
      fetch(`${sonarQubeUrl}/api/projects/search?projects=${projectKey}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }),
      fetch(`${sonarQubeUrl}/api/qualitygates/project_status?projectKey=${projectKey}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
    ]);

    if (!projectResponse.ok || !qualityGateResponse.ok) {
      throw new Error('Failed to fetch project or quality gate data');
    }

    const projectData = await projectResponse.json() as SonarQubeProjectResponse;
    const qualityGateData = await qualityGateResponse.json() as SonarQubeQualityGateResponse;

    if (!projectData.components || !projectData.components.length) {
      throw new Error('Project not found');
    }

    // Buscar métricas
    const metricsResponse = await fetch(`${sonarQubeUrl}/api/measures/component?component=${projectKey}&metricKeys=ncloc,bugs,vulnerabilities,security_hotspots,code_smells,coverage,duplicated_blocks,sqale_debt_ratio,reliability_rating,security_rating,sqale_rating`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!metricsResponse.ok) {
      throw new Error('Failed to fetch metrics data');
    }

    const metricsData = await metricsResponse.json() as SonarQubeMetricsResponse;

    if (!metricsData.component || !metricsData.component.measures) {
      throw new Error('Invalid metrics data received');
    }

  // Função auxiliar para encontrar valor da métrica
  const getMetricValue = (metrics: any[], key: string) => {
    const metric = metrics.find(m => m.metric === key);
    return metric ? metric.value : '0';
  };

  const measures = metricsData.component.measures;
  
  // Converter ratings (1=A, 2=B, 3=C, 4=D, 5=E)
  const ratingToGrade = (rating: string) => String.fromCharCode(64 + parseInt(rating));

  // Process data and create report object
  const report: SonarQubeReport = {
    projectName: projectData.components[0].name,
    branch: 'master', // Você pode adicionar uma chamada específica para obter o branch atual
    reportDate: new Date().toISOString().split('T')[0],
    sizeRating: 'M', // Pode ser calculado com base no ncloc
    linesOfCode: parseInt(getMetricValue(measures, 'ncloc')),
    qualityGate: qualityGateData.projectStatus.status,
    reliability: {
      grade: ratingToGrade(getMetricValue(measures, 'reliability_rating')),
      bugs: parseInt(getMetricValue(measures, 'bugs')),
      newBugs: 0 // Requer análise de novo código
    },
    security: {
      grade: ratingToGrade(getMetricValue(measures, 'security_rating')),
      vulnerabilities: parseInt(getMetricValue(measures, 'vulnerabilities')),
      securityHotspots: parseInt(getMetricValue(measures, 'security_hotspots')),
      newVulnerabilities: 0,
      newSecurityHotspots: 0
    },
    maintainability: {
      grade: ratingToGrade(getMetricValue(measures, 'sqale_rating')),
      codeSmells: parseInt(getMetricValue(measures, 'code_smells')),
      debtRatio: getMetricValue(measures, 'sqale_debt_ratio') + '%',
      newCodeSmells: 0,
      debtRatioOnNewCode: '0%'
    },
    coverage: {
      percentage: getMetricValue(measures, 'coverage') + '%',
      unitTests: 0, // Requer métrica específica para testes unitários
      newCoverage: 0
    },
    duplications: {
      percentage: getMetricValue(measures, 'duplicated_blocks') + '%',
      duplicatedBlocks: parseInt(getMetricValue(measures, 'duplicated_blocks')),
      newDuplications: 0
    }
  };

  // Buscar dados do Snyk
  const snykService = new SnykService();
  const snykMetrics = await snykService.getSnykMetrics(snykProjectId);

  // Atualizar o objeto report com os dados do Snyk
  report.snyk = snykMetrics;

  // Generate HTML template
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin-top: 100px;
          margin-bottom: 100px
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          backgroud-color: #000;
          backgroud: #000;
        }
        .background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #020618;
          z-index: -1;
        }
        body {
          color: white;
          font-family: Arial, sans-serif;
          padding: 40px;
          position: relative;
          min-height: 100vh;
        }
        .report-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .logo-header {
          width: 127px;
          height: 23px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
        }
        .logo-header svg {
          width: 100%;
          height: 100%;
        }
        .logo-aws {
          width: 200px;
          height: 60px;
          margin: 0 auto;
        }
        .logo-aws svg {
          width: 100%;
          height: 100%;
        }
        .metrics-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 20px; 
          margin-top: 20px;
        }
        .metric-card { 
          border: 1px solid rgba(255,255,255,0.1); 
          padding: 20px; 
          border-radius: 8px;
          background-color: rgba(255,255,255,0.1);
        }
        .grade { 
          font-size: 32px; 
          font-weight: bold;
          margin: 10px 0;
        }
        .grade-E { color: #ff4444; }
        .grade-A { color: #00ff00; }
        .footer {
          margin-top: 40px;
          text-align: center;
          padding: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .footer img {
          width: 200px;
          height: auto;
        }
      </style>
    </head>
    <body>
      <div class="background"></div>
      <div class="report-header">
        <div class="logo-header" style="background-color: transparent;">${LOGO_NUAGE}</div>
        <div>
          <h1>${report.projectName}</h1>
          <p>Branch: ${report.branch}</p>
          <p>Report Date: ${report.reportDate}</p>
        </div>
        <div>
          <p>Size Rating: ${report.sizeRating}</p>
          <p>Lines of Code: ${report.linesOfCode}</p>
          <p>Quality Gate: ${report.qualityGate}</p>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <h2>Reliability</h2>
          <p class="grade grade-${report.reliability.grade}">${report.reliability.grade}</p>
          <p>Bugs: ${report.reliability.bugs}</p>
          <p>New Bugs: ${report.reliability.newBugs}</p>
        </div>

        <div class="metric-card">
          <h2>Security</h2>
          <p class="grade grade-${report.security.grade}">${report.security.grade}</p>
          <p>Vulnerabilities: ${report.security.vulnerabilities}</p>
          <p>Security Hotspots: ${report.security.securityHotspots}</p>
        </div>

        <div class="metric-card">
          <h2>Maintainability</h2>
          <p class="grade grade-${report.maintainability.grade}">${report.maintainability.grade}</p>
          <p>Code Smells: ${report.maintainability.codeSmells}</p>
          <p>Debt Ratio: ${report.maintainability.debtRatio}</p>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <h2>Coverage</h2>
        <p>Coverage: ${report.coverage.percentage}</p>
        <p>Unit Tests: ${report.coverage.unitTests}</p>
      </div>

      <div style="margin-top: 20px;">
        <h2>Duplications</h2>
        <p>Duplications: ${report.duplications.percentage}</p>
        <p>Duplicated Blocks: ${report.duplications.duplicatedBlocks}</p>
      </div>

      <div style="margin-top: 40px;">
        <h2>Snyk Security Analysis</h2>
        <div class="metric-card" style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
          <h3>SAST Analysis</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Total Vulnerabilities:</span>
              <span style="font-weight: bold; color: #fff;">${report.snyk.sast.vulnerabilities}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Critical Issues:</span>
              <span style="font-weight: bold; color: #e6007a;">${report.snyk.sast.criticalIssues}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>High Issues:</span>
              <span style="font-weight: bold; color: #ffb800;">${report.snyk.sast.highIssues}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Medium Issues:</span>
              <span style="font-weight: bold; color: #ffe066;">${report.snyk.sast.mediumIssues}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Low Issues:</span>
              <span style="font-weight: bold; color: #00e676;">${report.snyk.sast.lowIssues}</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px;">
  <h3>Detailed Vulnerability Analysis</h3>
  ${report.snyk.details.map(vuln => {
    let severityColor = '#ffe066';
    if (vuln.severity === 'critical') severityColor = '#e6007a';
    else if (vuln.severity === 'high') severityColor = '#ffb800';
    else if (vuln.severity === 'medium') severityColor = '#ffe066';
    else if (vuln.severity === 'low') severityColor = '#00e676';
    return `
      <div class="metric-card" style="margin-top: 10px; padding: 15px; border-top: 2px solid ${severityColor};">
        <h4 style="color: ${severityColor}; margin-bottom: 16px;">${vuln.title}</h4>
        <div style="display: flex; flex-direction: row; gap: 32px;">
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <p><span style='color:#aaa;'>Package:</span> <span style='color:${severityColor};'>${vuln.packageName} (${vuln.packageVersions.join(', ')})</span></p>
            <p><span style='color:#aaa;'>CVEs:</span> ${vuln.cves.join(', ') || 'N/A'}</p>
            <p><span style='color:#aaa;'>Exploit Maturity:</span> <span style='color:${severityColor};'>${vuln.exploitMaturity}</span></p>
            <p><span style='color:#aaa;'>Fixed in Versions:</span> ${vuln.fixedIn.length ? vuln.fixedIn.join(', ') : 'N/A'}</p>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <p><span style='color:#aaa;'>Severity:</span> <span style='color:${severityColor}; font-weight:bold;'>${vuln.severity} (CVSS: ${vuln.cvssScore})</span></p>
            <p><span style='color:#aaa;'>CWEs:</span> ${vuln.cwes.map(cwe => `CWE-${cwe}`).join(', ') || 'N/A'}</p>
            <p><span style='color:#aaa;'>Fix Status:</span> <span style='color:${severityColor};'>${vuln.fixable ? 'Fixable' : 'Not Fixable'}</span></p>
            <p><span style='color:#aaa;'>More Info:</span> <a href="${vuln.url}" style="color: #4A9EFF;">View on Snyk</a></p>
          </div>
        </div>
      </div>
    `;
  }).join('')}
</div>
      </div>
    </body>
    </html>
  `);

  // Ensure background graphics are included
  await page.emulateMedia({ media: 'screen' });

  // Wait for any fonts to load
  await page.waitForLoadState('networkidle');

  // Ensure the page is fully rendered and background is applied
  await page.evaluate(() => {
    const background = document.querySelector('.background');
    if (background && background instanceof HTMLElement) {
      background.style.height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      ) + 'px';
    }
  });

  // Generate PDF
  await page.pdf({
    path: 'reports/sonar/sonarqube-report.pdf',
    format: 'A4',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width: 100%; font-size: 10px; color: #aaa; padding: 8px 24px; display: flex; justify-content: flex-end; align-items: center; border-bottom: 1px solid #333; background: #020618;">
        <span style="margin-left: auto;">Advanced</span>
      </div>
    `,
    footerTemplate: `
      <div style="width: 100%; font-size: 10px; color: #aaa; padding: 8px 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #333; background: #020618;">
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
        <span style="margin-left: auto;">Cabeçalho Fixo - Documento PDF</span>
      </div>
    `,
    printBackground: true,
    scale: 0.8,
    preferCSSPageSize: true
  });

    await browser.close();
  } catch (error) {
    console.error('Error generating SonarQube report:', error);
    await browser.close();
    throw error;
  }
}

// Configurações do servidor SonarQube
const SONARQUBE_CONFIG = {
  url: 'https://sonarqube.devops.aws.cleartech.com.br',
  projectKey: 'resolveja-core-api-gateway-spc',
  authToken: 'squ_8f7cf7b2af28ed4fecbfe0e9e620085fcff41b90',
  snykProjectId: '91c84db4-4c64-4544-95f2-871c85bdd3cc'
};

// Executa a geração do relatório
generateSonarQubeReport(
  SONARQUBE_CONFIG.url,
  SONARQUBE_CONFIG.projectKey,
  SONARQUBE_CONFIG.authToken,
  SONARQUBE_CONFIG.snykProjectId
);
