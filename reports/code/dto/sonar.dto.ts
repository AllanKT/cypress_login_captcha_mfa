import { SnykService, SnykMetrics } from '../services/snyk.service';

export interface SonarQubeProjectResponse {
    components: Array<{
        name: string;
        key: string;
    }>;
}

export interface SonarQubeQualityGateResponse {
    projectStatus: {
        status: string;
        conditions?: Array<{
        status: string;
        metricKey: string;
        actualValue: string;
        }>;
    };
}

export interface SonarQubeMetricsResponse {
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

export interface SnykSonarQubeReport {
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