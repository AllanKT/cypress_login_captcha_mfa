import fetch from 'node-fetch';
import { sonarConfig } from '../config/services.config';
import {
    SonarQubeProjectResponse,
    SonarQubeQualityGateResponse,
    SonarQubeMetricsResponse,
    SnykSonarQubeReport
} from '../dto/sonar.dto';

export class SonarService {
    private readonly baseUrl = sonarConfig.baseurl;
    private readonly headers: Record<string, string>;

    constructor() {
        this.headers = {
            'Authorization': `Bearer ${sonarConfig.authToken}`,
            'Content-Type': 'application/json'
        };
    }

    async getProjects(projectKey: string): Promise<SonarQubeProjectResponse> {
        const projectResponse = await fetch(`${this.baseUrl}/api/projects/search?projects=${projectKey}`, {
            headers: this.headers,
        })

        if (!projectResponse.ok) {
            throw new Error('Failed to fetch project or quality gate data');
        }

        return await projectResponse.json() as SonarQubeProjectResponse;
    }

    async getQualityGates(projectKey: string): Promise<SonarQubeQualityGateResponse> {
        const qualityGateResponse = await fetch(`${this.baseUrl}/api/qualitygates/project_status?projectKey=${projectKey}`, {
            headers: this.headers,
        })

        if (!qualityGateResponse.ok) {
            throw new Error('Failed to fetch project or quality gate data');
        }

        return await qualityGateResponse.json() as SonarQubeQualityGateResponse;
    }

    async getMetrics(projectKey: string): Promise<SonarQubeMetricsResponse> {
        const metricsResponse = await fetch(`${this.baseUrl}/api/measures/component?component=${projectKey}&metricKeys=ncloc,bugs,vulnerabilities,security_hotspots,code_smells,coverage,duplicated_blocks,sqale_debt_ratio,reliability_rating,security_rating,sqale_rating`, {
            headers: this.headers,
        })

        if (!metricsResponse.ok) {
            throw new Error('Failed to fetch project or quality gate data');
        }

        const metricsData = await metricsResponse.json() as SonarQubeMetricsResponse;

        if (!metricsData.component || !metricsData.component.measures) {
            throw new Error('Invalid metrics data received');
        }

        return metricsData;
    }

    async getSonarReport(projectKey: string): Promise<SnykSonarQubeReport> {
        const projects = await this.getProjects(projectKey);
        const qualityGates = await this.getQualityGates(projectKey);
        const metrics = await this.getMetrics(projectKey);

        const measures = metrics.component.measures;

        // Função auxiliar para encontrar valor da métrica
        const getMetricValue = (metrics: any[], key: string) => {
            const metric = metrics.find(m => m.metric === key);
            return metric ? metric.value : '0';
        };

        // Converter ratings (1=A, 2=B, 3=C, 4=D, 5=E)
        const ratingToGrade = (rating: string) => String.fromCharCode(64 + parseInt(rating));
    
        return {
            projectName: projects.components[0].name,
            branch: 'master', // Você pode adicionar uma chamada específica para obter o branch atual
            reportDate: new Date().toISOString().split('T')[0],
            sizeRating: 'M', // Pode ser calculado com base no ncloc
            linesOfCode: parseInt(getMetricValue(measures, 'ncloc')),
            qualityGate: qualityGates.projectStatus.status,
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
        }
    }
}