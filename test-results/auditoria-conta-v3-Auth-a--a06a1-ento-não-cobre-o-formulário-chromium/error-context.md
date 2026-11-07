# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auditoria/conta-v3.spec.ts >> Auth >> a barra de consentimento não cobre o formulário
- Location: e2e/auditoria/conta-v3.spec.ts:209:7

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic:
    - status
    - alert
  - generic [ref=e3]:
    - banner [ref=e4]:
      - 'link "Baigi: ir para o início" [ref=e5] [cursor=pointer]':
        - /url: /
        - generic [ref=e6]:
          - img "Baigi" [ref=e8]
          - generic [ref=e9]: BAIGI.
    - main [ref=e10]:
      - generic [ref=e12]:
        - heading "Criar sua conta" [level=1] [ref=e13]
        - generic [ref=e14]:
          - button "Continuar com Google" [ref=e15] [cursor=pointer]
          - paragraph [ref=e21]:
            - text: Ao continuar você aceita os
            - link "Termos" [ref=e22] [cursor=pointer]:
              - /url: /termos
            - text: e a
            - link "Privacidade" [ref=e23] [cursor=pointer]:
              - /url: /privacidade
            - text: .
        - generic [ref=e24]: ou
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e30]: Nome
            - textbox "Nome" [ref=e32]
          - generic [ref=e33]:
            - generic [ref=e34]: E-mail
            - textbox "E-mail" [ref=e36]
          - generic [ref=e37]:
            - generic [ref=e38]: Senha
            - generic [ref=e39]:
              - textbox "Senha" [ref=e40]
              - button "Mostrar senha" [ref=e42] [cursor=pointer]
            - paragraph [ref=e46]: Pelo menos 8 caracteres.
          - generic [ref=e48]:
            - checkbox "Li e aceito os Termos de Uso e a Política de Privacidade." [ref=e50] [cursor=pointer]
            - generic [ref=e52] [cursor=pointer]:
              - text: Li e aceito os
              - link "Termos de Uso" [ref=e53]:
                - /url: /termos
              - text: e a
              - link "Política de Privacidade" [ref=e54]:
                - /url: /privacidade
              - text: .
          - button "Criar conta" [ref=e55] [cursor=pointer]
        - paragraph [ref=e56]:
          - text: Já tem conta?
          - link "Entrar" [ref=e57] [cursor=pointer]:
            - /url: /entrar
    - contentinfo [ref=e58]:
      - link "Termos" [ref=e59] [cursor=pointer]:
        - /url: /termos
      - text: ·
      - link "Privacidade" [ref=e60] [cursor=pointer]:
        - /url: /privacidade
    - dialog [ref=e61]:
      - heading "Sua privacidade" [level=2] [ref=e62]
      - paragraph [ref=e63]:
        - text: Usamos cookies essenciais e, com sua permissão, de análise.
        - link "Política de privacidade" [ref=e64] [cursor=pointer]:
          - /url: /privacidade
      - generic [ref=e65]:
        - button "Recusar" [ref=e66] [cursor=pointer]
        - button "Aceitar" [ref=e67] [cursor=pointer]
        - button "Personalizar" [ref=e68] [cursor=pointer]
```