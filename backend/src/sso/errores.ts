/** Fallo del login empresarial atribuible al IdP o al usuario, no a un bug nuestro. */
export class ErrorSso extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorSso'
  }
}
