import * as fs from 'fs';

export function header(title: string) {
    const LOGO_NUAGE_PATH = 'E:\\nuage\\allan\\cypress_login_captcha_mfa\\reports\\code\\assets\\logo-inverse-127x23-nuageit.png';
    const LOGO_NUAGE = `<img src="data:image/png;base64,${fs.readFileSync(LOGO_NUAGE_PATH).toString('base64')}" width="127" height="45" />`;
    
    return `
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
            <h1 style="font-size: 24px; margin: 0;">${title}</h1>
          </div>
          <div style="flex: 1; text-align: right;">
             <p style="margin: 0;">Date: ${new Date()}</p>
          </div>
      </div>
    </body>
    `
}

export function footer() {
    const LOGO_AWS_PATH = 'E:\\nuage\\allan\\cypress_login_captcha_mfa\\reports\\code\\assets\\awsconsultingpartner2-1.png';
    const LOGO_AWS = `<img src="data:image/png;base64,${fs.readFileSync(LOGO_AWS_PATH).toString('base64')}" width="200" height="60" />`;

    return `
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
    `
}

export function template(content: string) {
    return `
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
        ${content}
    </body>
    </html>
  `
}
