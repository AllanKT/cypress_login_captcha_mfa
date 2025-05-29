import { SnykSonarQubeReport } from '../dto/sonar.dto';

export function sonar(report: SnykSonarQubeReport) {
    return `
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
    `
}