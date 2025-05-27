// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add('guiLogin', (
    userEmail = Cypress.env('userEmail'),
    userPassword = Cypress.env('userPassword'),
) => {
    cy.visit('https://acesso.stage.aws.cleartech.com.br/auth')

    // Preenche os dados
    cy.get('#username').type(userEmail)
    cy.get('#loginPassword').type(userPassword)

    // Aguarda manualmente o CAPTCHA ser resolvido
    
    // Ou você pode usar um wait de tempo fixo (não recomendado, mas possível)
    // cy.wait(30000) // espera 30 segundos para resolver o CAPTCHA
    
    // Depois que o CAPTCHA for resolvido manualmente, continua com o login
    cy.contains('button', 'Acessar').click()
    cy.pause()

    // Aguarda a navegação/autenticação finalizar
    cy.url().should('not.include', '/auth'); // ajuste para sua URL pós-login

    // Verifica se o token está salvo no localStorage
    cy.window().then((win) => {
        const token = win.localStorage.getItem('token');
        expect(token).to.exist;
    });
});

Cypress.Commands.add('sessionLogin', (
    userEmail = Cypress.env('userEmail'),
    userPassword = Cypress.env('userPassword'),
) => {
    cy.session(userEmail, () => {
        cy.guiLogin(userEmail, userPassword);
    }, {
        validate() {
          cy.window().then((win) => {
            const token = win.localStorage.getItem('token');
            expect(token).to.exist;
          });
        },
    
        // Isso persiste os dados do localStorage entre sessões
        cacheAcrossSpecs: true,
    });
});

Cypress.Commands.add('getTableData', (tableSelector) => {
    const rowsData = [];
  
    cy.get(`${tableSelector} tbody tr`).each(($row) => {
      const rowObj = {};
  
      cy.wrap($row).find('td').each(($cell, index) => {
        const text = $cell.text().trim();
  
        switch (index) {
          case 2:
            rowObj.de = text;
            break;
          case 3:
            rowObj.titulo = text;
            break;
          case 4:
            rowObj.data = text;
            break;
          case 5:
            rowObj.tipo = text;
            break;
        }
      }).then(() => {
        if (Object.keys(rowObj).length > 0) {
          rowsData.push(rowObj);
        }
      });
    });
  
    // Aguarda o término do `.each` para retornar os dados
    cy.then(() => rowsData);
});
