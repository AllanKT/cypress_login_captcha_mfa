const { chromium } = require('playwright');
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

import { SnykSonarQubeReport } from './dto/sonar.dto';

import { snyk } from './template/snyk';
import { sonar } from './template/sonar';
import { template, header, footer } from './template/base';

import { SnykService } from './services/snyk.service';
import { SonarService } from './services/sonar.service';

async function generateReport(html: string) {
    const title = 'Relatório de Segurança';
    const path = './code/sonarqube-report.pdf';

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

    // Generate HTML template
    await page.setContent(html);

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
        path: path,
        format: 'A4',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        displayHeaderFooter: true,
        headerTemplate: header(title),
        footerTemplate: footer(),
        printBackground: true,
        preferCSSPageSize: true
    };

    // Generate PDF with configured options
    await page.pdf({
        ...pdfOptions,
        scale: 0.8
    });

    await browser.close();
}

export async function generateHtml() {
    const projectKey = 'resolveja-core-api-gateway-spc';
    const snykProjectId = '91c84db4-4c64-4544-95f2-871c85bdd3cc';

    const snykService = new SnykService();
    const sonarService = new SonarService();

    const report = await  sonarService.getSonarReport(projectKey);
    const snykMetrics = await snykService.getSnykMetrics(snykProjectId);
    report.snyk = snykMetrics;

    const reportSnykBody = snyk(report);
    const reportSonarBody = sonar(report);
    const reportTemplate = template(reportSonarBody + reportSnykBody);

    return reportTemplate;
}

async function main() {
    const html = await generateHtml();
    await generateReport(html);
}

main();
