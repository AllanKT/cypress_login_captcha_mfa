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
    args: ['--disable-web-security', '--force-color-profile=srgb', '--force-device-scale-factor=2'],
    colorScheme: 'dark'
  });
  const context = await browser.newContext({
    viewport,
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
    <html style="background-color: #020618;">
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin: 0;
          background-color: #020618;
          size: A4;
        }
        html {
          background-color: #020618;
          -webkit-print-color-adjust: exact;
        }
        body {
          background-color: #020618;
          margin: 0;
          min-height: 100vh;
        }
        .metric-card { 
          background: rgba(255,255,255,0.1) !important;
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 20px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          color: white;
          font-family: Arial, sans-serif;
          min-height: 100vh;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='%23020618'/%3E%3C/svg%3E");
          background-repeat: repeat;
        }
        @page {
          margin-top: 120px;
          margin-bottom: 120px
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          color: white;
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #020618;
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
          margin: 20px auto;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
        }
        .grade-A { color: #04BE6B; background: rgba(255,255,255,0.1); }
        .grade-B { color: #FCD202; background: rgba(255,255,255,0.1); }
        .grade-C { color: #E07B16; background: rgba(255,255,255,0.1); }
        .grade-D { color: #cd3d3d; background: rgba(255,255,255,0.1); }
        .grade-E { color: #F9208B; background: rgba(255,255,255,0.1); }
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
    <body style="background: #020618;">
      <div style="padding: 40px; background: #020618; max-width: 100%; box-sizing: border-box;">
        <h2>SonarQube Analysis</h2>
        <div class="metric-card" style="margin-bottom: 20px; margin-top: 20px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            <div>
              <div style="color: #888; font-size: 14px;">Project Name</div>
              <div style="color: #fff; font-size: 16px; margin-top: 4px;">${report.projectName}</div>
            </div>
            <div>
              <div style="color: #888; font-size: 14px;">Branch</div>
              <div style="color: #fff; font-size: 16px; margin-top: 4px;"># ${report.branch}</div>
            </div>
            <div>
              <div style="color: #888; font-size: 14px;">Report date</div>
              <div style="color: #fff; font-size: 16px; margin-top: 4px;">${report.reportDate}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
            <div>
              <div style="color: #888; font-size: 14px;">Size Rating</div>
              <div style="display: inline-flex; align-items: center; justify-content: center; background: #23263a; color: #fff; font-size: 16px; margin-top: 4px; width: 24px; height: 24px; border-radius: 4px;">${report.sizeRating}</div>
            </div>
            <div>
              <div style="color: #888; font-size: 14px;">Lines of Code</div>
              <div style="color: #fff; font-size: 16px; margin-top: 4px;">${report.linesOfCode}</div>
            </div>
            <div>
              <div style="color: #888; font-size: 14px;">Quality Gate</div>
              <div style="display: inline-flex; align-items: center; justify-content: center; background: ${report.qualityGate === 'OK' ? '#04BE6B' : '#F9208B'}; color: #fff; font-size: 14px; margin-top: 4px; padding: 2px 8px; border-radius: 4px;">${report.qualityGate}</div>
            </div>
          </div>
        </div>
      <div class="metrics-grid">
        <div class="metric-card">
          <h2 style="text-align: center;">Reliability</h2>
          <p class="grade grade-${report.reliability.grade}">${report.reliability.grade}</p>
          <div style="text-align: left; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Bugs:</span>
              <span style="font-weight: bold;">${report.reliability.bugs}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>New Bugs:</span>
              <span style="font-weight: bold;">${report.reliability.newBugs}</span>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <h2 style="text-align: center;">Security</h2>
          <p class="grade grade-${report.security.grade}">${report.security.grade}</p>
          <div style="text-align: left; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Vulnerabilities:</span>
              <span style="font-weight: bold;">${report.security.vulnerabilities}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Security Hotspots:</span>
              <span style="font-weight: bold;">${report.security.securityHotspots}</span>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <h2 style="text-align: center;">Maintainability</h2>
          <p class="grade grade-${report.maintainability.grade}">${report.maintainability.grade}</p>
          <div style="text-align: left; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Code Smells:</span>
              <span style="font-weight: bold;">${report.maintainability.codeSmells}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Debt Ratio:</span>
              <span style="font-weight: bold;">${report.maintainability.debtRatio}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="metrics-grid" style="margin-top: 20px; grid-template-columns: repeat(2, 1fr);">
        <div class="metric-card">
          <h2 style="text-align: center;">Coverage</h2>
          <div style="position: relative; width: 100px; height: 100px; margin: 20px auto;">
            <svg viewBox="0 0 36 36" style="transform: rotate(-90deg); width: 100%; height: 100%;">
              <path d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                stroke-width="2"
                stroke-linecap="round"/>
              <path d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#04BE6B"
                stroke-width="2"
                stroke-linecap="round"
                stroke-dasharray="${report.coverage.percentage}, 100"/>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #04BE6B;">
              <span style="font-size: 24px; font-weight: bold;">${report.coverage.percentage}</span>
            </div>
          </div>
          <div style="text-align: left; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Unit Tests:</span>
              <span style="font-weight: bold;">${report.coverage.unitTests}</span>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <h2 style="text-align: center;">Duplications</h2>
          <div style="position: relative; width: 100px; height: 100px; margin: 20px auto;">
            <svg viewBox="0 0 36 36" style="transform: rotate(-90deg); width: 100%; height: 100%;">
              <path d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                stroke-width="2"
                stroke-linecap="round"/>
              <path d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#F9208B"
                stroke-width="2"
                stroke-linecap="round"
                stroke-dasharray="${report.duplications.percentage}, 100"/>
            </svg>
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #F9208B;">
              <span style="font-size: 24px; font-weight: bold;">${report.duplications.percentage}</span>
            </div>
          </div>
          <div style="text-align: left; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Duplicated Blocks:</span>
              <span style="font-weight: bold;">${report.duplications.duplicatedBlocks}</span>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top: 40px; break-before: page;">
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
    let severityColor = '#06C0FD';
    if (vuln.severity === 'critical') severityColor = '#F9208B';
    else if (vuln.severity === 'high') severityColor = '#E07B16';
    else if (vuln.severity === 'medium') severityColor = '#FCD202';
    else if (vuln.severity === 'low') severityColor = '#06C0FD';
    return `
      <div class="metric-card" style="margin-top: 10px; padding: 15px; border-top: 2px solid ${severityColor}; page-break-inside: avoid;">
        <h4 style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: ${severityColor}; margin-bottom: 16px;">${vuln.title}</h4>
        <div style="display: flex; flex-direction: row; gap: 32px; font-size: 12px; color: #aaa;">
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <div>
               <div style="margin-bottom: 4px; color:${severityColor};">Package:</div>
               <div>${vuln.packageName} (${vuln.packageVersions.join(', ')})</div>
             </div>  
          <p><span style='color:#aaa;'>CVEs:</span> ${vuln.cves.join(', ') || 'N/A'}</p>
            <p><span style='color:#aaa;'>Exploit Maturity:</span> <span style='color:${severityColor};'>${vuln.exploitMaturity}</span></p>
            <p><span style='color:#aaa;'>Fixed in Versions:</span> ${vuln.fixedIn.length ? vuln.fixedIn.join(', ') : 'N/A'}</p>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #aaa;">
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

  // Set background color for the entire page
  await page.evaluate(() => {
    document.body.style.background = '#020618';
    document.documentElement.style.background = '#020618';
  });

  // Set page background color
  await page.evaluate(() => {
    document.documentElement.style.background = '#020618';
    document.documentElement.style.backgroundColor = '#020618';
    document.body.style.background = '#020618';
    document.body.style.backgroundColor = '#020618';
  });

  // Generate PDF
  // Set background color
  await page.evaluate(() => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '5000');
    svg.setAttribute('style', 'position:fixed;top:0;left:0;z-index:-1');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', '#020618');
    svg.appendChild(rect);
    document.body.insertBefore(svg, document.body.firstChild);
  });

  // Configure PDF options
  const pdfOptions = {
    path: 'reports/sonar/sonarqube-report.pdf',
    format: 'A4',
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    displayHeaderFooter: true,
    headerTemplate: `
    <head>
      <meta charset="UTF-8">
      <style>
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
      </style>
    </head>
    <body>
        <div class="report-header" style="color: #aaa; width: 100%; font-size: 10px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; color: white;">
          <div style="flex: 1;">
            <div class="logo-header" style="background-color: transparent;">${LOGO_NUAGE}</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <h1 style="font-size: 24px; margin: 0;">Relatório de Segurança</h1>
          </div>
          <div style="flex: 1; text-align: right;">
             <p style="margin: 0;">Date: ${new Date()}</p>
          </div>
      </div>
    </body>
    `,
    footerTemplate: `
    <head>
      <meta charset="UTF-8">
      <style>
      .report-footer { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          padding: 0 20px 0 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
        .logo-footer {
          width: 200px;
          height: 60px;
          margin-top: 20px;
          display: flex;
          align-items: center;
        }
        .logo-footer svg {
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>
        <div class="report-footer" style="color: #aaa; width: 100%; font-size: 10px; display: flex; justify-content: space-between; align-items: center; margin-top: 40px; color: white;">
          <div style="flex: 1; text-align: center;">
            <div class="logo-footer" style="background-color: transparent;">${LOGO_AWS}</div>
          </div>
          <div style="flex: 1; text-align: right;">
              <div style="background-color: transparent;">
                <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
              </div>
          </div>
      </div>
    </body>
    `,
    printBackground: true,
    preferCSSPageSize: true
  };

  // Generate PDF with configured options
  await page.pdf({
     ...pdfOptions,
     scale: 0.8
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
  
};

// Executa a geração do relatório
generateSonarQubeReport(
  SONARQUBE_CONFIG.url,
  SONARQUBE_CONFIG.projectKey,
  SONARQUBE_CONFIG.authToken,
  SONARQUBE_CONFIG.snykProjectId
);
