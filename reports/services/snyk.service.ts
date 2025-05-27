import fetch from 'node-fetch';
import { snykConfig } from '../config/snyk.config';

interface SnykVulnerability {
    id: string;
    issueType: string;
    pkgName: string;
    pkgVersions: string[];
    issueData: {
        id: string;
        title: string;
        severity: string;
        url: string;
        identifiers: {
            CVE: string[];
            CWE: string[];
            GHSA: string[];
        };
        exploitMaturity: string;
        cvssScore: number;
        language: string;
    };
    isPatched: boolean;
    isIgnored: boolean;
    fixInfo: {
        isUpgradable: boolean;
        isPinnable: boolean;
        isPatchable: boolean;
        isFixable: boolean;
        isPartiallyFixable: boolean;
        nearestFixedInVersion: string;
        fixedIn: string[];
    };
    priorityScore: number;
    priority: {
        score: number;
    };
    links: {
        paths: string;
    };
}

interface SnykProjectIssues {
    // issues: {
    //     vulnerabilities: SnykVulnerability[];
    // };
    issues: SnykVulnerability[]
}

export interface SnykMetrics {
    sast: {
        vulnerabilities: number;
        criticalIssues: number;
        highIssues: number;
        mediumIssues: number;
        lowIssues: number;
    };
    sca: {
        vulnerabilities: number;
        criticalDependencies: number;
        highDependencies: number;
        mediumDependencies: number;
        lowDependencies: number;
        fixableIssues: number;
    };
    details: Array<{
        id: string;
        packageName: string;
        packageVersions: string[];
        title: string;
        severity: string;
        cvssScore: number;
        cves: string[];
        cwes: string[];
        url: string;
        fixable: boolean;
        fixedIn: string[];
        exploitMaturity: string;
    }>;
}

export class SnykService {
    private readonly baseUrl = 'https://api.snyk.io/v1';
    private readonly headers: Record<string, string>;

    constructor() {
        this.headers = {
            'Authorization': `token ${snykConfig.apiToken}`,
            'Content-Type': 'application/json'
        };
    }

    async getProjectIssues(projectId: string): Promise<SnykProjectIssues> {
        const response = await fetch(
            `${this.baseUrl}/org/${snykConfig.orgId}/project/${projectId}/aggregated-issues`,
            {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    filters: {
                        types: ['vuln'],
                        ignored: false
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch Snyk issues: ${response.statusText}`);
        }

        const data = await response.json() as SnykProjectIssues;
        return data;
    }

    async getSnykMetrics(projectId: string): Promise<SnykMetrics> {
        const issues = await this.getProjectIssues(projectId);
        const vulnerabilities = issues.issues || [];

        const sastVulnerabilities = vulnerabilities.filter(v => v.issueData.language !== 'npm');
        const scaVulnerabilities = vulnerabilities.filter(v => v.issueData.language === 'npm');

        return {
            sast: {
                vulnerabilities: sastVulnerabilities.length,
                criticalIssues: sastVulnerabilities.filter(v => v.issueData.severity === 'critical').length,
                highIssues: sastVulnerabilities.filter(v => v.issueData.severity === 'high').length,
                mediumIssues: sastVulnerabilities.filter(v => v.issueData.severity === 'medium').length,
                lowIssues: sastVulnerabilities.filter(v => v.issueData.severity === 'low').length
            },
            sca: {
                vulnerabilities: scaVulnerabilities.length,
                criticalDependencies: scaVulnerabilities.filter(v => v.issueData.severity === 'critical').length,
                highDependencies: scaVulnerabilities.filter(v => v.issueData.severity === 'high').length,
                mediumDependencies: scaVulnerabilities.filter(v => v.issueData.severity === 'medium').length,
                lowDependencies: scaVulnerabilities.filter(v => v.issueData.severity === 'low').length,
                fixableIssues: scaVulnerabilities.filter(v => v.fixInfo.isFixable).length
            },
            details: vulnerabilities.map(v => ({
                id: v.id,
                packageName: v.pkgName,
                packageVersions: v.pkgVersions,
                title: v.issueData.title,
                severity: v.issueData.severity,
                cvssScore: v.issueData.cvssScore,
                cves: v.issueData.identifiers.CVE,
                cwes: v.issueData.identifiers.CWE,
                url: v.issueData.url,
                fixable: v.fixInfo.isFixable,
                fixedIn: v.fixInfo.fixedIn,
                exploitMaturity: v.issueData.exploitMaturity
            }))
        };
    }
}