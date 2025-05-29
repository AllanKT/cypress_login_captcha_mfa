import { SnykSonarQubeReport } from '../dto/sonar.dto';

export function snyk(report: SnykSonarQubeReport) {
    return `
    <div style="margin-top: 40px; break-before: page;">
        <h2>Snyk Security Analysis</h2>
        <div class="metric-card" style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;">
          <h3>SAST Analysis</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Total Vulnerabilities:</span>
              <span style="font-weight: bold; color: #fff;">${report.snyk?.sast.vulnerabilities}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Critical Issues:</span>
              <span style="font-weight: bold; color: #e6007a;">${report.snyk?.sast.criticalIssues}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>High Issues:</span>
              <span style="font-weight: bold; color: #ffb800;">${report.snyk?.sast.highIssues}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Medium Issues:</span>
              <span style="font-weight: bold; color: #ffe066;">${report.snyk?.sast.mediumIssues}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; background: #23263a; border-radius: 6px; padding: 8px 14px;">
              <span>Low Issues:</span>
              <span style="font-weight: bold; color: #00e676;">${report.snyk?.sast.lowIssues}</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px;">
            <h3>Detailed Vulnerability Analysis</h3>
            ${report.snyk?.details.map(vuln => {
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
    `
}