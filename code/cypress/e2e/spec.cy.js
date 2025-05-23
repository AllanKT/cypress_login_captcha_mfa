// describe('template spec', () => {
//   it('passes', () => {
//     cy.visit('https://example.cypress.io')
//   })
// })

describe('Login com CAPTCHA manual', () => {
  it('Preenche login e espera para CAPTCHA', () => {
    cy.visit('https://acesso.stage.aws.cleartech.com.br/auth')

    // Preenche os dados
    cy.get('#username').type('ateotonio@nuageit.com.br')
    cy.get('#loginPassword').type('Aas@102025123456789012')

    // Aguarda manualmente o CAPTCHA ser resolvido
    
    // Ou você pode usar um wait de tempo fixo (não recomendado, mas possível)
    // cy.wait(30000) // espera 30 segundos para resolver o CAPTCHA
    
    // Depois que o CAPTCHA for resolvido manualmente, continua com o login
    cy.contains('button', 'Acessar').click()
    cy.pause()

    // Verifica se foi logado com sucesso
    cy.url({ timeout: 60000 }) // até 1 minutos
      .should('include', '/access_page')

    cy.contains('p', 'Portal AIA').should('exist')
    cy.contains('p', 'Portal AIA').should('be.visible')
  })
})
